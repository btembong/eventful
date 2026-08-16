import { Worker } from 'bullmq';
import { redis } from '@/lib/redis';
import prisma from '@/lib/prisma';
import { webhooksService, type WebhookDeliveryJobData } from '@/modules/webhooks/webhooks.service';

const MAX_TIMEOUT_MS = 10_000;

export const webhookDeliveryWorker = new Worker<WebhookDeliveryJobData>(
  'webhook-delivery',
  async (job) => {
    const { deliveryId } = job.data;

    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { endpoint: { select: { url: true, secret: true, isActive: true } } },
    });

    if (!delivery) {
      job.log(`Delivery ${deliveryId} not found — skipping`);
      return;
    }

    // Endpoint deactivated after job was enqueued — skip silently
    if (!delivery.endpoint.isActive) {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: 'failed', lastError: 'Endpoint deactivated' },
      });
      return;
    }

    const sig = webhooksService.sign(delivery.endpoint.secret, delivery.payload as object);

    let status: 'success' | 'failed' = 'failed';
    let lastError: string | null = null;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), MAX_TIMEOUT_MS);

      const res = await fetch(delivery.endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Eventful-Event': delivery.event,
          'X-Eventful-Sig':   `sha256=${sig}`,
        },
        body: JSON.stringify(delivery.payload),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (res.ok) {
        status = 'success';
      } else {
        lastError = `HTTP ${res.status}`;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status,
        attempts: { increment: 1 },
        lastError,
      },
    });

    if (status === 'failed') {
      // Let BullMQ retry (attempts configured on the queue)
      throw new Error(lastError ?? 'Delivery failed');
    }

    job.log(`Delivered ${delivery.event} to ${delivery.endpoint.url}`);
  },
  {
    connection: redis,
    concurrency: 10,
  },
);

webhookDeliveryWorker.on('failed', (job, err) => {
  console.error(`[webhook-delivery.worker] Job ${job?.id} failed:`, err.message);
});

webhookDeliveryWorker.on('completed', (job) => {
  console.log(`[webhook-delivery.worker] Job ${job.id} completed`);
});
