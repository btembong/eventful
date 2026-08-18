import type { FastifyInstance } from 'fastify';
import { paymentsService } from './payments.service';
import { requireCreator } from '@/middleware/auth.guard';
import type { WebhookPayload } from '@/lib/tranzak';

const paginationQuery = {
  page:  { type: 'integer', minimum: 1, default: 1 },
  limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
};

export default async function paymentsRoutes(app: FastifyInstance) {

  // ── Webhook ─────────────────────────────────────────────────────────────────

  // POST /webhooks/tranzak — Tranzak calls this after a payment is completed.
  // No auth — verified via authKey field in the payload + appId match.
  // Always returns 200 quickly; processing is synchronous but lightweight.
  app.post<{ Body: WebhookPayload }>('/webhooks/tranzak', {
    schema: {
      tags: ['Payments'],
      summary: 'Tranzak payment webhook — internal, not for client use',
      body: {
        type: 'object',
        required: ['eventType', 'appId', 'resourceId', 'webhookId', 'authKey'],
        properties: {
          name:             { type: 'string' },
          version:          { type: 'string' },
          eventType:        { type: 'string' },
          appId:            { type: 'string' },
          resourceId:       { type: 'string' },
          resource:         { type: 'object' },
          webhookId:        { type: 'string' },
          creationDateTime: { type: 'string' },
          authKey:          { type: 'string' },
        },
      },
      response: {
        200: { type: 'object', properties: { received: { type: 'boolean' } } },
      },
    },
  }, async (req, reply) => {
    req.log.info({ body: req.body }, '[webhook] Tranzak payload received');
    try {
      await paymentsService.handleWebhook(req.body);
      req.log.info('[webhook] Tranzak payload processed OK');
    } catch (err) {
      req.log.error({ err, body: req.body }, '[webhook] Tranzak processing error');
    }
    return reply.send({ received: true });
  });

  // ── Creator payment views ───────────────────────────────────────────────────

  // GET /creators/me/payments — all payments across all creator events
  app.get<{ Querystring: { page?: number; limit?: number } }>('/creators/me/payments', {
    schema: {
      tags: ['Creators'],
      summary: "All payments across the creator's events",
      security: [{ bearerAuth: [] }],
      querystring: { type: 'object', properties: paginationQuery },
    },
    preHandler: requireCreator,
  }, async (req) => {
    const { page, limit } = req.query;
    return paymentsService.getCreatorPayments(req.user!.id, page, limit);
  });

  // GET /creators/me/events/:id/payments — payments for one specific event
  app.get<{ Params: { id: string }; Querystring: { page?: number; limit?: number } }>(
    '/creators/me/events/:id/payments',
    {
      schema: {
        tags: ['Creators'],
        summary: 'Payments for a specific event owned by the authenticated creator',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
        querystring: { type: 'object', properties: paginationQuery },
      },
      preHandler: requireCreator,
    },
    async (req) => {
      const { page, limit } = req.query;
      return paymentsService.getEventPayments(req.params.id, req.user!.id, page, limit);
    },
  );
}
