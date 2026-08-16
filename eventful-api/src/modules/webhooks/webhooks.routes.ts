import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireCreator } from '@/middleware/auth.guard';
import { webhooksService } from './webhooks.service';

const ALLOWED_EVENTS = [
  'ticket.paid',
  'ticket.checked_in',
  'ticket.cancelled',
  'event.cancelled',
] as const;

const createSchema = z.object({
  url:    z.string().url(),
  events: z.array(z.enum(ALLOWED_EVENTS)).min(1),
});

const updateSchema = z.object({
  url:      z.string().url().optional(),
  events:   z.array(z.enum(ALLOWED_EVENTS)).min(1).optional(),
  isActive: z.boolean().optional(),
});

export default async function webhooksRoutes(app: FastifyInstance) {
  // ── List endpoints ──────────────────────────────────────────────────────────

  // Reusable schema fragments
  const idParam = {
    type: 'object' as const,
    required: ['id'] as const,
    properties: { id: { type: 'string', format: 'uuid' } },
  };
  const eventItems = { type: 'string', enum: [...ALLOWED_EVENTS] };
  const pagination = {
    page:  { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  };

  app.get(
    '/creators/me/webhooks',
    {
      preHandler: [requireAuth, requireCreator],
      schema: {
        tags: ['Webhooks'],
        summary: 'List registered webhook endpoints for the authenticated creator',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      return webhooksService.list(req.user!.id);
    },
  );

  // ── Register endpoint ───────────────────────────────────────────────────────

  app.post(
    '/creators/me/webhooks',
    {
      preHandler: [requireAuth, requireCreator],
      schema: {
        tags: ['Webhooks'],
        summary: 'Register a new webhook endpoint to receive event notifications',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['url', 'events'],
          properties: {
            url:    { type: 'string', format: 'uri', description: 'HTTPS URL Eventful will POST to' },
            events: {
              type: 'array',
              items: eventItems,
              minItems: 1,
              description: `Event types to subscribe to: ${ALLOWED_EVENTS.join(', ')}`,
            },
          },
        },
        response: { 201: { type: 'object', additionalProperties: true } },
      },
    },
    async (req, reply) => {
      const body = createSchema.parse(req.body); // Zod still validates
      const endpoint = await webhooksService.create(req.user!.id, body);
      return reply.status(201).send(endpoint);
    },
  );

  // ── Update endpoint ─────────────────────────────────────────────────────────

  app.patch(
    '/creators/me/webhooks/:id',
    {
      preHandler: [requireAuth, requireCreator],
      schema: {
        tags: ['Webhooks'],
        summary: 'Update a webhook endpoint — change URL, subscribed events, or active status',
        security: [{ bearerAuth: [] }],
        params: idParam,
        body: {
          type: 'object',
          properties: {
            url:      { type: 'string', format: 'uri' },
            events:   { type: 'array', items: eventItems, minItems: 1 },
            isActive: { type: 'boolean', description: 'Set false to pause without deleting' },
          },
        },
        response: { 200: { type: 'object', additionalProperties: true } },
      },
    },
    async (req) => {
      const { id } = req.params as { id: string };
      const body = updateSchema.parse(req.body); // Zod still validates
      return webhooksService.update(id, req.user!.id, body);
    },
  );

  // ── Delete endpoint ─────────────────────────────────────────────────────────

  app.delete(
    '/creators/me/webhooks/:id',
    {
      preHandler: [requireAuth, requireCreator],
      schema: {
        tags: ['Webhooks'],
        summary: 'Permanently delete a webhook endpoint',
        security: [{ bearerAuth: [] }],
        params: idParam,
        response: { 204: { type: 'null', description: 'Deleted — no content' } },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      await webhooksService.delete(id, req.user!.id);
      return reply.status(204).send();
    },
  );

  // ── Delivery history ────────────────────────────────────────────────────────

  app.get(
    '/creators/me/webhooks/:id/deliveries',
    {
      preHandler: [requireAuth, requireCreator],
      schema: {
        tags: ['Webhooks'],
        summary: 'Delivery history for a webhook endpoint — status codes, response bodies, retry count',
        security: [{ bearerAuth: [] }],
        params: idParam,
        querystring: {
          type: 'object',
          properties: pagination,
        },
      },
    },
    async (req) => {
      const { id } = req.params as { id: string };
      const { page, limit } = req.query as { page?: string; limit?: string };
      return webhooksService.deliveries(
        id,
        req.user!.id,
        page  ? parseInt(page,  10) : 1,
        limit ? parseInt(limit, 10) : 20,
      );
    },
  );
}
