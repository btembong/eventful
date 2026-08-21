import type { FastifyInstance } from 'fastify';
import { requireAuth, requireRole } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';

// ─── Body types ────────────────────────────────────────────────────────────

interface ApplyBody {
  orgName: string;
  orgType: 'INDIVIDUAL' | 'COMPANY' | 'NGO';
  orgPhone: string;
  orgWebsite?: string;
  orgDescription: string;
}

interface ReviewBody {
  action: 'approve' | 'reject';
  rejectedReason?: string;
}

// ─── Routes ────────────────────────────────────────────────────────────────

export default async function creatorApplicationRoutes(app: FastifyInstance) {

  // POST /creators/apply — submit application (authenticated, any role)
  app.post<{ Body: ApplyBody }>('/apply', {
    schema: {
      tags: ['Creators'],
      summary: 'Submit a creator onboarding application',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['orgName', 'orgType', 'orgPhone', 'orgDescription'],
        properties: {
          orgName:        { type: 'string', minLength: 2 },
          orgType:        { type: 'string', enum: ['INDIVIDUAL', 'COMPANY', 'NGO'] },
          orgPhone:       { type: 'string', minLength: 8 },
          orgWebsite:     { type: 'string' },
          orgDescription: { type: 'string', minLength: 10 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            creatorStatus: { type: 'string' },
            message:       { type: 'string' },
          },
        },
      },
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: { creatorStatus: true } });

    if (user.creatorStatus === 'APPROVED') {
      return reply.status(400).send({ message: 'Your creator account is already approved.' });
    }
    if (user.creatorStatus === 'PENDING') {
      // Auto-approve the pending application immediately
    }

    const { orgName, orgType, orgPhone, orgWebsite, orgDescription } = req.body;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user!.id },
        data: {
          creatorStatus:    'APPROVED',
          roles:            { push: 'CREATOR' },
          orgName,
          orgType,
          orgPhone,
          orgWebsite,
          orgDescription,
          creatorAppliedAt:  new Date(),
          creatorReviewedAt: new Date(),
          creatorRejectedReason: null,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId:    req.user!.id,
          action:     'creator.approved',
          entityType: 'User',
          entityId:   req.user!.id,
          meta:       { autoApproved: true },
        },
      }),
    ]);

    return reply.send({ creatorStatus: 'APPROVED', message: 'Your creator account is approved. Verify your email to start creating events.' });
  });

  // GET /creators/application — get own application status
  app.get('/application', {
    schema: {
      tags: ['Creators'],
      summary: 'Get current creator application status',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            creatorStatus:         { type: 'string' },
            orgName:               { type: 'string', nullable: true },
            orgType:               { type: 'string', nullable: true },
            creatorAppliedAt:      { type: 'string', nullable: true },
            creatorRejectedReason: { type: 'string', nullable: true },
          },
        },
      },
    },
    preHandler: requireAuth,
  }, async (req) => {
    return prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: { creatorStatus: true, orgName: true, orgType: true, creatorAppliedAt: true, creatorRejectedReason: true },
    });
  });

  // PUT /creators/admin/:userId/review — admin approves or rejects
  app.put<{ Params: { userId: string }; Body: ReviewBody }>('/admin/:userId/review', {
    schema: {
      tags: ['Creators'],
      summary: 'Admin: approve or reject a creator application',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['userId'],
        properties: { userId: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['action'],
        properties: {
          action:          { type: 'string', enum: ['approve', 'reject'] },
          rejectedReason:  { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: { creatorStatus: { type: 'string' } },
        },
      },
    },
    preHandler: requireRole('ADMIN'),
  }, async (req, reply) => {
    const { userId } = req.params;
    const { action, rejectedReason } = req.body;

    if (action === 'reject' && !rejectedReason) {
      return reply.status(400).send({ message: 'rejectedReason is required when rejecting an application.' });
    }

    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          creatorStatus:         action === 'approve' ? 'APPROVED' : 'REJECTED',
          // Add CREATOR role on approval
          ...(action === 'approve' ? { roles: { push: 'CREATOR' } } : {}),
          creatorRejectedReason: action === 'reject' ? rejectedReason : null,
          creatorReviewedAt:     new Date(),
        },
        select: { creatorStatus: true },
      }),
      prisma.auditLog.create({
        data: {
          actorId:    req.user!.id,
          action:     action === 'approve' ? 'creator.approved' : 'creator.rejected',
          entityType: 'User',
          entityId:   userId,
          meta:       action === 'reject' ? { reason: rejectedReason } : undefined,
        },
      }),
    ]);

    return { creatorStatus: user.creatorStatus };
  });

  // GET /creators/admin/applications — list applications by status (admin only)
  app.get<{ Querystring: { status?: string } }>('/admin/applications', {
    schema: {
      tags: ['Creators'],
      summary: 'Admin: list creator applications by status (PENDING | APPROVED | REJECTED)',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: { status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' } },
      },
    },
    preHandler: requireRole('ADMIN'),
  }, async (req) => {
    const status = req.query.status ?? 'PENDING';
    return prisma.user.findMany({
      where: { creatorStatus: status as 'PENDING' | 'APPROVED' | 'REJECTED', deletedAt: null },
      select: {
        id: true, fullName: true, email: true, phone: true,
        orgName: true, orgType: true, orgPhone: true, orgWebsite: true, orgDescription: true,
        kycDocType: true, kycDocUrl: true,
        payoutType: true, payoutNumber: true, payoutBankName: true,
        creatorAppliedAt: true, creatorReviewedAt: true, creatorRejectedReason: true,
      },
      orderBy: { creatorAppliedAt: 'asc' },
    });
  });
}
