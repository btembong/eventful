import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { bootcampService } from './bootcamp.service';
import { requireAuth, requireRole } from '@/middleware/auth.guard';

const applySchema = z.object({
  fullName:           z.string().min(2).max(100),
  email:              z.string().email(),
  phone:              z.string().min(6).max(30),
  country:            z.string().min(2).max(80),
  background:         z.enum(['zero', 'basics', 'js', 'other']),
  goal:               z.string().max(500).optional(),
  paymentPlan:        z.enum(['FULL', 'INSTALLMENT']),
  paymentMethod:      z.string().min(2).max(80),
  referral:           z.string().max(200).optional(),
  referralCodeUsed:   z.string().max(20).optional(),
  proofOfPayment:     z.string().optional(),      // base64
  proofOfPaymentName: z.string().max(200).optional(),
});

const bootcampRoutes: FastifyPluginAsync = async (app) => {

  // ── GET /bootcamp/stats — public ───────────────────────────────────────────
  app.get('/stats', async (_req, reply) => {
    const stats = await bootcampService.getStats();
    return reply.send(stats);
  });

  // ── POST /bootcamp/apply — public ──────────────────────────────────────────
  app.post('/apply', async (req, reply) => {
    const parsed = applySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', issues: parsed.error.flatten() });
    }
    const application = await bootcampService.apply(parsed.data);
    return reply.status(201).send({
      id:      application.id,
      message: 'Application received. Check your email for next steps.',
    });
  });

  // ── GET /bootcamp/referral/validate/:code — public ─────────────────────────
  app.get('/referral/validate/:code', async (req, reply) => {
    const { code } = req.params as { code: string };
    const record   = await bootcampService.validateReferralCode(code);
    if (!record) return reply.status(404).send({ error: 'Invalid referral code' });
    return reply.send({ code: record.code, ownerName: record.ownerName });
  });

  // ── GET /bootcamp/referral/stats/:code — public ────────────────────────────
  app.get('/referral/stats/:code', async (req, reply) => {
    const { code } = req.params as { code: string };
    const stats    = await bootcampService.getReferralStats(code);
    if (!stats) return reply.status(404).send({ error: 'Referral code not found' });
    return reply.send(stats);
  });

  // ── GET /bootcamp/applications — admin only ────────────────────────────────
  app.get('/applications', {
    preHandler: [requireAuth, requireRole('ADMIN')],
  }, async (req, reply) => {
    const { status, cohort } = req.query as { status?: string; cohort?: string };
    const applications = await bootcampService.listApplications({ status, cohort });
    return reply.send(applications);
  });

  // ── GET /bootcamp/applications/:id — admin only ────────────────────────────
  app.get('/applications/:id', {
    preHandler: [requireAuth, requireRole('ADMIN')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const app    = await bootcampService.getApplication(id);
    if (!app) return reply.status(404).send({ error: 'Not found' });
    return reply.send(app);
  });

  // ── PATCH /bootcamp/applications/:id — admin only ─────────────────────────
  app.patch('/applications/:id', {
    preHandler: [requireAuth, requireRole('ADMIN')],
  }, async (req, reply) => {
    const { id }                 = req.params as { id: string };
    const { status, adminNotes } = req.body as { status?: string; adminNotes?: string };
    const valid = ['PENDING', 'ACCEPTED', 'PAID', 'REJECTED'];
    if (status && !valid.includes(status)) {
      return reply.status(400).send({ error: 'Invalid status' });
    }
    const updated = await bootcampService.updateStatus(id, status ?? 'PENDING', adminNotes);
    return reply.send(updated);
  });
};

export default bootcampRoutes;
