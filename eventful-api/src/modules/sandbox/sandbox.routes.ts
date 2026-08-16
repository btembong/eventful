/**
 * Sandbox-only routes for local development testing.
 * NEVER registered in production (guarded by NODE_ENV check in index.ts).
 *
 * POST /sandbox/trigger-webhook — simulate a Tranzak REQUEST.COMPLETED
 *   webhook for a pending payment without hitting the real Tranzak API.
 *   Useful for testing the full payment→order→ticket→receipt flow locally.
 */

import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { notificationsService } from '@/modules/notifications/notifications.service';
import { webhooksService } from '@/modules/webhooks/webhooks.service';
import env from '@/config/env';

export default async function sandboxRoutes(app: FastifyInstance) {

  /**
   * POST /sandbox/trigger-webhook
   *
   * Body: { paymentId: string }
   *
   * Simulates a successful Tranzak webhook for the given payment.
   * - Skips Tranzak API verification (no outbound HTTP to Tranzak).
   * - Runs the same DB transaction as the real webhook handler.
   * - Schedules receipt + reminder emails via BullMQ (uses real queues).
   * - Dispatches outbound creator webhooks.
   */
  app.post<{ Body: { paymentId: string } }>('/trigger-webhook', {
    schema: {
      tags: ['Sandbox'],
      summary: '[Dev only] Simulate a successful Tranzak payment webhook',
      body: {
        type: 'object',
        required: ['paymentId'],
        properties: {
          paymentId: { type: 'string', format: 'uuid', description: 'Internal Payment.id to mark as successful' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ok:        { type: 'boolean' },
            orderId:   { type: 'string' },
            paymentId: { type: 'string' },
            message:   { type: 'string' },
          },
        },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        409: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (req, reply) => {
    const { paymentId } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: { tickets: { select: { id: true, eventeeId: true } } },
        },
      },
    });

    if (!payment) {
      return reply.status(404).send({ error: 'Payment not found' });
    }
    if (payment.status === 'success') {
      return reply.status(409).send({ error: 'Payment already confirmed' });
    }
    if (payment.webhookEventId) {
      return reply.status(409).send({ error: 'Webhook already processed for this payment' });
    }

    const fakeWebhookId = `sandbox_${randomUUID()}`;
    const now = new Date();
    const feePct = env.PLATFORM_FEE_PCT;

    // Mirror the real handleWebhook transaction exactly (minus Tranzak API call)
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status:         'success',
          paidAt:         now,
          webhookEventId: fakeWebhookId,
          platformFeePct: feePct,
        },
        include: {
          order: { include: { tickets: { select: { id: true, eventeeId: true } } } },
        },
      });

      const fee = parseFloat(p.amount.toString()) * feePct / 100;
      await tx.payment.update({
        where: { id: p.id },
        data: { platformFee: fee.toFixed(2) },
      });

      // Mark all tickets in this order as PAID
      await tx.ticket.updateMany({
        where: { orderId: p.orderId },
        data:  { status: 'PAID' },
      });

      // Mark the order as PAID
      await tx.order.update({
        where: { id: p.orderId },
        data:  { status: 'PAID', paidAt: now },
      });

      await tx.auditLog.create({
        data: {
          actorId:    null,
          action:     'payment.verified',
          entityType: 'Payment',
          entityId:   p.id,
          meta:       { sandbox: true, fakeWebhookId },
        },
      });

      return p;
    });

    // Schedule receipt + reminders for authenticated buyers
    for (const ticket of updated.order.tickets) {
      if (ticket.eventeeId) {
        await notificationsService.scheduleReceipt(ticket.id, ticket.eventeeId);
        await notificationsService.scheduleReminders(ticket.id, updated.eventId);
      }
    }

    // Dispatch outbound creator webhooks
    const event = await prisma.event.findUnique({
      where: { id: updated.eventId },
      select: { creatorId: true },
    });
    if (event) {
      await webhooksService.dispatch(event.creatorId, 'order.paid', {
        orderId:   updated.orderId,
        eventId:   updated.eventId,
        paymentId: updated.id,
        paidAt:    updated.paidAt,
        tickets:   updated.order.tickets.map((t) => t.id),
        sandbox:   true,
      });
    }

    req.log.info({ paymentId, orderId: updated.orderId }, '[sandbox] webhook simulated');

    return reply.send({
      ok:        true,
      orderId:   updated.orderId,
      paymentId: updated.id,
      message:   'Payment confirmed (sandbox). Receipt + reminder emails queued.',
    });
  });
}
