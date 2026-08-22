import type { FastifyInstance } from 'fastify';
import { requireCreator, requireRole } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';

const KYC_FIELDS = {
  kycStatus: true,
  kycSubmittedAt: true,
  kycReviewedAt: true,
  kycRejectedReason: true,
  kycDateOfBirth: true,
  kycAddress: true,
  kycDocType: true,
  kycIdNumber: true,
  kycDocUrl: true,
  kycDocBackUrl: true,
  payoutType: true,
  payoutNumber: true,
  payoutBankName: true,
  payoutAccountHolder: true,
  payoutBranch: true,
} as const;

export default async function kycRoutes(app: FastifyInstance) {

  // ── GET /creators/me/kyc ───────────────────────────────────────────────────
  app.get('/me/kyc', {
    schema: {
      tags: ['KYC'],
      summary: 'Get KYC status and submitted data for the authenticated creator',
      security: [{ bearerAuth: [] }],
    },
    preHandler: requireCreator,
  }, async (req) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: KYC_FIELDS,
    });
    return user;
  });

  // ── PUT /creators/me/kyc ───────────────────────────────────────────────────
  // Submit or update KYC data. Sets status to SUBMITTED.
  app.put<{
    Body: {
      kycDateOfBirth?: string;
      kycAddress?: string;
      kycDocType?: string;
      kycIdNumber?: string;
      kycDocUrl?: string;
      kycDocBackUrl?: string;
      payoutType?: string;
      payoutNumber?: string;
      payoutBankName?: string;
      payoutAccountHolder?: string;
      payoutBranch?: string;
    };
  }>('/me/kyc', {
    schema: {
      tags: ['KYC'],
      summary: 'Submit KYC identity + payout details',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          kycDateOfBirth:     { type: 'string' },
          kycAddress:         { type: 'string' },
          kycDocType:         { type: 'string', enum: ['PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE'] },
          kycIdNumber:        { type: 'string' },
          kycDocUrl:          { type: 'string' },
          kycDocBackUrl:      { type: 'string' },
          payoutType:         { type: 'string', enum: ['MTN_MOMO', 'ORANGE_MONEY', 'BANK_TRANSFER'] },
          payoutNumber:       { type: 'string' },
          payoutBankName:     { type: 'string' },
          payoutAccountHolder:{ type: 'string' },
          payoutBranch:       { type: 'string' },
        },
      },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const current = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { kycStatus: true },
    });

    // Already approved — don't allow re-submission unless rejected
    if (current?.kycStatus === 'APPROVED') {
      return reply.status(409).send({ message: 'KYC already approved.' });
    }

    const {
      kycDateOfBirth, kycAddress, kycDocType, kycIdNumber,
      kycDocUrl, kycDocBackUrl,
      payoutType, payoutNumber, payoutBankName, payoutAccountHolder, payoutBranch,
    } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        kycDateOfBirth,
        kycAddress,
        kycDocType,
        kycIdNumber,
        kycDocUrl,
        kycDocBackUrl,
        payoutType:          payoutType as any,
        payoutNumber,
        payoutBankName,
        payoutAccountHolder,
        payoutBranch,
        kycStatus:           'SUBMITTED',
        kycSubmittedAt:      new Date(),
        kycRejectedReason:   null,
      },
      select: KYC_FIELDS,
    });

    return reply.status(200).send(updated);
  });

  // ── GET /creators/admin/kyc ────────────────────────────────────────────────
  // Admin: list KYC submissions filtered by status
  app.get<{ Querystring: { status?: string; page?: number; limit?: number } }>('/admin/kyc', {
    schema: {
      tags: ['KYC'],
      summary: 'Admin: list KYC submissions',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED'] },
          page:   { type: 'integer', default: 1 },
          limit:  { type: 'integer', default: 20 },
        },
      },
    },
    preHandler: requireRole('ADMIN'),
  }, async (req) => {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {
      deletedAt: null,
      creatorStatus: 'APPROVED' as const,
      ...(status ? { kycStatus: status as any } : {}),
    };
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, fullName: true, email: true, orgName: true, orgType: true,
          ...KYC_FIELDS,
          createdAt: true,
        },
        orderBy: { kycSubmittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    return { users, total, page, limit };
  });

  // ── PATCH /creators/admin/kyc/:userId/status ───────────────────────────────
  // Admin: approve or reject a KYC submission
  app.patch<{
    Params: { userId: string };
    Body: { status: 'APPROVED' | 'REJECTED'; reason?: string };
  }>('/admin/kyc/:userId/status', {
    schema: {
      tags: ['KYC'],
      summary: 'Admin: approve or reject a KYC submission',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['userId'],
        properties: { userId: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
          reason: { type: 'string' },
        },
      },
    },
    preHandler: requireRole('ADMIN'),
  }, async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, kycStatus: true },
    });
    if (!user) return reply.status(404).send({ message: 'User not found' });

    const updated = await prisma.user.update({
      where: { id: req.params.userId },
      data: {
        kycStatus:          req.body.status,
        kycReviewedAt:      new Date(),
        kycRejectedReason:  req.body.status === 'REJECTED' ? (req.body.reason ?? 'Application rejected') : null,
      },
      select: { id: true, fullName: true, email: true, kycStatus: true, kycReviewedAt: true, kycRejectedReason: true },
    });
    return updated;
  });
}
