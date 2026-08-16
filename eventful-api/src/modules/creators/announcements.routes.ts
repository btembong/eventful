import type { FastifyInstance } from 'fastify';
import { requireCreator } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';
import { broadcastQueue } from '@/modules/notifications/notifications.service';

export default async function announcementsRoutes(app: FastifyInstance) {

  // GET /creators/me/announcements — list all announcements sent by this creator
  app.get<{ Querystring: { page?: number; limit?: number } }>('/me/announcements', {
    schema: {
      tags: ['Creators'],
      summary: 'List announcements sent by the creator',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page:  { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
    preHandler: requireCreator,
  }, async (req) => {
    const page  = req.query.page  ?? 1;
    const limit = req.query.limit ?? 20;

    const [items, total] = await Promise.all([
      prisma.announcement.findMany({
        where:   { creatorId: req.user!.id },
        include: { event: { select: { title: true } } },
        orderBy: { sentAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      prisma.announcement.count({ where: { creatorId: req.user!.id } }),
    ]);

    return { items, total, page, limit };
  });

  // POST /creators/me/announcements — send an email blast to attendees of an event
  app.post<{
    Body: { eventId: string; subject: string; body: string };
  }>('/me/announcements', {
    schema: {
      tags: ['Creators'],
      summary: 'Broadcast an announcement to all confirmed attendees of an event',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['eventId', 'subject', 'body'],
        properties: {
          eventId: { type: 'string', format: 'uuid' },
          subject: { type: 'string', minLength: 1, maxLength: 150 },
          body:    { type: 'string', minLength: 1, maxLength: 2000 },
        },
      },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const { eventId, subject, body: message } = req.body;

    const event = await prisma.event.findFirst({
      where: { id: eventId, creatorId: req.user!.id, deletedAt: null },
      select: { title: true },
    });
    if (!event) return reply.status(404).send({ message: 'Event not found or not yours.' });

    const tickets = await prisma.ticket.findMany({
      where:  { eventId, status: 'PAID' },
      select: {
        eventee: { select: { email: true, fullName: true } },
        order:   { select: { buyerEmail: true, buyerName: true } },
      },
    });

    const recipients = tickets.map((t) => ({
      email: t.eventee?.email    ?? t.order.buyerEmail,
      name:  t.eventee?.fullName ?? t.order.buyerName,
    })).filter((r) => r.email);

    let status: 'SENT' | 'FAILED' = 'SENT';

    if (recipients.length > 0) {
      try {
        await Promise.all(
          recipients.map((r, i) =>
            broadcastQueue.add(
              'broadcast',
              {
                recipientEmail: r.email,
                recipientName:  r.name,
                eventTitle:     event.title,
                subject,
                message,
              },
              { delay: i * 100, jobId: `announce:${eventId}:${r.email}:${Date.now()}` },
            ),
          ),
        );
      } catch {
        status = 'FAILED';
      }
    }

    const announcement = await prisma.announcement.create({
      data: {
        creatorId:      req.user!.id,
        eventId,
        subject,
        body:           message,
        recipientCount: recipients.length,
        status,
      },
      include: { event: { select: { title: true } } },
    });

    return reply.status(201).send(announcement);
  });
}
