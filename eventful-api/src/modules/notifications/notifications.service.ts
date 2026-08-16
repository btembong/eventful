import { Queue } from 'bullmq';
import { redis } from '@/lib/redis';
import prisma from '@/lib/prisma';
import env from '@/config/env';

// ─── Job payload types ─────────────────────────────────────────────────────────

export interface ReminderJobData {
  ticketId: string;
  userId: string;
  eventId: string;
  channel: 'EMAIL' | 'SMS' | 'PUSH';
  reminderPrefId: string;
}

export interface ReceiptJobData {
  ticketId: string;
  userId: string;
}

export interface BroadcastJobData {
  recipientEmail: string;
  recipientName:  string;
  eventTitle:     string;
  subject:        string;
  message:        string;
}

// ─── Queues (shared between API process and worker process) ───────────────────

export const notificationsQueue = new Queue<ReminderJobData>('notifications', {
  connection: redis,
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
});

export const receiptsQueue = new Queue<ReceiptJobData>('receipts', {
  connection: redis,
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
});

export const broadcastQueue = new Queue<BroadcastJobData>('broadcasts', {
  connection: redis,
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
});

// ─── Service ──────────────────────────────────────────────────────────────────

export const notificationsService = {
  /**
   * Schedule reminder jobs for a ticket.
   *
   * Uses the event's defaultReminderOffsets unless the eventee has their own
   * ReminderPrefs. Creates ReminderPref rows from defaults if none exist.
   * Each job is enqueued with a delay so it fires at (startsAt - offsetMinutes).
   */
  async scheduleReminders(ticketId: string, eventId: string): Promise<void> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        eventee: { select: { id: true } },
        event:   { select: { startsAt: true, defaultReminderOffsets: true } },
      },
    });
    if (!ticket) return;

    // Guest-checkout tickets have no eventee — skip scheduling
    if (!ticket.eventeeId) return;
    const eventeeId = ticket.eventeeId;

    // Prefer eventee-specific overrides; fall back to event defaults
    let prefs = await prisma.reminderPref.findMany({
      where: { ticketId, userId: eventeeId },
    });

    if (prefs.length === 0 && ticket.event.defaultReminderOffsets.length > 0) {
      prefs = await prisma.$transaction(
        ticket.event.defaultReminderOffsets.map((offset) =>
          prisma.reminderPref.create({
            data: {
              userId:        eventeeId,
              ticketId,
              eventId,
              offsetMinutes: offset,
              channel:       'EMAIL',
            },
          }),
        ),
      );
    }

    const now = Date.now();
    for (const pref of prefs) {
      const fireAt = new Date(ticket.event.startsAt).getTime() - pref.offsetMinutes * 60_000;
      if (fireAt <= now) continue; // already past — skip silently

      await notificationsQueue.add(
        'reminder',
        { ticketId, userId: eventeeId, eventId, channel: pref.channel, reminderPrefId: pref.id },
        {
          delay: fireAt - now,
          jobId: `reminder:${pref.id}`, // prevents duplicate jobs on retries
        },
      );
    }
  },

  /**
   * Enqueue a receipt email for immediate delivery (no delay).
   * Safe to call multiple times — jobId deduplicates.
   */
  async scheduleReceipt(ticketId: string, userId: string): Promise<void> {
    await receiptsQueue.add(
      'receipt',
      { ticketId, userId },
      { jobId: `receipt:${ticketId}` },
    );
  },

  // ─── Email delivery ─────────────────────────────────────────────────────────

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    attachments?: { content: string; name: string }[],
  ): Promise<void> {
    if (!env.BREVO_API_KEY) {
      console.warn('[notifications] BREVO_API_KEY not set — skipping email to', to);
      return;
    }

    console.info(`[notifications] Sending email to ${to} — "${subject}"`);
    const body: Record<string, unknown> = {
      sender: {
        email: env.BREVO_SENDER_EMAIL ?? 'noreply@eventful.app',
        name:  env.BREVO_SENDER_NAME  ?? 'Eventful',
      },
      to:          [{ email: to }],
      subject,
      htmlContent,
    };
    if (attachments?.length) body.attachment = attachments;

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': env.BREVO_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Brevo send failed (${res.status}): ${err}`);
    }
  },

  async sendSms(_to: string, _message: string): Promise<void> {
    throw new Error('SMS not yet implemented — add after email is proven');
  },
};

// Templates live in email-templates.ts — import from there directly in workers/services.
