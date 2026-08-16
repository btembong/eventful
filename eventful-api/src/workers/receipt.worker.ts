import { Worker } from 'bullmq';
import { redis } from '@/lib/redis';
import prisma from '@/lib/prisma';
import {
  notificationsService,
  type ReceiptJobData,
} from '@/modules/notifications/notifications.service';
import { tplReceipt } from '@/modules/notifications/email-templates';
import { qrService } from '@/lib/qr';
import { generateTicketPdf } from '@/lib/ticket-pdf';

export const receiptWorker = new Worker<ReceiptJobData>(
  'receipts',
  async (job) => {
    const { ticketId } = job.data;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        eventee: { select: { email: true, fullName: true } },
        order:   { select: { buyerName: true, buyerEmail: true } },
        event:   {
          select: { id: true, title: true, venue: true, startsAt: true, price: true, currency: true, confirmationMessage: true },
        },
      },
    });

    if (!ticket || ticket.status === 'CANCELLED') {
      job.log(`Skipping receipt — ticket ${ticketId} is ${ticket?.status ?? 'missing'}`);
      return;
    }

    // Use registered user email if available, otherwise fall back to guest buyer email
    const recipientEmail = ticket.eventee?.email ?? ticket.order?.buyerEmail;
    const recipientName  = ticket.eventee?.fullName ?? ticket.order?.buyerName ?? 'Guest';

    if (!recipientEmail) {
      job.log(`Skipping receipt — no email address for ticket ${ticketId}`);
      return;
    }

    // Generate signed QR payload and PNG
    const qrPayload  = qrService.sign(ticket.id, ticket.event.id);
    const qrPngBuffer = await qrService.generatePng(qrPayload);
    const qrBase64   = qrPngBuffer.toString('base64');

    // Generate PDF ticket
    const pdfParams = {
      fullName:            recipientName,
      eventTitle:          ticket.event.title,
      venue:               ticket.event.venue,
      startsAt:            ticket.event.startsAt,
      price:               ticket.event.price.toString(),
      currency:            ticket.event.currency,
      ticketId:            ticket.id,
      qrPngBuffer,
      confirmationMessage: ticket.event.confirmationMessage ?? undefined,
    };
    const pdfBuffer = await generateTicketPdf(pdfParams);

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
        qrBase64,
        confirmationMessage: ticket.event.confirmationMessage ?? undefined,
      }),
      [{ content: pdfBuffer.toString('base64'), name: `ticket-${ticket.id.split('-')[0]}.pdf` }],
    );

    job.log(`Receipt sent to ${recipientEmail}`);
  },
  {
    connection: redis,
    concurrency: 10,
  },
);

receiptWorker.on('failed', (job, err) => {
  console.error(`[receipt.worker] Job ${job?.id} failed:`, err.message);
});

receiptWorker.on('completed', (job) => {
  console.log(`[receipt.worker] Job ${job.id} completed`);
});
