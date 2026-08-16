import type { FastifyInstance } from 'fastify';
import { eventsService } from './events.service';
import { requireAuth, requireCreator } from '@/middleware/auth.guard';

// Reusable schema fragments
const eventSummarySchema = {
  type: 'object',
  properties: {
    id:        { type: 'string' },
    title:     { type: 'string' },
    category:  { type: 'string' },
    venue:     { type: 'string' },
    startsAt:  { type: 'string' },
    endsAt:    { type: 'string' },
    price:     { type: 'number' },
    currency:  { type: 'string' },
    shareSlug: { type: 'string' },
    capacity:  { type: 'number' },
    _count:    { type: 'object', properties: { tickets: { type: 'number' } } },
  },
} as const;

const paginationQuery = {
  page:  { type: 'integer', minimum: 1, default: 1 },
  limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
};

export default async function eventsRoutes(app: FastifyInstance) {

  // ── Public ─────────────────────────────────────────────────────────────────

  // GET /events — discovery feed (cached 60s)
  app.get<{
    Querystring: { category?: string; from?: string; to?: string; page?: number; limit?: number };
  }>('/', {
    schema: {
      tags: ['Events'],
      summary: 'Discovery feed — paginated, cached 60 s',
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['CONCERT', 'THEATER', 'SPORTS', 'CULTURAL', 'OTHER'] },
          from: { type: 'string', description: 'ISO date lower bound on startsAt' },
          to:   { type: 'string', description: 'ISO date upper bound on startsAt' },
          ...paginationQuery,
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            events: { type: 'array', items: eventSummarySchema },
            total:  { type: 'integer' },
            page:   { type: 'integer' },
            limit:  { type: 'integer' },
            pages:  { type: 'integer' },
          },
        },
      },
    },
  }, async (req) => {
    return eventsService.getDiscoveryFeed(req.query as any);
  });

  // GET /events/slug/:shareSlug — lookup by shareSlug (used by marketing site OG images)
  app.get<{ Params: { shareSlug: string } }>('/slug/:shareSlug', {
    schema: {
      tags: ['Events'],
      summary: 'Get event by shareSlug',
      params: { type: 'object', properties: { shareSlug: { type: 'string' } }, required: ['shareSlug'] },
    },
  }, async (req) => {
    return eventsService.getEventByShareSlug(req.params.shareSlug);
  });

  // GET /events/:id — single event detail (cached 5 min)
  app.get<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['Events'],
      summary: 'Get event by ID',
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req) => {
    return eventsService.getEventById(req.params.id);
  });

  // GET /events/:id/share — share link metadata
  app.get<{ Params: { id: string } }>('/:id/share', {
    schema: {
      tags: ['Events'],
      summary: 'Get social share links for an event',
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      response: {
        200: {
          type: 'object',
          properties: {
            url:      { type: 'string' },
            whatsapp: { type: 'string' },
            twitter:  { type: 'string' },
            facebook: { type: 'string' },
          },
        },
      },
    },
  }, async (req) => {
    return eventsService.getShareLinks(req.params.id);
  });

  // ── Creator — event management ──────────────────────────────────────────────

  // POST /events — create event
  app.post<{ Body: {
    title: string; description: string; category: string; venue: string;
    startsAt: string; endsAt: string; capacity: number; price: number;
    currency?: string; defaultReminderOffsets?: number[]; metadata?: unknown;
    coverImageUrl?: string;
  } }>('/', {
    schema: {
      tags: ['Events'],
      summary: 'Create a new event (CREATOR only)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['title', 'description', 'category', 'venue', 'startsAt', 'endsAt', 'capacity', 'price'],
        properties: {
          title:       { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', minLength: 1 },
          category:    { type: 'string', enum: ['CONCERT', 'THEATER', 'SPORTS', 'CULTURAL', 'OTHER'] },
          venue:       { type: 'string', minLength: 1 },
          startsAt:    { type: 'string', description: 'ISO 8601 datetime' },
          endsAt:      { type: 'string', description: 'ISO 8601 datetime' },
          capacity:    { type: 'integer', minimum: 1 },
          price:       { type: 'number', minimum: 0 },
          currency:    { type: 'string', default: 'XAF' },
          defaultReminderOffsets: { type: 'array', items: { type: 'integer', minimum: 1 } },
          metadata:    { description: 'Category-specific fields — validated server-side' },
          coverImageUrl: { type: 'string', description: 'Cloudinary URL of the event cover image' },
        },
      },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const event = await eventsService.createEvent(req.user!.id, req.body as any);
    return reply.status(201).send(event);
  });

  // PATCH /events/:id — update event
  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>('/:id', {
    schema: {
      tags: ['Events'],
      summary: 'Update event fields (CREATOR + owner only)',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      body: {
        type: 'object',
        properties: {
          title:       { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string' },
          venue:       { type: 'string' },
          startsAt:    { type: 'string' },
          endsAt:      { type: 'string' },
          capacity:    { type: 'integer', minimum: 1 },
          price:       { type: 'number', minimum: 0 },
          currency:    { type: 'string' },
          defaultReminderOffsets: { type: 'array', items: { type: 'integer', minimum: 1 } },
          metadata:    {},
          coverImageUrl:       { type: 'string', description: 'Cloudinary URL of the event cover image' },
          isPublished:         { type: 'boolean', description: 'Make the event live and purchasable' },
          inDiscovery:         { type: 'boolean', description: 'Show event in the public discovery feed' },
          confirmationMessage: { type: 'string', nullable: true, description: 'Custom message in ticket confirmation emails' },
        },
      },
    },
    preHandler: requireCreator,
  }, async (req) => {
    return eventsService.updateEvent(req.params.id, req.user!.id, req.body as any);
  });

  // DELETE /events/:id — cancel event (soft: sets isCancelled = true)
  app.delete<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['Events'],
      summary: 'Cancel an event (CREATOR + owner only)',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      response: { 204: { type: 'null' } },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    await eventsService.cancelEvent(req.params.id, req.user!.id);
    return reply.status(204).send();
  });

}
