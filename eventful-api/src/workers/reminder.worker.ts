import { Worker } from 'bullmq';
import { redis } from '@/lib/redis';
import prisma from '@/lib/prisma';
import {
  notificationsService,
  type ReminderJobData,
} from '@/modules/notifications/notifications.service';
import { tplReminder } from '@/modules/notifications/email-templates';
import { qrService } from '@/lib/qr';

export const reminderWorker = new Worker<ReminderJobData>(
  'notifications',
  async (job) => {
    const { ticketId, reminderPrefId, channel } = job.data;

    // Load everything needed to send the reminder
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        eventee: { select: { email: true, fullName: true } },
        event:   { select: { title: true, venue: true, startsAt: true } },
      },
    });

    // Skip silently if ticket is gone or cancelled
    if (!ticket || ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED') {
      job.log(`Skipping reminder — ticket ${ticketId} is ${ticket?.status ?? 'missing'}`);
      return;
    }

    // Guest-checkout tickets have no linked eventee — skip
    if (!ticket.eventee) {
      job.log(`Skipping reminder — ticket ${ticketId} is a guest-checkout ticket`);
      return;
    }

    const pref = await prisma.reminderPref.findUnique({ where: { id: reminderPrefId } });
    if (!pref || pref.sentAt) {
      job.log(`Skipping reminder — pref ${reminderPrefId} already sent or missing`);
      return;
    }

    if (channel === 'EMAIL') {
      const qrPayload   = qrService.sign(ticket.id, ticket.eventId);
      const qrPngBuffer = await qrService.generatePng(qrPayload);
      const qrBase64    = qrPngBuffer.toString('base64');

      await notificationsService.sendEmail(
        ticket.eventee.email,
        `Reminder: "${ticket.event.title}" starts soon`,
        tplReminder({
          fullName:      ticket.eventee.fullName,
          eventTitle:    ticket.event.title,
          venue:         ticket.event.venue,
          startsAt:      ticket.event.startsAt,
          offsetMinutes: pref.offsetMinutes,
          qrBase64,
          ticketId:      ticket.id,
        }),
      );
    } else {
      job.log(`Channel ${channel} not yet implemented — skipping`);
    }

    // Mark sent
    await prisma.reminderPref.update({
      where: { id: reminderPrefId },
      data:  { sentAt: new Date() },
    });

    job.log(`Reminder sent to ${ticket.eventee.email} for event "${ticket.event.title}"`);
  },
  {
    connection: redis,
    concurrency: 5,
  },
);

reminderWorker.on('failed', (job, err) => {
  console.error(`[reminder.worker] Job ${job?.id} failed:`, err.message);
});

reminderWorker.on('completed', (job) => {
  console.log(`[reminder.worker] Job ${job.id} completed`);
});
