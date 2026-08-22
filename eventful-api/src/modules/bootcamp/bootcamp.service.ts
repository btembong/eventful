import prisma from '@/lib/prisma';
import { notificationsService } from '@/modules/notifications/notifications.service';
import { tplBootcampWelcome }   from '@/modules/notifications/email-templates';

export interface ApplyInput {
  fullName:      string;
  email:         string;
  phone:         string;
  country:       string;
  background:    string;
  goal?:         string;
  paymentPlan:   'FULL' | 'INSTALLMENT';
  paymentMethod: string;
  referral?:     string;
}

export const bootcampService = {

  async apply(input: ApplyInput) {
    // Prevent duplicate applications (same email, same cohort)
    const existing = await prisma.bootcampApplication.findFirst({
      where: { email: input.email.toLowerCase(), cohort: '2026-09' },
    });
    if (existing) {
      throw Object.assign(new Error('An application from this email already exists for this cohort.'), { statusCode: 409 });
    }

    const application = await prisma.bootcampApplication.create({
      data: {
        fullName:      input.fullName.trim(),
        email:         input.email.toLowerCase().trim(),
        phone:         input.phone.trim(),
        country:       input.country.trim(),
        background:    input.background,
        goal:          input.goal?.trim() ?? null,
        paymentPlan:   input.paymentPlan,
        paymentMethod: input.paymentMethod,
        referral:      input.referral?.trim() ?? null,
        cohort:        '2026-09',
        status:        'PENDING',
      },
    });

    // Fire welcome email — non-blocking (don't fail the request if email fails)
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
      orderBy: { createdAt: 'desc' },
    });
  },

  async updateStatus(id: string, status: string, adminNotes?: string) {
    const updated = await prisma.bootcampApplication.update({
      where: { id },
      data:  { status: status as never, adminNotes },
    });

    // Fire acceptance email when admin moves to ACCEPTED
    if (status === 'ACCEPTED') {
      const { tplBootcampAccepted } = await import('@/modules/notifications/email-templates');
      notificationsService.sendEmail(
        updated.email,
        'You\'re accepted! Here\'s how to secure your seat',
        tplBootcampAccepted({
          fullName:      updated.fullName,
          paymentPlan:   updated.paymentPlan,
          paymentMethod: updated.paymentMethod,
        }),
      ).catch(err => console.error('[bootcamp] Acceptance email failed:', err.message));
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
    return prisma.bootcampApplication.findUnique({ where: { id } });
  },
};
