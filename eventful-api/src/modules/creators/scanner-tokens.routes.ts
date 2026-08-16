import type { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { requireCreator } from '@/middleware/auth.guard';
import { jwtLib, parseTtlToSeconds } from '@/lib/jwt';
import { redis } from '@/lib/redis';
import prisma from '@/lib/prisma';

const REDIS_PREFIX = 'scanner_token';
const EVENT_SET_PREFIX = 'scanner_event';

const EXPIRY_OPTIONS = ['1d', '3d', '7d', '30d'] as const;
type ExpiryOption = typeof EXPIRY_OPTIONS[number];

export default async function scannerTokensRoutes(app: FastifyInstance) {

  // POST /creators/me/events/:id/scanner-tokens — generate a staff scanner link
  app.post<{
    Params: { id: string };
    Body: { label?: string; expiresIn?: ExpiryOption };
  }>('/me/events/:id/scanner-tokens', {
    schema: {
      tags: ['Creators'],
      summary: 'Generate a scanner token for staff check-in access',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object', required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        properties: {
          label:     { type: 'string', maxLength: 60 },
          expiresIn: { type: 'string', enum: EXPIRY_OPTIONS as unknown as string[] },
        },
      },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const eventId = req.params.id;
    const { label = 'Staff scanner', expiresIn = '1d' } = req.body ?? {};

    // Verify creator owns the event
    const event = await prisma.event.findFirst({
      where: { id: eventId, creatorId: req.user!.id, deletedAt: null },
      select: { id: true, title: true },
    });
    if (!event) return reply.status(404).send({ message: 'Event not found' });

    const jti      = crypto.randomUUID();
    const ttlSecs  = parseTtlToSeconds(expiresIn);
    const expiresAt = new Date(Date.now() + ttlSecs * 1000).toISOString();
    const token    = jwtLib.signScanner(eventId, req.user!.id, jti, expiresIn, label);

    const meta = JSON.stringify({ eventId, creatorId: req.user!.id, label, expiresAt, jti });

    // Store in Redis with TTL so it auto-expires
    await redis.setex(`${REDIS_PREFIX}:${jti}`, ttlSecs, meta);
    // Add jti to the per-event set (no TTL on the set itself — we filter by key existence)
    await redis.sadd(`${EVENT_SET_PREFIX}:${eventId}`, jti);

    return reply.status(201).send({ jti, token, label, expiresAt, expiresIn, eventTitle: event.title });
  });

  // GET /creators/me/events/:id/scanner-tokens — list active tokens for an event
  app.get<{ Params: { id: string } }>('/me/events/:id/scanner-tokens', {
    schema: {
      tags: ['Creators'],
      summary: 'List active scanner tokens for an event',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object', required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const eventId = req.params.id;

    // Verify ownership
    const event = await prisma.event.findFirst({
      where: { id: eventId, creatorId: req.user!.id, deletedAt: null },
      select: { id: true },
    });
    if (!event) return reply.status(404).send({ message: 'Event not found' });

    const jtis = await redis.smembers(`${EVENT_SET_PREFIX}:${eventId}`);
    if (jtis.length === 0) return reply.send([]);

    const tokens = (
      await Promise.all(
        jtis.map(async (jti) => {
          const raw = await redis.get(`${REDIS_PREFIX}:${jti}`);
          if (!raw) {
            // Expired — clean up from the set
            await redis.srem(`${EVENT_SET_PREFIX}:${eventId}`, jti);
            return null;
          }
          return JSON.parse(raw) as { jti: string; label: string; expiresAt: string };
        }),
      )
    ).filter(Boolean);

    return reply.send(tokens);
  });

  // DELETE /creators/me/events/:id/scanner-tokens/:jti — revoke a token
  app.delete<{ Params: { id: string; jti: string } }>('/me/events/:id/scanner-tokens/:jti', {
    schema: {
      tags: ['Creators'],
      summary: 'Revoke a scanner token',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object', required: ['id', 'jti'],
        properties: {
          id:  { type: 'string', format: 'uuid' },
          jti: { type: 'string' },
        },
      },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const { id: eventId, jti } = req.params;

    // Verify ownership via the stored meta
    const raw = await redis.get(`${REDIS_PREFIX}:${jti}`);
    if (!raw) return reply.status(404).send({ message: 'Token not found or already expired' });
    const meta = JSON.parse(raw) as { creatorId: string };
    if (meta.creatorId !== req.user!.id) return reply.status(403).send({ message: 'Forbidden' });

    await redis.del(`${REDIS_PREFIX}:${jti}`);
    await redis.srem(`${EVENT_SET_PREFIX}:${eventId}`, jti);

    return reply.status(204).send();
  });

  // GET /scan/verify — validate a scanner token and return event info (public)
  app.get<{ Querystring: { token: string } }>('/scan/verify', {
    schema: {
      tags: ['Creators'],
      summary: 'Validate a scanner token and return the event it is scoped to',
      querystring: {
        type: 'object', required: ['token'],
        properties: { token: { type: 'string' } },
      },
    },
  }, async (req, reply) => {
    try {
      const payload = jwtLib.verifyScanner(req.query.token);
      const stored  = await redis.get(`${REDIS_PREFIX}:${payload.sub}`);
      if (!stored) return reply.status(401).send({ message: 'Token revoked or expired' });

      const event = await prisma.event.findFirst({
        where: { id: payload.eventId, deletedAt: null },
        select: { id: true, title: true, venue: true, startsAt: true, capacity: true },
      });
      if (!event) return reply.status(404).send({ message: 'Event not found' });

      const meta = JSON.parse(stored) as { label: string; expiresAt: string };
      return reply.send({ valid: true, label: meta.label, expiresAt: meta.expiresAt, event });
    } catch {
      return reply.status(401).send({ valid: false, message: 'Invalid or expired scanner token' });
    }
  });
}
