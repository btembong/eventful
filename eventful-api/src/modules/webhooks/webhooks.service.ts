import crypto from 'crypto';
import { Queue } from 'bullmq';
import type { Prisma } from '@prisma/client';
import { redis } from '@/lib/redis';
import prisma from '@/lib/prisma';

// ─── Job payload ──────────────────────────────────────────────────────────────

export interface WebhookDeliveryJobData {
  deliveryId: string;
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export const webhookDeliveryQueue = new Queue<WebhookDeliveryJobData>('webhook-delivery', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: { count: 500 },
    removeOnFail:     { count: 500 },
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clientError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

function signPayload(secret: string, payload: object): string {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const webhooksService = {
  /** Register a new outbound webhook endpoint for the authenticated creator. */
  async create(creatorId: string, data: { url: string; events: string[] }) {
    const secret = crypto.randomBytes(32).toString('hex');
    return prisma.webhookEndpoint.create({
      data: {
        creatorId,
        url: data.url,
        secret,
        events: data.events,
      },
      select: { id: true, url: true, events: true, isActive: true, secret: true, createdAt: true },
    });
  },

  /** List all endpoints for a creator. */
  async list(creatorId: string) {
    return prisma.webhookEndpoint.findMany({
      where: { creatorId },
      select: { id: true, url: true, events: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  /** Toggle isActive, or update url/events. */
  async update(
    endpointId: string,
    creatorId: string,
    data: { url?: string; events?: string[]; isActive?: boolean },
  ) {
    const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
    if (!endpoint)                        throw clientError('Webhook endpoint not found', 404);
    if (endpoint.creatorId !== creatorId) throw clientError('Forbidden', 403);

    return prisma.webhookEndpoint.update({
      where: { id: endpointId },
      data,
      select: { id: true, url: true, events: true, isActive: true, createdAt: true },
    });
  },

  /** Delete an endpoint. */
  async delete(endpointId: string, creatorId: string) {
    const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
    if (!endpoint)                        throw clientError('Webhook endpoint not found', 404);
    if (endpoint.creatorId !== creatorId) throw clientError('Forbidden', 403);

    await prisma.webhookEndpoint.delete({ where: { id: endpointId } });
  },

  /** Paginated delivery history for an endpoint. */
  async deliveries(endpointId: string, creatorId: string, page = 1, limit = 20) {
    const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
    if (!endpoint)                        throw clientError('Webhook endpoint not found', 404);
    if (endpoint.creatorId !== creatorId) throw clientError('Forbidden', 403);

    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where: { endpointId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.webhookDelivery.count({ where: { endpointId } }),
    ]);
    return { deliveries, total, page, limit, pages: Math.ceil(total / limit) };
  },

  /**
   * Dispatch an event to all active endpoints subscribed to it.
   *
   * Creates a WebhookDelivery row for each matching endpoint, then enqueues
   * a delivery job. Called after ticket.paid, ticket.checked_in, etc.
   */
  async dispatch(
    creatorId: string,
    eventType: string,
    payload: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<void> {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { creatorId, isActive: true, events: { has: eventType } },
    });

    for (const endpoint of endpoints) {
      const delivery = await prisma.webhookDelivery.create({
        data: {
          endpointId: endpoint.id,
          event:      eventType,
          payload: payload as Prisma.InputJsonValue,
          status:     'pending',
        },
      });

      await webhookDeliveryQueue.add(
        'deliver',
        { deliveryId: delivery.id },
        { jobId: `wh-delivery:${delivery.id}` },
      );
    }
  },

  /** Sign a payload for the X-Eventful-Sig header. Exposed for use in the worker. */
  sign: signPayload,
};
