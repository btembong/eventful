import type { FastifyInstance } from 'fastify';
import { requireRole } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';

const adminGuard = requireRole('ADMIN');

export default async function adminRoutes(app: FastifyInstance) {

  // ── Users ──────────────────────────────────────────────────────────────────

  // GET /admin/users — list all users
  app.get<{
    Querystring: { page?: number; limit?: number; q?: string; role?: string };
  }>('/users', {
    schema: {
      tags: ['Admin'],
      summary: 'List all users (admin)',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page:  { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20, maximum: 100 },
          q:     { type: 'string', description: 'Search by name or email' },
          role:  { type: 'string', enum: ['EVENTEE', 'CREATOR', 'ADMIN'] },
        },
      },
    },
    preHandler: adminGuard,
  }, async (req) => {
    const { page = 1, limit = 20, q, role } = req.query;

    const where: Record<string, unknown> = { deletedAt: null };
    if (q)    where.OR = [{ fullName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }];
    if (role) where.roles = { has: role };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, fullName: true, roles: true,
          creatorStatus: true, emailVerifiedAt: true, createdAt: true, deletedAt: true,
          mfaEnabled: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  });

  // GET /admin/users/:id — single user detail
  app.get<{ Params: { id: string } }>('/users/:id', {
    schema: {
      tags: ['Admin'],
      summary: 'Get full user profile (admin)',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
    },
    preHandler: adminGuard,
  }, async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, email: true, fullName: true, phone: true, roles: true,
        creatorStatus: true, emailVerifiedAt: true, mfaEnabled: true,
        orgName: true, orgType: true, kycDocType: true,
        payoutType: true, payoutNumber: true, payoutBankName: true,
        creatorAppliedAt: true, creatorReviewedAt: true, creatorRejectedReason: true,
        createdAt: true, deletedAt: true,
        _count: { select: { tickets: true, eventsCreated: true } },
      },
    });
    if (!user) return reply.status(404).send({ error: 'User not found' });
    return user;
  });

  // DELETE /admin/users/:id — soft-ban a user (set deletedAt)
  app.delete<{ Params: { id: string } }>('/users/:id', {
    schema: {
      tags: ['Admin'],
      summary: 'Soft-ban a user (sets deletedAt)',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { message: { type: 'string' } } } },
    },
    preHandler: adminGuard,
  }, async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { roles: true } });
    if (!user) return reply.status(404).send({ error: 'User not found' });
    if (user.roles.includes('ADMIN')) return reply.status(403).send({ error: 'Cannot ban another admin' });

    await prisma.$transaction([
      prisma.user.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } }),
      prisma.auditLog.create({
        data: {
          actorId: req.user!.id, action: 'admin.user.banned',
          entityType: 'User', entityId: req.params.id,
        },
      }),
    ]);
    return reply.send({ message: 'User banned' });
  });

  // ── Events ─────────────────────────────────────────────────────────────────

  // GET /admin/events — list all events with moderation context
  app.get<{
    Querystring: { page?: number; limit?: number; q?: string; isCancelled?: boolean };
  }>('/events', {
    schema: {
      tags: ['Admin'],
      summary: 'List all events for moderation (admin)',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page:        { type: 'integer', default: 1 },
          limit:       { type: 'integer', default: 20, maximum: 100 },
          q:           { type: 'string', description: 'Search by title or venue' },
          isCancelled: { type: 'boolean' },
        },
      },
    },
    preHandler: adminGuard,
  }, async (req) => {
    const { page = 1, limit = 20, q, isCancelled } = req.query;

    const where: Record<string, unknown> = { deletedAt: null };
    if (q)                       where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { venue: { contains: q, mode: 'insensitive' } }];
    if (isCancelled !== undefined) where.isCancelled = isCancelled;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        select: {
          id: true, title: true, category: true, venue: true,
          startsAt: true, capacity: true, price: true, currency: true,
          isCancelled: true, createdAt: true, shareSlug: true,
          creator: { select: { id: true, fullName: true, email: true } },
          _count: { select: { tickets: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    return { events, total, page, limit, pages: Math.ceil(total / limit) };
  });

  // DELETE /admin/events/:id — admin force-cancels an event
  app.delete<{ Params: { id: string }; Body: { reason?: string } }>('/events/:id', {
    schema: {
      tags: ['Admin'],
      summary: 'Force-cancel an event (admin)',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: { reason: { type: 'string' } },
      },
      response: { 200: { type: 'object', properties: { message: { type: 'string' } } } },
    },
    preHandler: adminGuard,
  }, async (req, reply) => {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { isCancelled: true },
    });
    if (!event) return reply.status(404).send({ error: 'Event not found' });
    if (event.isCancelled) return reply.status(409).send({ error: 'Already cancelled' });

    await prisma.$transaction([
      prisma.event.update({ where: { id: req.params.id }, data: { isCancelled: true } }),
      prisma.auditLog.create({
        data: {
          actorId: req.user!.id, action: 'admin.event.cancelled',
          entityType: 'Event', entityId: req.params.id,
          meta: { reason: req.body?.reason ?? 'Admin action' },
        },
      }),
    ]);
    return reply.send({ message: 'Event cancelled' });
  });

  // ── Stats ───────────────────────────────────────────────────────────────────

  // GET /admin/stats — platform-wide KPIs
  app.get('/stats', {
    schema: {
      tags: ['Admin'],
      summary: 'Platform KPIs (admin)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: adminGuard,
  }, async () => {
    const [
      totalUsers, totalCreators, totalEvents, totalTickets,
      totalRevenue, pendingApplications,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, roles: { has: 'CREATOR' } } }),
      prisma.event.count({ where: { deletedAt: null } }),
      prisma.ticket.count({ where: { status: 'PAID' } }),
      prisma.payment.aggregate({ where: { status: 'success' }, _sum: { amount: true } }),
      prisma.user.count({ where: { creatorStatus: 'PENDING' } }),
    ]);

    return {
      totalUsers,
      totalCreators,
      totalEvents,
      totalTicketsSold: totalTickets,
      totalRevenue: parseFloat((totalRevenue._sum.amount ?? 0).toString()),
      pendingCreatorApplications: pendingApplications,
    };
  });
}
