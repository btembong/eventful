import prisma from '@/lib/prisma';
import { qrService } from '@/lib/qr';
import { webhooksService } from '@/modules/webhooks/webhooks.service';

function clientError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

export const ticketsService = {
  /** Return all tickets owned by an eventee, most recent first.
   *  Includes guest-checkout tickets where order.buyerEmail matches the user's email. */
  async getTicketsForEventee(eventeeId: string, email: string) {
    return prisma.ticket.findMany({
      where: {
        OR: [
          { eventeeId },
          { eventeeId: null, order: { buyerEmail: { equals: email, mode: 'insensitive' } } },
        ],
      },
      orderBy: { purchasedAt: 'desc' },
      include: {
        event: {
          select: { id: true, title: true, category: true, venue: true, startsAt: true, shareSlug: true, coverImageUrl: true },
        },
        tier:  { select: { id: true, name: true, type: true } },
        order: { select: { id: true, quantity: true, totalAmount: true, currency: true, status: true } },
      },
    });
  },

  /** Return a single ticket. Enforces ownership (by userId or buyer email). */
  async getTicketById(ticketId: string, eventeeId: string, email: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: {
          select: { id: true, title: true, category: true, venue: true, startsAt: true, shareSlug: true, coverImageUrl: true },
        },
        tier:  { select: { id: true, name: true, type: true, perks: true } },
        order: { select: { id: true, quantity: true, totalAmount: true, currency: true, status: true, buyerEmail: true } },
      },
    });
    if (!ticket) throw clientError('Ticket not found', 404);
    const ownedByUser  = ticket.eventeeId === eventeeId;
    const ownedByEmail = !ticket.eventeeId && ticket.order?.buyerEmail?.toLowerCase() === email.toLowerCase();
    if (!ownedByUser && !ownedByEmail) throw clientError('Forbidden', 403);
    return ticket;
  },

  /**
   * Refund a ticket (self-service by eventee or initiated by creator).
   * Calls Tranzak to reverse the payment if applicable, then marks REFUNDED.
   */
  async refundTicket(ticketId: string, requestorId: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        order: { include: { payment: true } },
        event: { select: { creatorId: true, isCancelled: true } },
      },
    });
    if (!ticket) throw clientError('Ticket not found', 404);
    if (ticket.eventeeId !== requestorId && ticket.event.creatorId !== requestorId) {
      throw clientError('Forbidden', 403);
    }
    if (ticket.status === 'REFUNDED')  throw clientError('Ticket already refunded', 409);
    if (ticket.status === 'CANCELLED') throw clientError('Ticket is cancelled', 409);
    if (ticket.status === 'CHECKED_IN') throw clientError('Checked-in tickets cannot be refunded', 409);
    if (ticket.status !== 'PAID')       throw clientError('Only paid tickets can be refunded', 409);

    const payment = ticket.order.payment;
    if (payment && !payment.tranzakRequestId.startsWith('_pending_')) {
      const { tranzakClient } = await import('@/lib/tranzak');
      await tranzakClient.refundPayment(payment.tranzakRequestId, 'Refund requested');
    }

    await prisma.$transaction([
      prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'REFUNDED' },
      }),
      prisma.auditLog.create({
        data: {
          actorId:    requestorId,
          action:     'ticket.refunded',
          entityType: 'Ticket',
          entityId:   ticketId,
          meta:       { requestorId },
        },
      }),
    ]);

    return { message: 'Ticket refunded successfully.' };
  },

  /**
   * Scan a QR code and mark the ticket as checked in.
   * Idempotent — scanning an already-checked-in ticket returns the existing
   * checkedInAt rather than erroring.
   */
  async checkin(eventId: string, qrPayload: string, actorId: string) {
    const { valid, ticketId } = qrService.verify(qrPayload, eventId);
    if (!valid || !ticketId) throw clientError('Invalid QR code', 422);

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket)                    throw clientError('Ticket not found', 404);
    if (ticket.eventId !== eventId) throw clientError('QR code does not match this event', 422);

    if (ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED') {
      throw clientError('Ticket is cancelled or refunded', 410);
    }

    // Idempotency — return early if already checked in
    if (ticket.checkedInAt) {
      return { ticket, alreadyCheckedIn: true };
    }

    if (ticket.status !== 'PAID') {
      throw clientError('Ticket payment has not been confirmed', 402);
    }

    const now = new Date();
    const [updated] = await prisma.$transaction([
      prisma.ticket.update({
        where: { id: ticketId },
        data: { checkedInAt: now, status: 'CHECKED_IN' },
      }),
      prisma.auditLog.create({
        data: {
          actorId,
          action:     'ticket.checked_in',
          entityType: 'Ticket',
          entityId:   ticketId,
          meta:       { eventId, checkedInAt: now.toISOString() },
        },
      }),
    ]);

    // Dispatch outbound webhook for creator integrations (non-blocking)
    const ev = await prisma.event.findUnique({ where: { id: eventId }, select: { creatorId: true } });
    if (ev) {
      await webhooksService.dispatch(ev.creatorId, 'ticket.checked_in', {
        ticketId,
        eventId,
        checkedInAt: now.toISOString(),
      });
    }

    // Publish to Redis channel so live SSE dashboard receives the update
    const { redis } = await import('@/lib/redis');
    redis.publish(`live:event:${eventId}`, JSON.stringify({
      ticketId,
      checkedInAt: now.toISOString(),
    })).catch(() => {}); // non-blocking, best-effort

    return { ticket: updated, alreadyCheckedIn: false };
  },
};
