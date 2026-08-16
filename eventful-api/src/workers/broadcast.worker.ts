import { Worker } from 'bullmq';
import { redis } from '@/lib/redis';
import {
  notificationsService,
  type BroadcastJobData,
} from '@/modules/notifications/notifications.service';
import { tplBroadcast } from '@/modules/notifications/email-templates';

export const broadcastWorker = new Worker<BroadcastJobData>(
  'broadcasts',
  async (job) => {
    const { recipientEmail, recipientName, eventTitle, subject, message } = job.data;

    await notificationsService.sendEmail(
      recipientEmail,
      subject,
      tplBroadcast({ fullName: recipientName, eventTitle, message }),
    );

    job.log(`Broadcast sent to ${recipientEmail}`);
  },
  {
    connection: redis,
    concurrency: 20, // broadcasts can go out in parallel
  },
);

broadcastWorker.on('failed', (job, err) => {
  console.error(`[broadcast.worker] Job ${job?.id} failed:`, err.message);
});

broadcastWorker.on('completed', (job) => {
  console.log(`[broadcast.worker] Job ${job.id} completed`);
});
