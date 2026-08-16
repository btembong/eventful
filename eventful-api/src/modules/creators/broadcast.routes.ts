import type { FastifyInstance } from 'fastify';
import { requireCreator } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';
import { broadcastQueue } from '@/modules/notifications/notifications.service';

export default async function broadcastRoutes(app: FastifyInstance) {

  // POST /creators/me/events/:id/announce — send a message to all confirmed attendees
  app.post<{
    Params: { id: string };
    Body:   { subject: string; message: string };
  }>('/me/events/:id/announce', {
    schema: {
      tags: ['Creators'],
      summary: 'Broadcast a message to all confirmed attendees of an event',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['subject', 'message'],
        properties: {
          subject: { type: 'string', minLength: 1, maxLength: 150 },
          message: { type: 'string', minLength: 1, maxLength: 2000 },
        },
      },
      response: {
        202: {
          type: 'object',
          properties: {
            queued:  { type: 'integer', description: 'Number of emails enqueued' },
            message: { type: 'string' },
          },
        },
      },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { creatorId: true, title: true },
    });
    if (!event) return reply.status(404).send({ error: 'Event not found' });
    if (event.creatorId !== req.user!.id) return reply.status(403).send({ error: 'Forbidden' });

    // Fetch all PAID tickets — include eventee info and fallback to order buyer info
    const tickets = await prisma.ticket.findMany({
      where:  { eventId: req.params.id, status: 'PAID' },
      select: {
        eventee: { select: { email: true, fullName: true } },
        order:   { select: { buyerEmail: true, buyerName: true } },
      },
    });

    // Build recipient list, preferring linked user data over guest buyer info
    const recipients = tickets.map((t) => ({
      email: t.eventee?.email    ?? t.order.buyerEmail,
      name:  t.eventee?.fullName ?? t.order.buyerName,
    })).filter((r) => r.email);

    if (recipients.length === 0) {
      return reply.status(202).send({ queued: 0, message: 'No confirmed attendees to notify.' });
    }

    // Enqueue one BullMQ job per attendee (worker handles rate limiting + retries)
    const jobs = recipients.map((r, i) =>
      broadcastQueue.add(
        'broadcast',
        {
          recipientEmail: r.email,
          recipientName:  r.name,
          eventTitle:     event.title,
          subject:        req.body.subject,
          message:        req.body.message,
        },
        {
          // Stagger by 100ms each to avoid Brevo rate limits
          delay: i * 100,
          jobId: `broadcast:${req.params.id}:${r.email}:${Date.now()}`,
        },
      ),
    );

    await Promise.all(jobs);

    return reply.status(202).send({
      queued:  tickets.length,
      message: `Announcement queued for ${tickets.length} attendee${tickets.length === 1 ? '' : 's'}.`,
    });
  });
}
