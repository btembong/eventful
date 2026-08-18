import crypto from 'crypto';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { qrService } from '@/lib/qr';
import { notificationsService } from '@/modules/notifications/notifications.service';

function clientError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

function holdKey(tierId: string, seat: string) {
  return `seat:hold:${tierId}:${seat}`;
}

export interface CreateOrderParams {
  tierId:      string;
  quantity:    number;
  buyerName:   string;
  buyerEmail:  string;
  buyerPhone?: string;
  userId?:     string;   // null = guest checkout
  inviteCode?: string;
  seats?:      string[]; // seat labels for seating tiers, e.g. ["A3","A4"]
  sessionId?:  string;   // used to validate Redis seat holds
}

export const ordersService = {
  /**
   * Create an order for N tickets on a tier.
   *
   * Free tiers  → Order + Tickets immediately PAID; no payment row.
   * Paid tiers  → Order + Tickets PENDING; Payment row created; Tranzak called for paymentUrl.
   *
   * All capacity checks run inside a single Prisma transaction.
   */
  async createOrder(eventId: string, params: CreateOrderParams) {
    // 1. Validate event
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { id: true, capacity: true, currency: true, isCancelled: true, startsAt: true, isPublished: true },
    });
    if (!event)             throw clientError('Event not found', 404);
    if (!event.isPublished) throw clientError('Event is not published', 403);
    if (event.isCancelled)  throw clientError('Event is cancelled', 410);
    if (new Date(event.startsAt) < new Date()) throw clientError('Event has already started', 410);

    // 2. Validate tier
    const tier = await prisma.ticketTier.findFirst({ where: { id: params.tierId, eventId } });
    if (!tier)           throw clientError('Ticket tier not found', 404);
    if (!tier.isOnSale)  throw clientError('This ticket tier is not on sale', 409);

    const now = new Date();
    if (tier.salesStart && tier.salesStart > now) throw clientError('Ticket sales have not started yet', 409);
    if (tier.salesEnd   && tier.salesEnd   < now) throw clientError('Ticket sales have ended', 409);
    if (params.quantity < 1 || params.quantity > tier.orderLimit) {
      throw clientError(`Order quantity must be between 1 and ${tier.orderLimit}`, 422);
    }

    if (tier.type === 'INVITE_ONLY') {
      if (!params.inviteCode || params.inviteCode !== tier.inviteCode) {
        throw clientError('Invalid invite code', 403);
      }
    }

    // 2b. Seating validation
    const seats = params.seats ?? [];
    if (tier.hasSeating) {
      if (seats.length !== params.quantity) {
        throw clientError(`Please select exactly ${params.quantity} seat${params.quantity > 1 ? 's' : ''}`, 422);
      }
      // Validate Redis holds belong to this session
      if (params.sessionId) {
        for (const seat of seats) {
          const holder = await redis.get(holdKey(tier.id, seat));
          if (!holder) {
            throw clientError(`Seat hold for ${seat} has expired. Please select seats again.`, 409);
          }
          if (holder !== params.sessionId) {
            throw clientError(`Seat ${seat} is held by another buyer`, 409);
          }
        }
      }
      // Check seats aren't already on a paid/pending ticket
      const conflicting = await prisma.ticket.findMany({
        where: { tierId: tier.id, seatLabel: { in: seats }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        select: { seatLabel: true },
      });
      if (conflicting.length > 0) {
        throw clientError(`Seat(s) ${conflicting.map(c => c.seatLabel).join(', ')} already taken`, 409);
      }
    }

    const unitPrice   = parseFloat(tier.price.toString());
    const totalAmount = unitPrice * params.quantity;
    const currency    = tier.currency;
    const isFree      = unitPrice === 0 || tier.type === 'FREE';

    // 3. Transactional: capacity check → create Order + Tickets (+ Payment for paid)
    const { order, tickets, paymentId } = await prisma.$transaction(async (tx) => {
      // Overall event capacity
      const eventSold = await tx.ticket.count({
        where: { eventId, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      });
      if (eventSold + params.quantity > event.capacity) {
        throw clientError('Not enough capacity remaining for this event', 409);
      }

      // Per-tier capacity
      const tierSold = await tx.ticket.count({
        where: { tierId: tier.id, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      });
      if (tierSold + params.quantity > tier.capacity) {
        throw clientError('Not enough capacity in this ticket tier', 409);
      }

      // Create order
      const orderId = crypto.randomUUID();
      const order = await tx.order.create({
        data: {
          id:          orderId,
          eventId,
          tierId:      tier.id,
          quantity:    params.quantity,
          unitPrice,
          totalAmount,
          currency,
          status:      isFree ? 'PAID' : 'PENDING',
          buyerName:   params.buyerName,
          buyerEmail:  params.buyerEmail,
          buyerPhone:  params.buyerPhone ?? null,
          userId:      params.userId ?? null,
          paidAt:      isFree ? now : null,
        },
      });

      // Create N tickets (one per seat for seating tiers)
      const tickets = [];
      for (let i = 0; i < params.quantity; i++) {
        const ticketId  = crypto.randomUUID();
        const qrPayload = qrService.sign(ticketId, eventId);
        const ticket = await tx.ticket.create({
          data: {
            id:        ticketId,
            eventId,
            orderId,
            tierId:    tier.id,
            eventeeId: params.userId ?? null,
            status:    isFree ? 'PAID' : 'PENDING_PAYMENT',
            qrPayload,
            seatLabel: seats[i] ?? null,
          },
        });
        tickets.push(ticket);
      }

      // Increment tier sold counter atomically
      await tx.ticketTier.update({
        where: { id: tier.id },
        data: { sold: { increment: params.quantity } },
      });

      let paymentId: string | null = null;
      if (!isFree) {
        const pId = crypto.randomUUID();
        await tx.payment.create({
          data: {
            id:               pId,
            orderId,
            eventId,
            amount:           totalAmount,
            currency,
            status:           'pending',
            tranzakRequestId: `_pending_${pId}`,
          },
        });
        paymentId = pId;
      }

      return { order, tickets, paymentId };
    });

    let paymentUrl: string | undefined;
    if (!isFree && paymentId) {
      const { paymentsService } = await import('@/modules/payments/payments.service');
      paymentUrl = await paymentsService.initializeTransaction(order.id, totalAmount, currency);
    }

    // Schedule receipt + reminders for free tickets (all buyers, including guests)
    if (isFree) {
      for (const ticket of tickets) {
        await notificationsService.scheduleReceipt(ticket.id, params.userId ?? '');
        if (params.userId) await notificationsService.scheduleReminders(ticket.id, eventId);
      }
    }

    return {
      order: { ...order, tickets },
      paymentRequired: !isFree,
      paymentUrl,
      message: isFree
        ? `${params.quantity > 1 ? params.quantity + ' tickets' : 'Ticket'} confirmed. See you there!`
        : 'Order created. Complete payment to confirm your seats.',
    };
  },

  async getOrderById(orderId: string, userId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tickets: true,
        event:   { select: { id: true, title: true, startsAt: true, venue: true, shareSlug: true } },
        tier:    { select: { id: true, name: true, type: true } },
        payment: { select: { id: true, status: true, paidAt: true, tranzakRequestId: true } },
      },
    });
    if (!order) throw clientError('Order not found', 404);
    // Guest orders have userId=null — only the buyer themselves can access via their account
    if (order.userId && userId && order.userId !== userId) throw clientError('Forbidden', 403);
    return order;
  },

  /**
   * Manually verify a PENDING paid order by calling Tranzak directly.
   * Used when the webhook was missed or delayed.
   * Safe to call repeatedly — idempotent if already PAID.
   */
  async verifyPayment(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tickets: { select: { id: true, eventeeId: true } },
        payment: { select: { id: true, status: true, tranzakRequestId: true } },
      },
    });
    if (!order) throw clientError('Order not found', 404);
    if (order.status === 'PAID') return { status: 'PAID', alreadyPaid: true };
    if (!order.payment) throw clientError('No payment record for this order', 400);
    if (order.payment.status === 'success') return { status: 'PAID', alreadyPaid: true };

    const tranzakRequestId = order.payment.tranzakRequestId;
    if (!tranzakRequestId || tranzakRequestId.startsWith('_pending_')) {
      throw clientError('Payment not yet initialized with Tranzak', 400);
    }

    const { tranzakClient } = await import('@/lib/tranzak');
    const details = await tranzakClient.getPaymentDetails(tranzakRequestId);
    if (details.status !== 'SUCCESSFUL') {
      return { status: details.status, alreadyPaid: false };
    }

    const feePct = (await import('@/config/env')).default.PLATFORM_FEE_PCT;
    const paidAt = new Date(details.transactionTime ?? Date.now());

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: order.payment!.id },
        data: { status: 'success', paidAt, platformFee: (parseFloat(order.totalAmount.toString()) * feePct / 100).toFixed(2) },
      });
      await tx.ticket.updateMany({ where: { orderId }, data: { status: 'PAID' } });
      await tx.order.update({ where: { id: orderId }, data: { status: 'PAID', paidAt } });
      await tx.auditLog.create({
        data: {
          actorId: null,
          action: 'payment.verified.manual',
          entityType: 'Payment',
          entityId: order.payment!.id,
          meta: { orderId, tranzakRequestId, triggeredBy: 'verify-endpoint' },
        },
      });
    });

    for (const ticket of order.tickets) {
      try {
        await notificationsService.scheduleReceipt(ticket.id, ticket.eventeeId ?? '');
      } catch (e) {
        console.error('[verifyPayment] Failed to schedule receipt for ticket', ticket.id, e);
      }
    }

    return { status: 'PAID', alreadyPaid: false };
  },

  async getUserOrders(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        tickets: { select: { id: true, status: true, qrPayload: true } },
        event:   { select: { id: true, title: true, startsAt: true, venue: true, shareSlug: true } },
        tier:    { select: { id: true, name: true, type: true } },
      },
    });
  },
};
