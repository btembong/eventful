import type { FastifyInstance } from 'fastify';
import { requireCreator } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';

// ─── CSV helpers ───────────────────────────────────────────────────────────

function escapeCsv(val: string | null | undefined): string {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsv(fields: (string | null | undefined)[]): string {
  return fields.map(escapeCsv).join(',');
}

// ─── Routes ────────────────────────────────────────────────────────────────

export default async function exportRoutes(app: FastifyInstance) {

  // GET /creators/me/events/:id/attendees/export — CSV download
  app.get<{ Params: { id: string } }>('/me/events/:id/attendees/export', {
    schema: {
      tags: ['Creators'],
      summary: 'Export attendee list as CSV',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
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

    const tickets = await prisma.ticket.findMany({
      where: { eventId: req.params.id },
      orderBy: { purchasedAt: 'asc' },
      select: {
        id:          true,
        status:      true,
        purchasedAt: true,
        checkedInAt: true,
        eventee:     { select: { fullName: true, email: true, phone: true } },
        order:       { select: { buyerName: true, buyerEmail: true, buyerPhone: true, payment: { select: { amount: true, currency: true } } } },
      },
    });

    const header = 'Name,Email,Phone,Ticket ID,Amount,Currency,Status,Purchased At,Checked In At';
    const rows   = tickets.map((t) => {
      // Prefer linked user data; fall back to order buyer info for guests
      const name     = t.eventee?.fullName ?? t.order.buyerName;
      const email    = t.eventee?.email    ?? t.order.buyerEmail;
      const phone    = t.eventee?.phone    ?? t.order.buyerPhone ?? '';
      const amount   = t.order.payment?.amount?.toString() ?? '0';
      const currency = t.order.payment?.currency ?? '';
      return rowToCsv([name, email, phone, t.id, amount, currency, t.status, t.purchasedAt.toISOString(), t.checkedInAt?.toISOString() ?? '']);
    });

    const csv      = [header, ...rows].join('\r\n');
    const filename = `attendees-${req.params.id.slice(0, 8)}.csv`;

    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(csv);
  });

}
