import type { FastifyInstance } from 'fastify';
import { requireAuth, requireCreator, requireRole } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';

const paginationQuery = {
  page:  { type: 'integer', minimum: 1, default: 1 },
  limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
};

export default async function auditRoutes(app: FastifyInstance) {
  // ── Creator: logs for their own events ──────────────────────────────────────

  app.get<{ Querystring: { page?: number; limit?: number } }>(
    '/creators/me/audit-log',
    {
      onRequest: [requireCreator],
      schema: {
        tags: ['Audit'],
        summary: 'Audit log entries for events owned by the authenticated creator',
        security: [{ bearerAuth: [] }],
        querystring: { type: 'object', properties: paginationQuery },
      },
    },
    async (req) => {
      const { page = 1, limit = 20 } = req.query;
      const creatorId = req.user!.id;

      // Pull audit logs for entities owned by this creator (events + their payments/tickets)
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: {
            OR: [
              { actorId: creatorId },
              {
                entityType: 'Event',
                entityId: {
                  in: await prisma.event
                    .findMany({ where: { creatorId, deletedAt: null }, select: { id: true } })
                    .then((evs) => evs.map((e) => e.id)),
                },
              },
            ],
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.auditLog.count({
          where: { actorId: creatorId },
        }),
      ]);

      return { logs, total, page, limit, pages: Math.ceil(total / limit) };
    },
  );

  // ── Admin: full platform audit log ──────────────────────────────────────────

  app.get<{ Querystring: { page?: number; limit?: number; action?: string } }>(
    '/admin/audit-log',
    {
      onRequest: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Audit'],
        summary: 'Full platform audit log (admin only)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            ...paginationQuery,
            action: { type: 'string', description: 'Filter by action, e.g. payment.verified' },
          },
        },
      },
    },
    async (req) => {
      const { page = 1, limit = 20, action } = req.query;

      const where = action ? { action } : {};
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: { actor: { select: { id: true, email: true, fullName: true } } },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return { logs, total, page, limit, pages: Math.ceil(total / limit) };
    },
  );
}
