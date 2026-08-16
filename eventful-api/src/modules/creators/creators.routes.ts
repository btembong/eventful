import type { FastifyInstance } from 'fastify';
import { eventsService } from '@/modules/events/events.service';
import { requireCreator } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';

// All creator-scoped views live here, mounted at /creators.
// Analytics endpoints will be added here in a later phase.

const paginationQuery = {
  page:  { type: 'integer', minimum: 1, default: 1 },
  limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
};

export default async function creatorsRoutes(app: FastifyInstance) {
  // GET /creators/me/events — list all events created by the authenticated user
  app.get<{ Querystring: { page?: number; limit?: number } }>('/me/events', {
    schema: {
      tags: ['Creators'],
      summary: "List the authenticated creator's events",
      security: [{ bearerAuth: [] }],
      querystring: { type: 'object', properties: paginationQuery },
    },
    preHandler: requireCreator,
  }, async (req) => {
    const { page, limit } = req.query;
    return eventsService.getCreatorEvents(req.user!.id, page, limit);
  });

  // GET /creators/me/profile — fetch KYC + payout status
  app.get('/me/profile', {
    schema: {
      tags: ['Creators'],
      summary: "Get the authenticated creator's KYC and payout profile",
      security: [{ bearerAuth: [] }],
    },
    preHandler: requireCreator,
  }, async (req) => {
    return prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: {
        orgName: true, orgType: true, orgPhone: true, orgWebsite: true, orgDescription: true,
        kycDocType: true, kycDocUrl: true,
        payoutType: true, payoutNumber: true, payoutBankName: true,
        creatorStatus: true,
      },
    });
  });

  // PATCH /creators/me/profile — update KYC doc and/or payout method
  app.patch<{
    Body: {
      kycDocType?: string;
      kycDocUrl?:  string;
      payoutType?:     'MTN_MOMO' | 'ORANGE_MONEY' | 'BANK_TRANSFER';
      payoutNumber?:   string;
      payoutBankName?: string;
    };
  }>('/me/profile', {
    schema: {
      tags: ['Creators'],
      summary: "Update the authenticated creator's KYC and payout details",
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          kycDocType:    { type: 'string', minLength: 2 },
          kycDocUrl:     { type: 'string', minLength: 5 },
          payoutType:    { type: 'string', enum: ['MTN_MOMO', 'ORANGE_MONEY', 'BANK_TRANSFER'] },
          payoutNumber:  { type: 'string', minLength: 6 },
          payoutBankName: { type: 'string' },
        },
      },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const { kycDocType, kycDocUrl, payoutType, payoutNumber, payoutBankName } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(kycDocType    !== undefined && { kycDocType }),
        ...(kycDocUrl     !== undefined && { kycDocUrl }),
        ...(payoutType    !== undefined && { payoutType }),
        ...(payoutNumber  !== undefined && { payoutNumber }),
        ...(payoutBankName !== undefined && { payoutBankName }),
      },
      select: { kycDocType: true, kycDocUrl: true, payoutType: true, payoutNumber: true, payoutBankName: true },
    });
    return reply.send(updated);
  });

  // GET /creators/me/events/:id/attendees — ticket list for one event (ownership enforced)
  app.get<{ Params: { id: string }; Querystring: { page?: number; limit?: number } }>(
    '/me/events/:id/attendees',
    {
      schema: {
        tags: ['Creators'],
        summary: 'List attendees (tickets) for a specific event',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
        querystring: {
          type: 'object',
          properties: { ...paginationQuery, limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 } },
        },
      },
      preHandler: requireCreator,
    },
    async (req) => {
      const { page, limit } = req.query;
      return eventsService.getEventAttendees(req.params.id, req.user!.id, page, limit);
    },
  );
}
