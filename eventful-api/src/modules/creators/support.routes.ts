import type { FastifyInstance } from 'fastify';
import { requireCreator } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';

export default async function creatorSupportRoutes(app: FastifyInstance) {

  // GET /creators/me/support — all support tickets for the creator's events
  app.get<{ Querystring: { status?: string; page?: number; limit?: number } }>('/me/support', {
    schema: {
      tags: ['Creators'],
      summary: "List support tickets for the creator's events",
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] },
          page:   { type: 'integer', minimum: 1, default: 1 },
          limit:  { type: 'integer', minimum: 1, maximum: 100, default: 30 },
        },
      },
    },
    preHandler: requireCreator,
  }, async (req) => {
    const { status, page = 1, limit = 30 } = req.query;

    const where = {
      order: { event: { creatorId: req.user!.id } },
      ...(status ? { status: status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' } : {}),
    };

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          buyer:    { select: { fullName: true, email: true } },
          order:    { include: { event: { select: { title: true } } } },
          messages: { orderBy: { createdAt: 'asc' } },
          _count:   { select: { messages: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    const shaped = tickets.map((t) => ({
      id:         t.id,
      subject:    t.subject,
      status:     t.status,
      eventTitle: t.order.event.title,
      buyerName:  t.buyer.fullName,
      buyerEmail: t.buyer.email,
      createdAt:  t.createdAt,
      updatedAt:  t.updatedAt,
      messages:   t.messages,
      _count:     t._count,
    }));

    return { tickets: shaped, total, page, limit };
  });

  // PATCH /creators/me/support/:id — change ticket status
  app.patch<{
    Params: { id: string };
    Body:   { status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' };
  }>('/me/support/:id', {
    schema: {
      tags: ['Creators'],
      summary: 'Update a support ticket status',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] },
        },
      },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, order: { event: { creatorId: req.user!.id } } },
    });
    if (!ticket) return reply.status(404).send({ message: 'Ticket not found.' });

    const updated = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data:  { status: req.body.status },
    });

    return updated;
  });

  // POST /creators/me/support/:id/messages — reply to a ticket
  app.post<{
    Params: { id: string };
    Body:   { body: string };
  }>('/me/support/:id/messages', {
    schema: {
      tags: ['Creators'],
      summary: 'Send a reply to a support ticket',
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
    preHandler: requireCreator,
  }, async (req, reply) => {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, order: { event: { creatorId: req.user!.id } } },
    });
    if (!ticket) return reply.status(404).send({ message: 'Ticket not found.' });

    // Move ticket to in-progress when creator replies
    const [message] = await prisma.$transaction([
      prisma.supportMessage.create({
        data: {
          ticketId:    req.params.id,
          body:        req.body.body,
          fromCreator: true,
        },
      }),
      ...(ticket.status === 'OPEN'
        ? [prisma.supportTicket.update({
            where: { id: req.params.id },
            data:  { status: 'IN_PROGRESS' },
          })]
        : []),
    ]);

    return reply.status(201).send(message);
  });
}
