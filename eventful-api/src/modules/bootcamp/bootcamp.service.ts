import prisma from '@/lib/prisma';
import { notificationsService } from '@/modules/notifications/notifications.service';
import { tplBootcampWelcome, tplBootcampAccepted } from '@/modules/notifications/email-templates';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateReferralCode(fullName: string): string {
  const first  = fullName.trim().split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${first}-${suffix}`;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ApplyInput {
  fullName:          string;
  email:             string;
  phone:             string;
  country:           string;
  background:        string;
  goal?:             string;
  paymentPlan:       'FULL' | 'INSTALLMENT';
  paymentMethod:     string;
  referral?:         string;
  referralCodeUsed?: string;
  proofOfPayment?:   string;  // base64
  proofOfPaymentName?: string;
}

// ─── Service ───────────────────────────────────────────────────────────────────

export const bootcampService = {

  async apply(input: ApplyInput) {
    // Prevent duplicate applications (same email, same cohort)
    const existing = await prisma.bootcampApplication.findFirst({
      where: { email: input.email.toLowerCase(), cohort: '2026-09' },
    });
    if (existing) {
      throw Object.assign(new Error('An application from this email already exists for this cohort.'), { statusCode: 409 });
    }

    // Validate referral code if provided
    if (input.referralCodeUsed) {
      const codeRecord = await prisma.bootcampReferralCode.findUnique({
        where: { code: input.referralCodeUsed.toUpperCase() },
      });
      if (!codeRecord) {
        throw Object.assign(new Error('Invalid referral code.'), { statusCode: 400 });
      }
    }

    const application = await prisma.bootcampApplication.create({
      data: {
        fullName:           input.fullName.trim(),
        email:              input.email.toLowerCase().trim(),
        phone:              input.phone.trim(),
        country:            input.country.trim(),
        background:         input.background,
        goal:               input.goal?.trim() ?? null,
        paymentPlan:        input.paymentPlan,
        paymentMethod:      input.paymentMethod,
        referral:           input.referral?.trim() ?? null,
        referralCodeUsed:   input.referralCodeUsed?.toUpperCase() ?? null,
        proofOfPayment:     input.proofOfPayment ?? null,
        proofOfPaymentName: input.proofOfPaymentName ?? null,
        cohort:             '2026-09',
        status:             'PENDING',
      },
    });

    // Fire welcome email — non-blocking
    notificationsService.sendEmail(
      application.email,
      'Your Bootcamp application is in! 🎉',
      tplBootcampWelcome({
        fullName:      application.fullName,
        paymentPlan:   application.paymentPlan,
        paymentMethod: application.paymentMethod,
        cohort:        application.cohort,
      }),
    ).catch(err => console.error('[bootcamp] Welcome email failed:', err.message));

    return application;
  },

  async listApplications(opts: { status?: string; cohort?: string } = {}) {
    return prisma.bootcampApplication.findMany({
      where: {
        ...(opts.status ? { status: opts.status as never } : {}),
        ...(opts.cohort ? { cohort: opts.cohort }         : {}),
      },
      include: { referralCode: { select: { ownerEmail: true, ownerName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async updateStatus(id: string, status: string, adminNotes?: string) {
    const updated = await prisma.bootcampApplication.update({
      where: { id },
      data:  { status: status as never, adminNotes },
    });

    // ── ACCEPTED: generate referral code + send acceptance email ───────────────
    if (status === 'ACCEPTED') {
      // Generate a unique referral code for this applicant
      let code = generateReferralCode(updated.fullName);
      // Ensure uniqueness (retry once on collision)
      const exists = await prisma.bootcampReferralCode.findUnique({ where: { code } });
      if (exists) code = generateReferralCode(updated.fullName);

      const refCode = await prisma.bootcampReferralCode.upsert({
        where:  { code },
        create: { code, ownerEmail: updated.email, ownerName: updated.fullName, cohort: updated.cohort },
        update: {},
      });

      notificationsService.sendEmail(
        updated.email,
        "You're accepted! Here's how to secure your seat",
        tplBootcampAccepted({
          fullName:      updated.fullName,
          paymentPlan:   updated.paymentPlan,
          paymentMethod: updated.paymentMethod,
          referralCode:  refCode.code,
        }),
      ).catch(err => console.error('[bootcamp] Acceptance email failed:', err.message));
    }

    // ── PAID: credit $30 to referrer ──────────────────────────────────────────
    if (status === 'PAID' && updated.referralCodeUsed) {
      await prisma.bootcampReferralCode.update({
        where: { code: updated.referralCodeUsed },
        data:  { totalEarnings: { increment: 30 } },
      }).catch(err => console.error('[bootcamp] Referral credit failed:', err.message));
    }

    return updated;
  },

  async getStats(cohort = '2026-09') {
    const TOTAL = 20;
    const applied = await prisma.bootcampApplication.count({
      where: { cohort, status: { not: 'REJECTED' } },
    });
    return { applied, total: TOTAL, remaining: Math.max(0, TOTAL - applied) };
  },

  async getApplication(id: string) {
    return prisma.bootcampApplication.findUnique({
      where:   { id },
      include: { referralCode: { select: { ownerEmail: true, ownerName: true, code: true } } },
    });
  },

  // ── Referral ────────────────────────────────────────────────────────────────

  async validateReferralCode(code: string) {
    return prisma.bootcampReferralCode.findUnique({
      where:  { code: code.toUpperCase() },
      select: { code: true, ownerName: true, ownerEmail: true, totalEarnings: true },
    });
  },

  async getReferralStats(code: string) {
    const record = await prisma.bootcampReferralCode.findUnique({
      where:   { code: code.toUpperCase() },
      include: {
        uses: {
          select: { id: true, fullName: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!record) return null;
    return {
      code:          record.code,
      ownerName:     record.ownerName,
      ownerEmail:    record.ownerEmail,
      totalEarnings: record.totalEarnings,
      referrals:     record.uses.map(u => ({
        name:      u.fullName,
        status:    u.status,
        appliedAt: u.createdAt,
        credited:  u.status === 'PAID',
      })),
    };
  },
};
