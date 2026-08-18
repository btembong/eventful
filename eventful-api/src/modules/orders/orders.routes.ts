import type { FastifyInstance } from 'fastify';
import { ordersService } from './orders.service';
import { requireAuth } from '@/middleware/auth.guard';

export default async function ordersRoutes(app: FastifyInstance) {

  // POST /events/:id/orders — create an order (free or paid)
  // Supports both authenticated users and guests (userId optional)
  app.post<{
    Params: { id: string };
    Body: {
      tierId:      string;
      quantity:    number;
      buyerName:   string;
      buyerEmail:  string;
      buyerPhone?: string;
      inviteCode?: string;
      seats?:      string[];
      sessionId?:  string;
    };
  }>('/events/:id/orders', {
    schema: {
      tags: ['Orders'],
      summary: 'Create an order for tickets (authenticated or guest)',
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['tierId', 'quantity', 'buyerName', 'buyerEmail'],
        properties: {
          tierId:     { type: 'string', format: 'uuid' },
          quantity:   { type: 'integer', minimum: 1, maximum: 20 },
          buyerName:  { type: 'string', minLength: 1 },
          buyerEmail: { type: 'string', format: 'email' },
          buyerPhone: { type: 'string' },
          inviteCode: { type: 'string' },
          seats:      { type: 'array', items: { type: 'string' } },
          sessionId:  { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            order:           { type: 'object', additionalProperties: true },
            paymentRequired: { type: 'boolean' },
            paymentUrl:      { type: 'string' },
            message:         { type: 'string' },
          },
        },
      },
    },
  }, async (req, reply) => {
    // req.user may be set if the Authorization header is present (optional auth)
    const userId = req.user?.id;

    const result = await ordersService.createOrder(req.params.id, {
      tierId:     req.body.tierId,
      quantity:   req.body.quantity,
      buyerName:  req.body.buyerName,
      buyerEmail: req.body.buyerEmail,
      buyerPhone: req.body.buyerPhone,
      userId,
      inviteCode: req.body.inviteCode,
      seats:      req.body.seats,
      sessionId:  req.body.sessionId,
    });

    return reply.status(201).send(result);
  });

  // GET /orders/:orderId — retrieve an order by UUID (no auth required — UUID is the secret)
  app.get<{ Params: { orderId: string } }>('/orders/:orderId', {
    schema: {
      tags: ['Orders'],
      summary: 'Get order details by ID (UUID serves as the access token)',
      params: {
        type: 'object',
        required: ['orderId'],
        properties: { orderId: { type: 'string', format: 'uuid' } },
      },
    },
  }, async (req, reply) => {
    const order = await import('@/lib/prisma').then(({ default: p }) =>
      p.order.findUnique({
        where: { id: req.params.orderId },
        select: {
          id: true, status: true, totalAmount: true, currency: true, quantity: true, createdAt: true,
          buyerName: true, buyerEmail: true,
          event: { select: { title: true, startsAt: true, venue: true, shareSlug: true } },
          tier:  { select: { name: true, type: true } },
          tickets: { select: { id: true, status: true } },
        },
      }),
    );
    if (!order) return reply.status(404).send({ message: 'Order not found' });
    return order;
  });

  // GET /users/me/orders — all orders for the authenticated user
  app.get('/users/me/orders', {
    schema: {
      tags: ['Orders'],
      summary: "List the authenticated user's orders",
      security: [{ bearerAuth: [] }],
    },
    preHandler: requireAuth,
  }, async (req) => {
    return ordersService.getUserOrders(req.user!.id);
  });

  // POST /orders/:orderId/resend-receipt — directly send receipt email, bypassing BullMQ (debug/recovery)
  app.post<{ Params: { orderId: string } }>('/orders/:orderId/resend-receipt', {
    schema: {
      tags: ['Orders'],
      summary: 'Force-send receipt email for all tickets in a PAID order (no auth — UUID is the secret)',
      params: {
        type: 'object',
        required: ['orderId'],
        properties: { orderId: { type: 'string', format: 'uuid' } },
      },
    },
  }, async (req, reply) => {
    const prisma = (await import('@/lib/prisma')).default;
    const { notificationsService } = await import('@/modules/notifications/notifications.service');
    const { tplReceipt } = await import('@/modules/notifications/email-templates');
    const { qrService } = await import('@/lib/qr');
    const { generateTicketPdf } = await import('@/lib/ticket-pdf');

    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: {
        tickets: {
          include: {
            eventee: { select: { email: true, fullName: true } },
            event:   { select: { id: true, title: true, venue: true, startsAt: true, price: true, currency: true, confirmationMessage: true } },
          },
        },
        tier: { select: { name: true } },
      },
    });

    if (!order) return reply.status(404).send({ message: 'Order not found' });
    if (order.status !== 'PAID') return reply.status(400).send({ message: 'Order is not PAID' });

    const results: { ticketId: string; email: string; ok: boolean; error?: string }[] = [];

    for (const ticket of order.tickets) {
      const recipientEmail = ticket.eventee?.email ?? order.buyerEmail;
      const recipientName  = ticket.eventee?.fullName ?? order.buyerName ?? 'Guest';

      if (!recipientEmail) {
        results.push({ ticketId: ticket.id, email: '(none)', ok: false, error: 'No email address' });
        continue;
      }

      try {
        const qrPayload   = qrService.sign(ticket.id, ticket.event.id);
        const qrPngBuffer = await qrService.generatePng(qrPayload);
        const qrBase64    = qrPngBuffer.toString('base64');

        const pdfBuffer = await generateTicketPdf({
          fullName:   recipientName,
          eventTitle: ticket.event.title,
          venue:      ticket.event.venue,
          startsAt:   ticket.event.startsAt,
          price:      ticket.event.price.toString(),
          currency:   ticket.event.currency,
          ticketId:   ticket.id,
          qrPngBuffer,
          confirmationMessage: ticket.event.confirmationMessage ?? undefined,
        });

        await notificationsService.sendEmail(
          recipientEmail,
          `Your ticket for "${ticket.event.title}" is confirmed`,
          tplReceipt({
            fullName:   recipientName,
            eventTitle: ticket.event.title,
            venue:      ticket.event.venue,
            startsAt:   ticket.event.startsAt,
            price:      ticket.event.price.toString(),
            currency:   ticket.event.currency,
            ticketId:   ticket.id,
            qrBase64,
            confirmationMessage: ticket.event.confirmationMessage ?? undefined,
          }),
          [{ content: pdfBuffer.toString('base64'), name: `ticket-${ticket.id.split('-')[0]}.pdf` }],
        );

        results.push({ ticketId: ticket.id, email: recipientEmail, ok: true });
      } catch (err) {
        results.push({ ticketId: ticket.id, email: recipientEmail, ok: false, error: (err as Error).message });
      }
    }

    return reply.send({ results });
  });

  // POST /orders/:orderId/verify — manually verify payment with Tranzak (no auth — UUID is the secret)
  app.post<{ Params: { orderId: string } }>('/orders/:orderId/verify', {
    schema: {
      tags: ['Orders'],
      summary: 'Verify payment status directly with Tranzak and mark order PAID if confirmed',
      params: {
        type: 'object',
        required: ['orderId'],
        properties: { orderId: { type: 'string', format: 'uuid' } },
      },
    },
  }, async (req, reply) => {
    const result = await ordersService.verifyPayment(req.params.orderId);
    return reply.send(result);
  });

  // GET /orders/mine — alias for /users/me/orders (used by attendee support UI)
  app.get('/orders/mine', {
    schema: {
      tags: ['Orders'],
      summary: "List the authenticated user's orders (alias)",
      security: [{ bearerAuth: [] }],
    },
    preHandler: requireAuth,
  }, async (req) => {
    return ordersService.getUserOrders(req.user!.id);
  });
}
