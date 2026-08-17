/**
 * Seat map endpoints — assigned seating support.
 *
 * GET  /events/:id/tiers/:tierId/seats          — live seat status map (public)
 * POST /events/:id/tiers/:tierId/seats/reserve  — hold N seats for 10 min (auth or anon)
 * DEL  /events/:id/tiers/:tierId/seats/reserve  — release hold early
 * POST /events/:id/tiers/:tierId/seats/block    — creator: block/unblock a seat
 */

import type { FastifyInstance } from 'fastify';
import { requireCreator } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';

const HOLD_TTL = 600; // 10 minutes in seconds

/** Redis key for a temporary seat hold */
function holdKey(tierId: string, seat: string) {
  return `seat:hold:${tierId}:${seat}`;
}

/**
 * Derive all seat labels for a tier based on its layout config.
 * Returns labels like ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13",...]
 */
function buildSeatLabels(tier: {
  seatRows: number | null;
  seatCols: number | null;
}): string[] {
  const rows = tier.seatRows ?? 8;
  const cols = tier.seatCols ?? 13;
  const labels: string[] = [];
  for (let r = 0; r < rows; r++) {
    const rowLetter = String.fromCharCode(65 + r); // A, B, C, ...
    for (let c = 1; c <= cols; c++) {
      labels.push(`${rowLetter}${c}`);
    }
  }
  return labels;
}

export default async function seatsRoutes(app: FastifyInstance) {

  // ── GET /events/:id/tiers/:tierId/seats ─────────────────────────────────────
  // Returns: { layout, seats: { [label]: 'available'|'held'|'taken'|'blocked' } }
  // Public — no auth required.
  app.get<{ Params: { id: string; tierId: string } }>(
    '/:id/tiers/:tierId/seats',
    {
      schema: {
        tags: ['Seats'],
        summary: 'Get live seat status map for a seating tier',
        params: {
          type: 'object',
          required: ['id', 'tierId'],
          properties: {
            id:     { type: 'string', format: 'uuid' },
            tierId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (req, reply) => {
      const tier = await prisma.ticketTier.findFirst({
        where: { id: req.params.tierId, eventId: req.params.id },
        select: {
          id: true, hasSeating: true,
          seatRows: true, seatCols: true,
          seatSections: true, premiumRows: true, blockedSeats: true,
        },
      });
      if (!tier)           return reply.status(404).send({ error: 'Tier not found' });
      if (!tier.hasSeating) return reply.status(400).send({ error: 'This tier does not use assigned seating' });

      const allLabels = buildSeatLabels(tier);

      // Seats that have paid/pending-payment tickets
      const soldTickets = await prisma.ticket.findMany({
        where: { tierId: tier.id, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        select: { seatLabel: true, status: true },
      });
      const takenSet = new Set(
        soldTickets.filter(t => t.seatLabel && t.status !== 'PENDING_PAYMENT').map(t => t.seatLabel as string),
      );
      const pendingSet = new Set(
        soldTickets.filter(t => t.seatLabel && t.status === 'PENDING_PAYMENT').map(t => t.seatLabel as string),
      );
      const blockedSet = new Set(tier.blockedSeats ?? []);

      // Check Redis for temporary holds (not yet turned into tickets)
      const pipeline = redis.pipeline();
      allLabels.forEach(l => pipeline.exists(holdKey(tier.id, l)));
      const holdResults = await pipeline.exec();
      const heldSet = new Set<string>();
      allLabels.forEach((l, i) => {
        if ((holdResults?.[i]?.[1] as number) === 1) heldSet.add(l);
      });

      // Build status map
      const seats: Record<string, string> = {};
      for (const label of allLabels) {
        if (blockedSet.has(label))  seats[label] = 'blocked';
        else if (takenSet.has(label))   seats[label] = 'taken';
        else if (pendingSet.has(label)) seats[label] = 'pending'; // paid order in progress
        else if (heldSet.has(label))    seats[label] = 'held';
        else                            seats[label] = 'available';
      }

      return reply.send({
        layout: {
          rows:         tier.seatRows ?? 8,
          cols:         tier.seatCols ?? 13,
          sections:     tier.seatSections,
          premiumRows:  tier.premiumRows,
          blockedSeats: tier.blockedSeats,
        },
        seats,
      });
    },
  );

  // ── POST /events/:id/tiers/:tierId/seats/reserve ─────────────────────────────
  // Body: { seats: string[], sessionId: string }
  // Holds the requested seats in Redis for 10 min.
  // Returns: { held: string[], ttlSeconds: 600 } or 409 if any seat is unavailable.
  app.post<{
    Params: { id: string; tierId: string };
    Body: { seats: string[]; sessionId: string };
  }>(
    '/:id/tiers/:tierId/seats/reserve',
    {
      schema: {
        tags: ['Seats'],
        summary: 'Temporarily hold seats (10-min reservation)',
        params: {
          type: 'object',
          required: ['id', 'tierId'],
          properties: {
            id:     { type: 'string', format: 'uuid' },
            tierId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['seats', 'sessionId'],
          properties: {
            seats:     { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 20 },
            sessionId: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (req, reply) => {
      const { seats, sessionId } = req.body;

      const tier = await prisma.ticketTier.findFirst({
        where: { id: req.params.tierId, eventId: req.params.id },
        select: {
          id: true, hasSeating: true, orderLimit: true,
          seatRows: true, seatCols: true,
          blockedSeats: true,
        },
      });
      if (!tier)           return reply.status(404).send({ error: 'Tier not found' });
      if (!tier.hasSeating) return reply.status(400).send({ error: 'This tier does not use assigned seating' });
      if (seats.length > (tier.orderLimit ?? 10)) {
        return reply.status(422).send({ error: `Maximum ${tier.orderLimit} seats per order` });
      }

      // Validate seat labels are within layout
      const allLabels = new Set(buildSeatLabels(tier));
      const blocked   = new Set(tier.blockedSeats ?? []);
      for (const seat of seats) {
        if (!allLabels.has(seat)) return reply.status(422).send({ error: `Seat ${seat} does not exist` });
        if (blocked.has(seat))    return reply.status(409).send({ error: `Seat ${seat} is blocked` });
      }

      // Check each seat is truly available (not taken by a ticket or held by someone else)
      const soldTickets = await prisma.ticket.findMany({
        where: { tierId: tier.id, seatLabel: { in: seats }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        select: { seatLabel: true },
      });
      if (soldTickets.length > 0) {
        const taken = soldTickets.map(t => t.seatLabel).join(', ');
        return reply.status(409).send({ error: `Seat(s) ${taken} already taken` });
      }

      // Try to claim each seat in Redis using SET NX (only if key doesn't exist)
      const pipeline = redis.pipeline();
      seats.forEach(s => pipeline.set(holdKey(tier.id, s), sessionId, 'EX', HOLD_TTL, 'NX'));
      const results = await pipeline.exec();

      // Check if any seat was already held by someone else (NX returns null if key existed)
      const failed: string[] = [];
      seats.forEach((s, i) => {
        if ((results?.[i]?.[1] as string | null) === null) failed.push(s);
      });

      if (failed.length > 0) {
        // Release any seats we did manage to claim
        const releaseP = redis.pipeline();
        seats.forEach((s, i) => {
          if ((results?.[i]?.[1] as string | null) === 'OK') releaseP.del(holdKey(tier.id, s));
        });
        await releaseP.exec();
        return reply.status(409).send({ error: `Seat(s) ${failed.join(', ')} are no longer available` });
      }

      return reply.status(201).send({ held: seats, ttlSeconds: HOLD_TTL });
    },
  );

  // ── DELETE /events/:id/tiers/:tierId/seats/reserve ───────────────────────────
  // Body: { seats: string[], sessionId: string }
  // Releases Redis holds matching sessionId (buyer navigated back / changed selection).
  app.delete<{
    Params: { id: string; tierId: string };
    Body: { seats: string[]; sessionId: string };
  }>(
    '/:id/tiers/:tierId/seats/reserve',
    {
      schema: {
        tags: ['Seats'],
        summary: 'Release a temporary seat hold early',
        params: {
          type: 'object',
          required: ['id', 'tierId'],
          properties: {
            id:     { type: 'string', format: 'uuid' },
            tierId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['seats', 'sessionId'],
          properties: {
            seats:     { type: 'array', items: { type: 'string' }, minItems: 1 },
            sessionId: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const { seats, sessionId } = req.body;
      const tierId = req.params.tierId;

      // Only release if the hold belongs to this session
      const pipeline = redis.pipeline();
      seats.forEach(s => pipeline.get(holdKey(tierId, s)));
      const gets = await pipeline.exec();

      const toRelease: string[] = [];
      seats.forEach((s, i) => {
        if ((gets?.[i]?.[1] as string | null) === sessionId) toRelease.push(s);
      });

      if (toRelease.length > 0) {
        const del = redis.pipeline();
        toRelease.forEach(s => del.del(holdKey(tierId, s)));
        await del.exec();
      }

      return reply.send({ released: toRelease });
    },
  );

  // ── POST /events/:id/tiers/:tierId/seats/block ───────────────────────────────
  // Creator: toggle a seat between blocked / available.
  // Body: { seat: string, blocked: boolean }
  app.post<{
    Params: { id: string; tierId: string };
    Body: { seat: string; blocked: boolean };
  }>(
    '/:id/tiers/:tierId/seats/block',
    {
      schema: {
        tags: ['Seats'],
        summary: 'Block or unblock a seat (CREATOR)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id', 'tierId'],
          properties: {
            id:     { type: 'string', format: 'uuid' },
            tierId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['seat', 'blocked'],
          properties: {
            seat:    { type: 'string' },
            blocked: { type: 'boolean' },
          },
        },
      },
      preHandler: requireCreator,
    },
    async (req, reply) => {
      const event = await prisma.event.findFirst({
        where: { id: req.params.id, deletedAt: null },
        select: { creatorId: true },
      });
      if (!event) return reply.status(404).send({ error: 'Event not found' });
      if (event.creatorId !== req.user!.id) return reply.status(403).send({ error: 'Forbidden' });

      const tier = await prisma.ticketTier.findFirst({
        where: { id: req.params.tierId, eventId: req.params.id },
        select: { id: true, hasSeating: true, blockedSeats: true },
      });
      if (!tier)            return reply.status(404).send({ error: 'Tier not found' });
      if (!tier.hasSeating) return reply.status(400).send({ error: 'This tier does not use assigned seating' });

      const seat    = req.body.seat.toUpperCase();
      const current = new Set(tier.blockedSeats ?? []);

      if (req.body.blocked) {
        current.add(seat);
      } else {
        current.delete(seat);
      }

      const updated = await prisma.ticketTier.update({
        where: { id: tier.id },
        data:  { blockedSeats: [...current] },
        select: { id: true, blockedSeats: true },
      });

      return reply.send(updated);
    },
  );
}
