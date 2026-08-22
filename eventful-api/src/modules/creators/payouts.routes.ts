import type { FastifyInstance } from 'fastify';
import { requireCreator, requireRole } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// ── KYC guard helper ──────────────────────────────────────────────────────────
async function requireKyc(req: any, reply: any) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { kycStatus: true },
  });
  if (!user || user.kycStatus !== 'APPROVED') {
    return reply.status(403).send({
      error: 'KYC_REQUIRED',
      message: 'Complete identity verification before accessing payouts.',
      kycStatus: user?.kycStatus ?? 'PENDING',
    });
  }
}

export default async function payoutsRoutes(app: FastifyInstance) {

  // GET /creators/me/payouts — creator sees their payout history
  app.get('/me/payouts', {
    schema: {
      tags: ['Payouts'],
      summary: 'List payouts for the authenticated creator',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page:  { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
        },
      },
    },
    preHandler: [requireCreator, requireKyc],
  }, async (req) => {
    const { page = 1, limit = 20 } = req.query as { page?: number; limit?: number };
    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where: { creatorId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payout.count({ where: { creatorId: req.user!.id } }),
    ]);
    return { payouts, total, page, limit, pages: Math.ceil(total / limit) };
  });

  // GET /creators/me/earnings — summary of earned vs pending payout
  app.get('/me/earnings', {
    schema: {
      tags: ['Payouts'],
      summary: 'Earnings summary for the authenticated creator',
      security: [{ bearerAuth: [] }],
    },
    preHandler: requireCreator,
  }, async (req) => {
    const creatorId = req.user!.id;

    // Sum of all PAID payments for this creator's events, minus platform fee
    const agg = await prisma.payment.aggregate({
      where: { event: { creatorId }, status: 'success' },
      _sum: { amount: true, platformFee: true },
    });

    const gross      = parseFloat((agg._sum.amount    ?? 0).toString());
    const fees       = parseFloat((agg._sum.platformFee ?? 0).toString());
    const net        = gross - fees;

    // Total already paid out
    const paidOut = await prisma.payout.aggregate({
      where: { creatorId, status: 'paid' },
      _sum: { amount: true },
    });
    const totalPaidOut = parseFloat((paidOut._sum.amount ?? 0).toString());

    return {
      grossRevenue:  gross,
      platformFees:  fees,
      netRevenue:    net,
      totalPaidOut,
      pendingPayout: net - totalPaidOut,
    };
  });

  // POST /creators/admin/payouts/generate — admin triggers a payout run
  // Generates Payout rows for all creators with unpaid balance in the period
  app.post<{
    Body: { periodStart: string; periodEnd: string; currency?: string };
  }>('/admin/payouts/generate', {
    schema: {
      tags: ['Payouts'],
      summary: 'Admin: generate payout batch for a period',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['periodStart', 'periodEnd'],
        properties: {
          periodStart: { type: 'string', format: 'date-time' },
          periodEnd:   { type: 'string', format: 'date-time' },
          currency:    { type: 'string', default: 'XAF' },
        },
      },
    },
    preHandler: requireRole('ADMIN'),
  }, async (req, reply) => {
    const { periodStart, periodEnd, currency = 'XAF' } = req.body;
    const start = new Date(periodStart);
    const end   = new Date(periodEnd);

    // Aggregate net earnings per creator in the period
    const rows = await prisma.payment.groupBy({
      by: ['eventId'],
      where: { status: 'success', paidAt: { gte: start, lte: end }, currency },
      _sum: { amount: true, platformFee: true },
    });

    if (rows.length === 0) return reply.send({ message: 'No payments in period', created: 0 });

    // Map eventId → creatorId
    const eventIds = rows.map((r) => r.eventId);
    const events   = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: { id: true, creatorId: true },
    });
    const eventCreator = new Map(events.map((e) => [e.id, e.creatorId]));

    // Sum per creator
    const creatorTotals = new Map<string, number>();
    for (const row of rows) {
      const creatorId = eventCreator.get(row.eventId);
      if (!creatorId) continue;
      const gross = parseFloat((row._sum.amount    ?? 0).toString());
      const fee   = parseFloat((row._sum.platformFee ?? 0).toString());
      const net   = gross - fee;
      creatorTotals.set(creatorId, (creatorTotals.get(creatorId) ?? 0) + net);
    }

    // Deduct already-paid payouts in this period
    const payoutData: Prisma.PayoutCreateManyInput[] = [];
    for (const [creatorId, amount] of creatorTotals) {
      if (amount <= 0) continue;
      payoutData.push({
        creatorId,
        amount: parseFloat(amount.toFixed(2)),
        currency,
        status:      'pending',
        periodStart: start,
        periodEnd:   end,
      });
    }

    const { count } = await prisma.payout.createMany({ data: payoutData });
    return reply.status(201).send({ message: 'Payout batch created', created: count });
  });

  // PUT /creators/admin/payouts/:id/status — admin marks a payout as paid/failed
  app.put<{ Params: { id: string }; Body: { status: 'paid' | 'failed' } }>('/admin/payouts/:id/status', {
    schema: {
      tags: ['Payouts'],
      summary: 'Admin: update payout status',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string', enum: ['paid', 'failed'] } },
      },
    },
    preHandler: requireRole('ADMIN'),
  }, async (req, reply) => {
    const payout = await prisma.payout.findUnique({ where: { id: req.params.id } });
    if (!payout) return reply.status(404).send({ error: 'Payout not found' });

    const updated = await prisma.payout.update({
      where: { id: req.params.id },
      data: {
        status:      req.body.status,
        processedAt: new Date(),
      },
    });
    return updated;
  });
}
