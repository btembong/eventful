/**
 * Server-Sent Events (SSE) endpoint for real-time event dashboards.
 *
 * Pattern:
 *  - The check-in endpoint publishes to Redis channel `live:event:{eventId}` after each scan.
 *  - This SSE endpoint subscribes to that channel and streams each message to the browser.
 *  - One Redis subscriber connection is created per HTTP connection and cleaned up on close.
 */

import type { FastifyInstance } from 'fastify';
import { requireCreator } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';
import IORedis from 'ioredis';
import env from '@/config/env';

export default async function liveRoutes(app: FastifyInstance) {

  // GET /creators/me/events/:id/live — SSE stream of real-time check-ins
  app.get<{ Params: { id: string } }>('/me/events/:id/live', {
    schema: {
      tags: ['Creators'],
      summary: 'Real-time SSE stream of check-in events for a creator\'s event',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { creatorId: true, title: true },
    });
    if (!event) return reply.status(404).send({ error: 'Event not found' });
    if (event.creatorId !== req.user!.id) return reply.status(403).send({ error: 'Forbidden' });

    const channel = `live:event:${req.params.id}`;

    // Each SSE connection gets its own subscriber (can't share one across concurrent requests)
    const subscriber = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

    // Set SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
    reply.raw.flushHeaders();

    // Send initial connection acknowledgement
    reply.raw.write(`event: connected\ndata: ${JSON.stringify({ eventId: req.params.id, title: event.title })}\n\n`);

    // Forward Redis pub/sub messages to the client
    await subscriber.subscribe(channel);
    subscriber.on('message', (_chan, message) => {
      reply.raw.write(`event: checkin\ndata: ${message}\n\n`);
    });

    // Heartbeat every 30s to keep the connection alive through proxies
    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n');
    }, 30_000);

    // Cleanup when client disconnects
    req.raw.on('close', async () => {
      clearInterval(heartbeat);
      await subscriber.unsubscribe(channel);
      subscriber.disconnect();
    });

    // Keep the handler alive — SSE connections are long-lived
    await new Promise<void>((resolve) => {
      req.raw.on('close', resolve);
    });
  });
}
