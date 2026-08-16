import type { FastifyInstance } from 'fastify';
import { requireCreator } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';

export default async function discountsRoutes(app: FastifyInstance) {

  // GET /creators/me/discounts
  app.get('/me/discounts', {
    schema: {
      tags: ['Creators'],
      summary: 'List discount codes for the authenticated creator',
      security: [{ bearerAuth: [] }],
    },
    preHandler: requireCreator,
  }, async (req) => {
    return prisma.discountCode.findMany({
      where: { creatorId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
  });

  // POST /creators/me/discounts
  app.post<{
    Body: {
      code: string;
      type: 'PERCENT' | 'FLAT';
      value: number;
      maxUses?: number;
      minOrderAmount?: number;
      startsAt?: string;
      expiresAt?: string;
      eventIds?: string[];
    };
  }>('/me/discounts', {
    schema: {
      tags: ['Creators'],
      summary: 'Create a discount code',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['code', 'type', 'value'],
        properties: {
          code:           { type: 'string', minLength: 1, maxLength: 50 },
          type:           { type: 'string', enum: ['PERCENT', 'FLAT'] },
          value:          { type: 'number', minimum: 0 },
          maxUses:        { type: 'integer', minimum: 1 },
          minOrderAmount: { type: 'number', minimum: 0 },
          startsAt:       { type: 'string', format: 'date-time' },
          expiresAt:      { type: 'string', format: 'date-time' },
          eventIds:       { type: 'array', items: { type: 'string' } },
        },
      },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const { code, type, value, maxUses, minOrderAmount, startsAt, expiresAt, eventIds } = req.body;

    const upper = code.toUpperCase().trim();

    const existing = await prisma.discountCode.findUnique({
      where: { creatorId_code: { creatorId: req.user!.id, code: upper } },
    });
    if (existing) return reply.status(409).send({ message: 'A discount with this code already exists.' });

    const discount = await prisma.discountCode.create({
      data: {
        creatorId:      req.user!.id,
        code:           upper,
        type,
        value,
        maxUses:        maxUses ?? null,
        minOrderAmount: minOrderAmount ?? null,
        startsAt:       startsAt ? new Date(startsAt) : null,
        expiresAt:      expiresAt ? new Date(expiresAt) : null,
        eventIds:       eventIds ?? [],
      },
    });

    return reply.status(201).send(discount);
  });

  // PATCH /creators/me/discounts/:id
  app.patch<{
    Params: { id: string };
    Body: { isActive?: boolean; maxUses?: number; expiresAt?: string };
  }>('/me/discounts/:id', {
    schema: {
      tags: ['Creators'],
      summary: 'Update a discount code (toggle active, change limits)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        properties: {
          isActive:  { type: 'boolean' },
          maxUses:   { type: 'integer', minimum: 1 },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const disc = await prisma.discountCode.findFirst({
      where: { id: req.params.id, creatorId: req.user!.id },
    });
    if (!disc) return reply.status(404).send({ message: 'Discount not found.' });

    const { isActive, maxUses, expiresAt } = req.body;
    const updated = await prisma.discountCode.update({
      where: { id: req.params.id },
      data: {
        ...(isActive  !== undefined ? { isActive }                         : {}),
        ...(maxUses   !== undefined ? { maxUses }                          : {}),
        ...(expiresAt !== undefined ? { expiresAt: new Date(expiresAt) }   : {}),
      },
    });

    return updated;
  });

  // DELETE /creators/me/discounts/:id
  app.delete<{ Params: { id: string } }>('/me/discounts/:id', {
    schema: {
      tags: ['Creators'],
      summary: 'Delete a discount code',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const disc = await prisma.discountCode.findFirst({
      where: { id: req.params.id, creatorId: req.user!.id },
    });
    if (!disc) return reply.status(404).send({ message: 'Discount not found.' });

    await prisma.discountCode.delete({ where: { id: req.params.id } });
    return reply.status(204).send();
  });

}
