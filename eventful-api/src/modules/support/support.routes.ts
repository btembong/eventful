import type { FastifyInstance } from 'fastify';
import { requireAuth } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';

export default async function attendeeSupportRoutes(app: FastifyInstance) {

  // GET /support — list the authenticated user's support tickets
  app.get('/support', {
    schema: {
      tags: ['Support'],
      summary: "List the authenticated user's support tickets",
      security: [{ bearerAuth: [] }],
    },
    preHandler: requireAuth,
  }, async (req) => {
    const tickets = await prisma.supportTicket.findMany({
      where:   { buyerId: req.user!.id },
      include: {
        order:    { include: { event: { select: { title: true } } } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return tickets.map((t) => ({
      id:         t.id,
      subject:    t.subject,
      status:     t.status,
      eventTitle: t.order.event.title,
      createdAt:  t.createdAt,
      updatedAt:  t.updatedAt,
      messages:   t.messages,
    }));
  });

  // POST /support — create a new support ticket
  app.post<{
    Body: { orderId: string; subject: string; body: string };
  }>('/support', {
    schema: {
      tags: ['Support'],
      summary: 'Create a support ticket for an order',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['orderId', 'subject', 'body'],
        properties: {
          orderId: { type: 'string', format: 'uuid' },
          subject: { type: 'string', minLength: 1, maxLength: 150 },
          body:    { type: 'string', minLength: 1, maxLength: 2000 },
        },
      },
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    const { orderId, subject, body: message } = req.body;

    // Verify the order belongs to this user
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.user!.id },
      include: { event: { select: { title: true } } },
    });
    if (!order) return reply.status(404).send({ message: 'Order not found.' });

    const ticket = await prisma.supportTicket.create({
      data: {
        buyerId: req.user!.id,
        orderId,
        subject,
        messages: {
          create: {
            body:        message,
            fromCreator: false,
          },
        },
      },
      include: {
        order:    { include: { event: { select: { title: true } } } },
        messages: true,
      },
    });

    return reply.status(201).send({
      id:         ticket.id,
      subject:    ticket.subject,
      status:     ticket.status,
      eventTitle: ticket.order.event.title,
      createdAt:  ticket.createdAt,
      updatedAt:  ticket.updatedAt,
      messages:   ticket.messages,
    });
  });

  // POST /support/:id/messages — attendee adds a follow-up message
  app.post<{
    Params: { id: string };
    Body:   { body: string };
  }>('/support/:id/messages', {
    schema: {
      tags: ['Support'],
      summary: 'Add a message to an existing support ticket',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['body'],
        properties: { body: { type: 'string', minLength: 1, maxLength: 2000 } },
      },
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, buyerId: req.user!.id },
    });
    if (!ticket) return reply.status(404).send({ message: 'Ticket not found.' });

    if (ticket.status === 'CLOSED') {
      return reply.status(400).send({ message: 'Cannot reply to a closed ticket.' });
    }

    const message = await prisma.supportMessage.create({
      data: {
        ticketId:    req.params.id,
        body:        req.body.body,
        fromCreator: false,
      },
    });

    return reply.status(201).send(message);
  });
}
