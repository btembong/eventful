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
        select: { id: true, status: true, totalAmount: true, currency: true, quantity: true, createdAt: true },
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
