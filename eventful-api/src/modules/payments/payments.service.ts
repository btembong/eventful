import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { tranzakClient, type WebhookPayload } from '@/lib/tranzak';
import { notificationsService } from '@/modules/notifications/notifications.service';
import { webhooksService } from '@/modules/webhooks/webhooks.service';
import env from '@/config/env';


function clientError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

export const paymentsService = {
  /**
   * Called after Order(PENDING) + Payment row are created.
   * Calls Tranzak to initialise the transaction and returns the payment URL
   * the client should redirect to.
   */
  async initializeTransaction(orderId: string, amount: number, currency: string): Promise<string> {
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });

    const result = await tranzakClient.createPaymentRequest({
      amount,
      currencyCode: currency,
      description: `Eventful order ${orderId}`,
      mchTransactionRef: payment.id,
      returnUrl: `${env.APP_BASE_URL}/orders/${orderId}/confirm`,
    });

    // Replace the placeholder with the real Tranzak requestId
    await prisma.payment.update({
      where: { id: payment.id },
      data: { tranzakRequestId: result.requestId },
    });

    return result.paymentUrl;
  },

  /**
   * Tranzak webhook handler.
   *
   * Idempotent via webhookEventId unique constraint — safe on retries.
   * Always verifies the payment with Tranzak directly before writing.
   */
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    if (!tranzakClient.verifyWebhookAuthKey(payload, env.TRANZAK_APP_ID)) {
      throw clientError('Invalid Tranzak webhook authKey', 401);
    }

    if (payload.eventType !== 'REQUEST.COMPLETED') return;

    // Idempotency — skip if already processed
    const existing = await prisma.payment.findFirst({
      where: { webhookEventId: payload.webhookId },
    });
    if (existing) return;

    // Verify with Tranzak directly (don't trust the webhook payload alone)
    const details = await tranzakClient.getPaymentDetails(payload.resourceId);
    if (details.status !== 'SUCCESSFUL') return;

    const feePct = env.PLATFORM_FEE_PCT;
    const paidAt = new Date(details.transactionTime ?? Date.now());

    // Update Payment + Order + Tickets + AuditLog atomically
    const payment = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const payment = await tx.payment.update({
        where: { tranzakRequestId: payload.resourceId },
        data: {
          status:         'success',
          paidAt,
          webhookEventId: payload.webhookId,
          platformFeePct: feePct,
        },
        include: {
          order: {
            include: {
              tickets: { select: { id: true, eventeeId: true } },
            },
          },
        },
      });

      // Compute and store platform fee
      const fee = parseFloat(payment.amount.toString()) * feePct / 100;
      await tx.payment.update({
        where: { id: payment.id },
        data: { platformFee: fee.toFixed(2) },
      });

      // Mark all tickets in the order as PAID
      await tx.ticket.updateMany({
        where: { orderId: payment.orderId },
        data:  { status: 'PAID' },
      });

      // Mark order as PAID
      await tx.order.update({
        where: { id: payment.orderId },
        data:  { status: 'PAID', paidAt },
      });

      await tx.auditLog.create({
        data: {
          actorId:    null,
          action:     'payment.verified',
          entityType: 'Payment',
          entityId:   payment.id,
          meta:       { tranzakRequestId: payload.resourceId, webhookId: payload.webhookId, orderId: payment.orderId },
        },
      });

      return payment;
    });

    // Schedule receipt + reminders for each ticket (authenticated buyers only)
    for (const ticket of payment.order.tickets) {
      if (ticket.eventeeId) {
        await notificationsService.scheduleReceipt(ticket.id, ticket.eventeeId);
        await notificationsService.scheduleReminders(ticket.id, payment.eventId);
      }
    }

    // Dispatch outbound webhook for creator integrations
    const event = await prisma.event.findUnique({ where: { id: payment.eventId }, select: { creatorId: true } });
    if (event) {
      await webhooksService.dispatch(event.creatorId, 'order.paid', {
        orderId:   payment.orderId,
        eventId:   payment.eventId,
        paymentId: payment.id,
        paidAt:    payment.paidAt,
        tickets:   payment.order.tickets.map((t) => t.id),
      });
    }
  },

  /** All payments across all events created by this creator, paginated. */
  async getCreatorPayments(creatorId: string, page = 1, limit = 20) {
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { event: { creatorId } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          event: { select: { id: true, title: true } },
          order: { select: { userId: true, buyerName: true, buyerEmail: true, quantity: true, status: true } },
        },
      }),
      prisma.payment.count({ where: { event: { creatorId } } }),
    ]);
    return { payments, total, page, limit, pages: Math.ceil(total / limit) };
  },

  /** Payments for a single event — verifies the creator owns it. */
  async getEventPayments(eventId: string, creatorId: string, page = 1, limit = 20) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { creatorId: true },
    });
    if (!event)                        throw clientError('Event not found', 404);
    if (event.creatorId !== creatorId) throw clientError('Forbidden', 403);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { eventId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          order: { select: { userId: true, buyerName: true, buyerEmail: true, quantity: true, status: true } },
        },
      }),
      prisma.payment.count({ where: { eventId } }),
    ]);
    return { payments, total, page, limit, pages: Math.ceil(total / limit) };
  },
};
