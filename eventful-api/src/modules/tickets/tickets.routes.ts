import type { FastifyInstance } from 'fastify';
import { ticketsService } from './tickets.service';
import { requireAuth, requireCreator, requireScannerOrCreator } from '@/middleware/auth.guard';
import { qrService } from '@/lib/qr';
import prisma from '@/lib/prisma';

export default async function ticketsRoutes(app: FastifyInstance) {

  // GET /eventees/me/tickets — list all tickets for the authenticated user
  app.get('/eventees/me/tickets', {
    schema: {
      tags: ['Tickets'],
      summary: "List the authenticated user's tickets",
      security: [{ bearerAuth: [] }],
    },
    preHandler: requireAuth,
  }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { email: true } });
    return ticketsService.getTicketsForEventee(req.user!.id, user?.email ?? '');
  });

  // GET /eventees/me/tickets/:ticketId — single ticket with QR payload
  app.get<{ Params: { ticketId: string } }>('/eventees/me/tickets/:ticketId', {
    schema: {
      tags: ['Tickets'],
      summary: 'Get a single ticket (owner only) — includes qrPayload for QR display',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { ticketId: { type: 'string' } },
        required: ['ticketId'],
      },
    },
    preHandler: requireAuth,
  }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { email: true } });
    return ticketsService.getTicketById(req.params.ticketId, req.user!.id, user?.email ?? '');
  });

  // POST /tickets/:ticketId/refund — eventee or creator requests a refund
  app.post<{ Params: { ticketId: string } }>('/tickets/:ticketId/refund', {
    schema: {
      tags: ['Tickets'],
      summary: 'Refund a paid ticket (eventee or creator)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { ticketId: { type: 'string', format: 'uuid' } },
        required: ['ticketId'],
      },
      response: { 200: { type: 'object', properties: { message: { type: 'string' } } } },
    },
    preHandler: requireAuth,
  }, async (req) => {
    return ticketsService.refundTicket(req.params.ticketId, req.user!.id);
  });

  // GET /tickets/:ticketId/referral — get or create referral entry for a ticket
  // Returns the referral link and basic stats (how many referred orders)
  app.get<{ Params: { ticketId: string } }>('/tickets/:ticketId/referral', {
    schema: {
      tags: ['Tickets'],
      summary: 'Get referral info for a ticket (share & earn)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['ticketId'],
        properties: { ticketId: { type: 'string', format: 'uuid' } },
      },
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    const ticket = await prisma.ticket.findFirst({
      where: { id: req.params.ticketId, eventeeId: req.user!.id },
      include: { event: { select: { shareSlug: true, title: true } } },
    });
    if (!ticket) return reply.status(404).send({ message: 'Ticket not found.' });

    // Upsert referral record
    let referral = await prisma.referral.findUnique({ where: { ticketId: ticket.id } });
    if (!referral) {
      referral = await prisma.referral.create({
        data: { referrerId: req.user!.id, ticketId: ticket.id },
      });
    }

    const referredCount = await prisma.referral.count({
      where: { referrerId: req.user!.id, referredOrderId: { not: null } },
    });

    return {
      referralId:    referral.id,
      ticketId:      ticket.id,
      eventTitle:    ticket.event.title,
      referralLink:  `${process.env.APP_BASE_URL ?? ''}/e/${ticket.event.shareSlug}?ref=${ticket.id}`,
      referredCount,
      rewardPaid:    referral.rewardPaid,
      createdAt:     referral.createdAt,
    };
  });

  // GET /eventees/me/tickets/:ticketId/qr — returns a signed QR PNG for the ticket
  app.get<{ Params: { ticketId: string } }>('/eventees/me/tickets/:ticketId/qr', {
    schema: {
      tags: ['Tickets'],
      summary: 'Get signed QR code PNG for a ticket (owner only)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['ticketId'],
        properties: { ticketId: { type: 'string' } },
      },
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    const [ticket, user] = await Promise.all([
      prisma.ticket.findUnique({
        where: { id: req.params.ticketId },
        include: { event: { select: { id: true } }, order: { select: { buyerEmail: true } } },
      }),
      prisma.user.findUnique({ where: { id: req.user!.id }, select: { email: true } }),
    ]);
    if (!ticket) return reply.status(404).send({ message: 'Ticket not found' });
    const ownedByUser  = ticket.eventeeId === req.user!.id;
    const ownedByEmail = !ticket.eventeeId && ticket.order?.buyerEmail?.toLowerCase() === user?.email?.toLowerCase();
    if (!ownedByUser && !ownedByEmail) return reply.status(403).send({ message: 'Forbidden' });
    if (ticket.status === 'CANCELLED') return reply.status(409).send({ message: 'Ticket is cancelled' });

    const payload = qrService.sign(ticket.id, ticket.event.id);
    const png     = await qrService.generatePng(payload);

    reply.header('Content-Type', 'image/png');
    reply.header('Cache-Control', 'private, max-age=300');
    return reply.send(png);
  });

  // GET /tickets/:ticketId/qr.png — public QR image (no auth — ticketId is access token, payload is HMAC-signed)
  app.get<{ Params: { ticketId: string } }>('/tickets/:ticketId/qr.png', {
    schema: {
      tags: ['Tickets'],
      summary: 'Public QR code PNG for embedding in receipt emails',
      params: {
        type: 'object',
        required: ['ticketId'],
        properties: { ticketId: { type: 'string', format: 'uuid' } },
      },
    },
  }, async (req, reply) => {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.ticketId },
      include: { event: { select: { id: true } } },
    });
    if (!ticket || ticket.status === 'CANCELLED') return reply.status(404).send();

    const payload = qrService.sign(ticket.id, ticket.event.id);
    const png     = await qrService.generatePng(payload);

    reply.header('Content-Type', 'image/png');
    reply.header('Cache-Control', 'public, max-age=3600');
    return reply.send(png);
  });

  // POST /events/:id/checkin — scan QR code at the door (CREATOR / SCANNER role)
  app.post<{ Params: { id: string }; Body: { qrPayload: string } }>('/events/:id/checkin', {
    schema: {
      tags: ['Tickets'],
      summary: 'Verify a QR code and mark the ticket as checked in (CREATOR)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        required: ['qrPayload'],
        properties: {
          qrPayload: { type: 'string', description: 'Signed QR payload from the ticket' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ticket:          { type: 'object', additionalProperties: true },
            alreadyCheckedIn: { type: 'boolean' },
          },
        },
      },
    },
    preHandler: requireScannerOrCreator,
  }, async (req) => {
    return ticketsService.checkin(req.params.id, req.body.qrPayload, req.user!.id);
  });
}
