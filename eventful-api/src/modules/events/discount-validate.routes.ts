import type { FastifyInstance } from 'fastify';
import prisma from '@/lib/prisma';

// POST /events/:id/discounts/validate — public endpoint, no auth required
export default async function discountValidateRoutes(app: FastifyInstance) {
  app.post<{
    Params: { id: string };
    Body:   { code: string; orderAmount: number };
  }>('/:id/discounts/validate', {
    schema: {
      tags: ['Events'],
      summary: 'Validate a discount code for an event at checkout',
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['code', 'orderAmount'],
        properties: {
          code:        { type: 'string', minLength: 1 },
          orderAmount: { type: 'number', minimum: 0 },
        },
      },
    },
  }, async (req, reply) => {
    const { id: eventId } = req.params;
    const { code, orderAmount } = req.body;

    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { creatorId: true },
    });
    if (!event) return reply.status(404).send({ valid: false, message: 'Event not found.' });

    const upper = code.toUpperCase().trim();

    const discount = await prisma.discountCode.findFirst({
      where: {
        code:      upper,
        creatorId: event.creatorId,
        isActive:  true,
        OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
          {
            OR: [
              { eventIds: { isEmpty: true } },
              { eventIds: { has: eventId } },
            ],
          },
        ],
      },
    });

    if (!discount) {
      return reply.status(404).send({ valid: false, message: 'Invalid or expired discount code.' });
    }

    if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
      return reply.status(400).send({ valid: false, message: 'This code has reached its usage limit.' });
    }

    if (discount.minOrderAmount !== null && orderAmount < discount.minOrderAmount) {
      return reply.status(400).send({
        valid:   false,
        message: `Minimum order amount for this code is ${discount.minOrderAmount}.`,
      });
    }

    const discountAmount = discount.type === 'PERCENT'
      ? Math.round(orderAmount * (discount.value / 100) * 100) / 100
      : Math.min(discount.value, orderAmount);

    return {
      valid:          true,
      discountCodeId: discount.id,
      type:           discount.type,
      value:          discount.value,
      discountAmount,
      finalAmount:    Math.max(0, orderAmount - discountAmount),
    };
  });
}
