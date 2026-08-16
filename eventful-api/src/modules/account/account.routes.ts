import type { FastifyInstance } from 'fastify';
import { requireAuth } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';

export default async function accountRoutes(app: FastifyInstance) {

  // GET /account/export — GDPR data export (all user data as JSON)
  app.get('/export', {
    schema: {
      tags: ['Account'],
      summary: 'Export all personal data (GDPR right to portability)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    const userId = req.user!.id;

    const [user, tickets, reminders] = await Promise.all([
      prisma.user.findUnique({
        where:  { id: userId },
        select: { id: true, email: true, fullName: true, phone: true, roles: true, createdAt: true, emailVerifiedAt: true },
      }),
      prisma.ticket.findMany({
        where:   { eventeeId: userId },
        include: {
          event:  { select: { title: true, startsAt: true, venue: true } },
          order:  { include: { payment: true } },
        },
      }),
      prisma.reminderPref.findMany({ where: { userId } }),
    ]);

    const filename = `eventful-data-${userId.slice(0, 8)}.json`;
    reply
      .header('Content-Type', 'application/json')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send({ exportedAt: new Date().toISOString(), profile: user, tickets, reminderPreferences: reminders });
  });

  // DELETE /account — GDPR right to erasure (scrubs PII, soft-deletes)
  app.delete('/', {
    schema: {
      tags: ['Account'],
      summary: 'Delete account and scrub all personal data (GDPR right to erasure)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['confirm'],
        properties: { confirm: { type: 'string', description: 'Must be the string "DELETE"' } },
      },
      response: { 200: { type: 'object', properties: { message: { type: 'string' } } } },
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    const { confirm } = req.body as { confirm: string };
    if (confirm !== 'DELETE') {
      return reply.status(400).send({ error: 'Send { "confirm": "DELETE" } to confirm erasure.' });
    }

    const userId = req.user!.id;

    // Scrub PII while retaining ticket/payment rows for accounting obligations
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          email:        `deleted-${userId}@eventful.invalid`,
          fullName:     '[Deleted User]',
          phone:        null,
          passwordHash: '',
          deletedAt:    new Date(),
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId:    userId,
          action:     'user.deleted',
          entityType: 'User',
          entityId:   userId,
        },
      }),
    ]);

    // Revoke all refresh tokens
    const { scanKeys } = await import('@/lib/redis-scan');
    const { redis }    = await import('@/lib/redis');
    const keys         = await scanKeys(`refresh:${userId}:*`);
    if (keys.length > 0) await redis.del(...keys);

    return reply.send({ message: 'Account deleted and personal data scrubbed.' });
  });
}
