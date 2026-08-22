import Fastify from 'fastify';
import { randomUUID } from 'crypto';
import env from '@/config/env';
import { initSentry } from '@/lib/sentry';
import { errorHandler } from '@/middleware/error.handler';

// Initialise Sentry before the server starts so all errors are captured
initSentry();

async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    // UUID correlation ID — use client-supplied x-request-id or generate one
    genReqId: (_req) => randomUUID(),
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'correlationId',
  });

  // ── Plugins ────────────────────────────────────────────────────────────────

  await app.register(import('@fastify/cors'), {
    origin: true,
    credentials: true,
  });

  await app.register(import('@fastify/swagger'), {
    openapi: {
      info: { title: 'Eventful API', description: 'Event ticketing & discovery platform', version: '1.0.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  });

  await app.register(import('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list' },
  });

  await app.register(import('@fastify/rate-limit'), {
    global: true,
    max: 100,
    timeWindow: '1 minute',
  });

  // ── Correlation ID — echo req.id back so clients can trace responses ───────

  app.addHook('onSend', (_req, reply, _payload, done) => {
    reply.header('x-request-id', _req.id);
    done();
  });

  // ── Error handler ──────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.setErrorHandler(errorHandler as any);

  // ── Routes ─────────────────────────────────────────────────────────────────

  // Health check lives outside versioning so load balancers/k8s can always reach it
  app.get('/health', { schema: { tags: ['System'] } }, async (_req, reply) => {
    const [dbOk, redisOk] = await Promise.all([
      import('@/lib/prisma').then(({ default: p }) => p.$queryRaw`SELECT 1`).then(() => true).catch(() => false),
      import('@/lib/redis').then(({ redis: r }) => r.ping()).then((p) => p === 'PONG').catch(() => false),
    ]);
    const status = dbOk && redisOk ? 'ok' : 'degraded';
    return reply.status(dbOk && redisOk ? 200 : 503).send({
      status,
      timestamp: new Date().toISOString(),
      checks: { database: dbOk ? 'ok' : 'error', redis: redisOk ? 'ok' : 'error' },
    });
  });

  // All business routes are versioned under /v1
  await app.register(async (v1) => {
    await v1.register(import('@/modules/auth/auth.routes'), { prefix: '/auth' });
    await v1.register(import('@/modules/auth/mfa.routes'), { prefix: '/auth' });
    await v1.register(import('@/modules/events/events.routes'), { prefix: '/events' });
    await v1.register(import('@/modules/events/tiers.routes'), { prefix: '/events' });
    await v1.register(import('@/modules/events/seats.routes'), { prefix: '/events' });
    await v1.register(import('@/modules/events/event-members.routes'), { prefix: '/events' });
    await v1.register(import('@/modules/events/discount-validate.routes'), { prefix: '/events' });
    await v1.register(import('@/modules/creators/creators.routes'), { prefix: '/creators' });
    await v1.register(import('@/modules/creators/creator-application.routes'), { prefix: '/creators' });
    await v1.register(import('@/modules/creators/export.routes'), { prefix: '/creators' });
    await v1.register(import('@/modules/creators/payouts.routes'), { prefix: '/creators' });
    await v1.register(import('@/modules/creators/broadcast.routes'), { prefix: '/creators' });
    await v1.register(import('@/modules/creators/live.routes'), { prefix: '/creators' });
    await v1.register(import('@/modules/creators/discounts.routes'), { prefix: '/creators' });
    await v1.register(import('@/modules/creators/announcements.routes'), { prefix: '/creators' });
    await v1.register(import('@/modules/creators/scanner-tokens.routes'), { prefix: '/creators' });
    await v1.register(import('@/modules/creators/support.routes'), { prefix: '/creators' });
    await v1.register(import('@/modules/creators/kyc.routes'), { prefix: '/creators' });
    await v1.register(import('@/modules/support/support.routes'));
    await v1.register(import('@/modules/account/account.routes'), { prefix: '/account' });
    await v1.register(import('@/modules/organizations/organizations.routes'), { prefix: '/organizations' });
    await v1.register(import('@/modules/admin/admin.routes'), { prefix: '/admin' });
    await v1.register(import('@/modules/api-keys/api-keys.routes'), { prefix: '/api-keys' });
    await v1.register(import('@/modules/orders/orders.routes'));
    await v1.register(import('@/modules/tickets/tickets.routes'));
    await v1.register(import('@/modules/payments/payments.routes'));
    await v1.register(import('@/modules/analytics/analytics.routes'));
    await v1.register(import('@/modules/audit/audit.routes'));
    await v1.register(import('@/modules/webhooks/webhooks.routes'));

    // ── Sandbox (dev/staging only) ──────────────────────────────────────────
    if (env.NODE_ENV !== 'production') {
      await v1.register(import('@/modules/sandbox/sandbox.routes'), { prefix: '/sandbox' });
      app.log.info('[api] Sandbox routes registered at /v1/sandbox');
    }
  }, { prefix: '/v1' });

  await app.ready();
  return app;
}

async function startWorkers(log: { info: (msg: string) => void }) {
  // Workers run inline in the API process when no separate worker service is available.
  // Dynamic imports keep startup non-blocking and prevent test environments from
  // loading worker modules (which use the real redis/bullmq).
  try {
    await Promise.all([
      import('@/workers/reminder.worker'),
      import('@/workers/receipt.worker'),
      import('@/workers/webhook-delivery.worker'),
      import('@/workers/broadcast.worker'),
    ]);
    log.info('[api] BullMQ workers started inline');
  } catch (err) {
    log.info(`[api] Failed to start inline workers: ${(err as Error).message}`);
  }
}

async function start() {
  const app = await buildApp();
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`Docs at http://localhost:${env.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Start BullMQ workers in-process (no separate worker dyno on free plan)
  await startWorkers(app.log);

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    app.log.info(`[api] ${signal} received — shutting down gracefully`);
    try {
      // Stop accepting new connections; wait up to 10 s for in-flight requests
      await app.close();
      const { default: prisma } = await import('@/lib/prisma');
      const { redis }           = await import('@/lib/redis');
      await prisma.$disconnect();
      await redis.quit();
      app.log.info('[api] Clean shutdown complete');
      process.exit(0);
    } catch (err) {
      app.log.error(err, '[api] Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

// Only start the HTTP server when this file is the entry point.
// When imported in tests, buildApp() is used directly via inject().
if (require.main === module) {
  start();
}

export { buildApp };
