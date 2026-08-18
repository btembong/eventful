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

  /**
   * Send a receipt email directly without going through BullMQ.
   * Use this in payment confirmation flows where immediate delivery is required
   * and the BullMQ worker may not be reliable (e.g., free-tier server sleeping).
   */
  async sendReceiptDirectly(ticketId: string): Promise<void> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        eventee: { select: { email: true, fullName: true } },
        order:   { select: { buyerName: true, buyerEmail: true } },
        event:   { select: { id: true, title: true, venue: true, startsAt: true, price: true, currency: true, confirmationMessage: true } },
      },
    });

    if (!ticket || ticket.status === 'CANCELLED') return;

    const recipientEmail = ticket.eventee?.email ?? ticket.order?.buyerEmail;
    const recipientName  = ticket.eventee?.fullName ?? ticket.order?.buyerName ?? 'Guest';
    if (!recipientEmail) return;

    try {
      const { qrService }          = await import('@/lib/qr');
      const { generateTicketPdf }  = await import('@/lib/ticket-pdf');
      const { tplReceipt }         = await import('@/modules/notifications/email-templates');
      const apiBaseUrl             = (await import('@/config/env')).default.API_BASE_URL;

      const qrPayload   = qrService.sign(ticket.id, ticket.event.id);
      const qrPngBuffer = await qrService.generatePng(qrPayload);
      const qrImageUrl  = `${apiBaseUrl}/v1/tickets/${ticket.id}/qr.png`;

      const pdfBuffer = await generateTicketPdf({
        fullName:            recipientName,
        eventTitle:          ticket.event.title,
        venue:               ticket.event.venue,
        startsAt:            ticket.event.startsAt,
        price:               ticket.event.price.toString(),
        currency:            ticket.event.currency,
        ticketId:            ticket.id,
        qrPngBuffer,
        confirmationMessage: ticket.event.confirmationMessage ?? undefined,
      });

      await notificationsService.sendEmail(
        recipientEmail,
        `Your ticket for "${ticket.event.title}" is confirmed`,
        tplReceipt({
          fullName:            recipientName,
          eventTitle:          ticket.event.title,
          venue:               ticket.event.venue,
          startsAt:            ticket.event.startsAt,
          price:               ticket.event.price.toString(),
          currency:            ticket.event.currency,
          ticketId:            ticket.id,
          qrImageUrl,
          confirmationMessage: ticket.event.confirmationMessage ?? undefined,
        }),
        [{ content: pdfBuffer.toString('base64'), name: `ticket-${ticket.id.split('-')[0]}.pdf` }],
      );

      console.info(`[notifications] Receipt sent directly to ${recipientEmail} for ticket ${ticketId}`);
    } catch (err) {
      console.error(`[notifications] Direct receipt failed for ticket ${ticketId}:`, (err as Error).message);
      // Fall back to BullMQ queue so it retries
      await receiptsQueue.add('receipt', { ticketId, userId: ticket.eventeeId ?? '' }, { jobId: `receipt:${ticketId}:retry` });
    }
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
