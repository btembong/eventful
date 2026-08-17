import type { FastifyInstance } from 'fastify';
import { requireCreator, requireAuth } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';

export default async function tiersRoutes(app: FastifyInstance) {

  // GET /events/:id/tiers — public, list tiers for an event
  app.get<{ Params: { id: string } }>('/:id/tiers', {
    schema: {
      tags: ['Tiers'],
      summary: 'List ticket tiers for an event',
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
  }, async (req, reply) => {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true },
    });
    if (!event) return reply.status(404).send({ error: 'Event not found' });

    return prisma.ticketTier.findMany({
      where: { eventId: req.params.id },
      orderBy: { sortOrder: 'asc' },
    });
  });

  // POST /events/:id/tiers — creator adds a tier
  app.post<{
    Params: { id: string };
    Body: {
      name: string; description?: string; type?: string;
      price: number; currency?: string; capacity: number;
      orderLimit?: number; isOnSale?: boolean;
      salesStart?: string; salesEnd?: string;
      perks?: string[]; inviteCode?: string; sortOrder?: number;
      // Seating
      hasSeating?: boolean; seatRows?: number; seatCols?: number;
      premiumRows?: string[]; blockedSeats?: string[];
    };
  }>('/:id/tiers', {
    schema: {
      tags: ['Tiers'],
      summary: 'Add a ticket tier to an event (CREATOR)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['name', 'price', 'capacity'],
        properties: {
          name:         { type: 'string', minLength: 1 },
          description:  { type: 'string' },
          type:         { type: 'string', enum: ['FREE', 'PAID', 'INVITE_ONLY'], default: 'PAID' },
          price:        { type: 'number', minimum: 0 },
          currency:     { type: 'string', default: 'XAF' },
          capacity:     { type: 'integer', minimum: 1 },
          orderLimit:   { type: 'integer', minimum: 1, default: 10 },
          isOnSale:     { type: 'boolean', default: true },
          salesStart:   { type: 'string', format: 'date-time' },
          salesEnd:     { type: 'string', format: 'date-time' },
          perks:        { type: 'array', items: { type: 'string' } },
          inviteCode:   { type: 'string' },
          sortOrder:    { type: 'integer', default: 0 },
          hasSeating:   { type: 'boolean', default: false },
          seatRows:     { type: 'integer', minimum: 1, maximum: 26 },
          seatCols:     { type: 'integer', minimum: 1 },
          premiumRows:  { type: 'array', items: { type: 'string' } },
          blockedSeats: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { creatorId: true },
    });
    if (!event) return reply.status(404).send({ error: 'Event not found' });
    if (event.creatorId !== req.user!.id) return reply.status(403).send({ error: 'Forbidden' });

    const b = req.body;

    // For seating tiers: derive capacity from layout if rows/cols provided
    let capacity = b.capacity;
    if (b.hasSeating && b.seatRows && b.seatCols) {
      capacity = b.seatRows * b.seatCols - (b.blockedSeats?.length ?? 0);
    }

    const tier = await prisma.ticketTier.create({
      data: {
        eventId:      req.params.id,
        name:         b.name,
        description:  b.description,
        type:         (b.type as 'FREE' | 'PAID' | 'INVITE_ONLY') ?? 'PAID',
        price:        b.price,
        currency:     b.currency ?? 'XAF',
        capacity,
        orderLimit:   b.orderLimit ?? 10,
        isOnSale:     b.isOnSale ?? true,
        salesStart:   b.salesStart ? new Date(b.salesStart) : null,
        salesEnd:     b.salesEnd   ? new Date(b.salesEnd)   : null,
        perks:        b.perks ?? [],
        inviteCode:   b.inviteCode,
        sortOrder:    b.sortOrder ?? 0,
        hasSeating:   b.hasSeating ?? false,
        seatRows:     b.hasSeating ? (b.seatRows ?? null) : null,
        seatCols:     b.hasSeating ? (b.seatCols ?? null) : null,
        premiumRows:  b.hasSeating ? (b.premiumRows ?? []) : [],
        blockedSeats: b.hasSeating ? (b.blockedSeats ?? []) : [],
      },
    });
    return reply.status(201).send(tier);
  });

  // PUT /events/:id/tiers/:tierId — update tier
  app.put<{
    Params: { id: string; tierId: string };
    Body: {
      name?: string; description?: string; price?: number; capacity?: number;
      orderLimit?: number; isOnSale?: boolean;
      salesStart?: string | null; salesEnd?: string | null;
      perks?: string[]; inviteCode?: string | null; sortOrder?: number;
      // Seating
      premiumRows?: string[]; blockedSeats?: string[];
      seatRows?: number; seatCols?: number;
    };
  }>('/:id/tiers/:tierId', {
    schema: {
      tags: ['Tiers'],
      summary: 'Update a ticket tier (CREATOR)',
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
        properties: {
          name:         { type: 'string', minLength: 1 },
          description:  { type: 'string' },
          price:        { type: 'number', minimum: 0 },
          capacity:     { type: 'integer', minimum: 1 },
          orderLimit:   { type: 'integer', minimum: 1 },
          isOnSale:     { type: 'boolean' },
          salesStart:   { type: 'string', format: 'date-time', nullable: true },
          salesEnd:     { type: 'string', format: 'date-time', nullable: true },
          perks:        { type: 'array', items: { type: 'string' } },
          inviteCode:   { type: 'string', nullable: true },
          sortOrder:    { type: 'integer' },
          premiumRows:  { type: 'array', items: { type: 'string' } },
          blockedSeats: { type: 'array', items: { type: 'string' } },
          seatRows:     { type: 'integer', minimum: 1, maximum: 26 },
          seatCols:     { type: 'integer', minimum: 1 },
        },
      },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { creatorId: true },
    });
    if (!event) return reply.status(404).send({ error: 'Event not found' });
    if (event.creatorId !== req.user!.id) return reply.status(403).send({ error: 'Forbidden' });

    const tier = await prisma.ticketTier.findFirst({
      where: { id: req.params.tierId, eventId: req.params.id },
    });
    if (!tier) return reply.status(404).send({ error: 'Tier not found' });

    const b = req.body;
    const updated = await prisma.ticketTier.update({
      where: { id: req.params.tierId },
      data: {
        ...(b.name         !== undefined && { name: b.name }),
        ...(b.description  !== undefined && { description: b.description }),
        ...(b.price        !== undefined && { price: b.price }),
        ...(b.capacity     !== undefined && { capacity: b.capacity }),
        ...(b.orderLimit   !== undefined && { orderLimit: b.orderLimit }),
        ...(b.isOnSale     !== undefined && { isOnSale: b.isOnSale }),
        ...(b.salesStart   !== undefined && { salesStart: b.salesStart ? new Date(b.salesStart) : null }),
        ...(b.salesEnd     !== undefined && { salesEnd:   b.salesEnd   ? new Date(b.salesEnd)   : null }),
        ...(b.perks        !== undefined && { perks: b.perks }),
        ...(b.inviteCode   !== undefined && { inviteCode: b.inviteCode }),
        ...(b.sortOrder    !== undefined && { sortOrder: b.sortOrder }),
        ...(b.premiumRows  !== undefined && { premiumRows: b.premiumRows }),
        ...(b.blockedSeats !== undefined && { blockedSeats: b.blockedSeats }),
        ...(b.seatRows     !== undefined && { seatRows: b.seatRows }),
        ...(b.seatCols     !== undefined && { seatCols: b.seatCols }),
      },
    });
    return updated;
  });

  // DELETE /events/:id/tiers/:tierId
  app.delete<{ Params: { id: string; tierId: string } }>('/:id/tiers/:tierId', {
    schema: {
      tags: ['Tiers'],
      summary: 'Delete a ticket tier (CREATOR) — only if no tickets sold',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'tierId'],
        properties: {
          id:     { type: 'string', format: 'uuid' },
          tierId: { type: 'string', format: 'uuid' },
        },
      },
      response: { 200: { type: 'object', properties: { message: { type: 'string' } } } },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { creatorId: true },
    });
    if (!event) return reply.status(404).send({ error: 'Event not found' });
    if (event.creatorId !== req.user!.id) return reply.status(403).send({ error: 'Forbidden' });

    const tier = await prisma.ticketTier.findFirst({
      where: { id: req.params.tierId, eventId: req.params.id },
    });
    if (!tier) return reply.status(404).send({ error: 'Tier not found' });
    if (tier.sold > 0) return reply.status(409).send({ error: 'Cannot delete a tier with sold tickets' });

    await prisma.ticketTier.delete({ where: { id: req.params.tierId } });
    return reply.send({ message: 'Tier deleted' });
  });

  // POST /events/:id/waitlist — join the waitlist when sold out
  app.post<{ Params: { id: string }; Body: { tierId?: string } }>('/:id/waitlist', {
    schema: {
      tags: ['Waitlist'],
      summary: 'Join the waitlist for a sold-out event (EVENTEE)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        properties: { tierId: { type: 'string', format: 'uuid', description: 'Specific tier to wait for; omit for any available tier' } },
      },
      response: { 201: { type: 'object', properties: { message: { type: 'string' }, position: { type: 'integer' } } } },
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, deletedAt: null, isCancelled: false },
      select: { id: true },
    });
    if (!event) return reply.status(404).send({ error: 'Event not found or cancelled' });

    // Check user doesn't already have an active ticket
    const existing = await prisma.ticket.findFirst({
      where: { eventId: req.params.id, eventeeId: req.user!.id, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
    });
    if (existing) return reply.status(409).send({ error: 'You already have a ticket for this event' });

    await prisma.waitlistEntry.upsert({
      where: { eventId_userId: { eventId: req.params.id, userId: req.user!.id } },
      update: { tierId: req.body?.tierId ?? null },
      create: { eventId: req.params.id, userId: req.user!.id, tierId: req.body?.tierId ?? null },
    });

    // Position on the waitlist
    const position = await prisma.waitlistEntry.count({
      where: { eventId: req.params.id, notifiedAt: null },
    });

    return reply.status(201).send({ message: 'Added to waitlist', position });
  });

  // DELETE /events/:id/waitlist — leave the waitlist
  app.delete<{ Params: { id: string } }>('/:id/waitlist', {
    schema: {
      tags: ['Waitlist'],
      summary: 'Leave the waitlist for an event (EVENTEE)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      response: { 200: { type: 'object', properties: { message: { type: 'string' } } } },
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    await prisma.waitlistEntry.deleteMany({
      where: { eventId: req.params.id, userId: req.user!.id },
    });
    return reply.send({ message: 'Removed from waitlist' });
  });
}
