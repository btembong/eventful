/**
 * Unit tests for paymentsService webhook handling.
 * Tranzak and Prisma are mocked — no real DB or network calls.
 */

import { paymentsService } from '@/modules/payments/payments.service';
import type { WebhookPayload } from '@/lib/tranzak';

// ── Prisma mock ───────────────────────────────────────────────────────────────

const mockPayment = {
  id: 'pay-1',
  orderId: 'ord-1',
  eventId: 'evt-1',
  amount: { toString: () => '5000' },
  tranzakRequestId: 'trz_req_001',
  webhookEventId: null,
  status: 'pending',
};

const mockOrder = {
  id: 'ord-1',
  tickets: [{ id: 'tkt-1', eventeeId: 'user-1' }],
};

const mockEvent = { creatorId: 'creator-1' };

const mockPaymentWithOrder = { ...mockPayment, order: { ...mockOrder } };

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    payment: {
      findFirst:  jest.fn(),
      update:     jest.fn().mockResolvedValue(mockPaymentWithOrder),
    },
    ticket: {
      updateMany: jest.fn().mockResolvedValue({}),
    },
    order: {
      update: jest.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    event: {
      findUnique: jest.fn().mockResolvedValue(mockEvent),
    },
    $transaction: jest.fn().mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn({
        payment:  { update: jest.fn().mockResolvedValue(mockPaymentWithOrder) },
        ticket:   { updateMany: jest.fn().mockResolvedValue({}) },
        order:    { update: jest.fn().mockResolvedValue({}) },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      }),
    ),
  },
}));

// ── Notifications mock ────────────────────────────────────────────────────────

jest.mock('@/modules/notifications/notifications.service', () => ({
  notificationsService: {
    scheduleReceipt: jest.fn().mockResolvedValue(undefined),
    scheduleReminders: jest.fn().mockResolvedValue(undefined),
  },
}));

// ── Webhooks mock ─────────────────────────────────────────────────────────────

jest.mock('@/modules/webhooks/webhooks.service', () => ({
  webhooksService: {
    dispatch: jest.fn().mockResolvedValue(undefined),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const validPayload: WebhookPayload = {
  name:             'payment.completed',
  version:          '1',
  eventType:        'REQUEST.COMPLETED',
  appId:            'test-app-id',
  resourceId:       'trz_req_001',
  resource:         {} as WebhookPayload['resource'],
  webhookId:        'wh-001',
  creationDateTime: new Date().toISOString(),
  authKey:          'authkey-xyz',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('paymentsService.handleWebhook', () => {

  beforeEach(() => jest.clearAllMocks());

  it('throws 401 when authKey verification fails', async () => {
    const { tranzakClient } = await import('@/lib/tranzak');
    (tranzakClient.verifyWebhookAuthKey as jest.Mock).mockReturnValueOnce(false);

    await expect(paymentsService.handleWebhook(validPayload))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('returns early (no-op) for non-COMPLETED event types', async () => {
    const prisma = (await import('@/lib/prisma')).default as unknown as {
      payment: { findFirst: jest.Mock };
    };

    await paymentsService.handleWebhook({ ...validPayload, eventType: 'TRANSFER.COMPLETED' as WebhookPayload['eventType'] });

    // findFirst (idempotency check) should NOT have been called
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });

  it('is idempotent — skips processing if webhookEventId already exists', async () => {
    const prisma = (await import('@/lib/prisma')).default as unknown as {
      payment: { findFirst: jest.Mock; update: jest.Mock };
    };
    // Return an existing payment record (already processed)
    prisma.payment.findFirst.mockResolvedValueOnce({ ...mockPayment, webhookEventId: 'wh-001' });

    await paymentsService.handleWebhook(validPayload);

    // Update should NOT have been called — duplicate webhook
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('returns early when Tranzak payment status is not SUCCESSFUL', async () => {
    const prisma = (await import('@/lib/prisma')).default as unknown as {
      payment: { findFirst: jest.Mock; update: jest.Mock };
    };
    prisma.payment.findFirst.mockResolvedValueOnce(null); // not yet processed

    const { tranzakClient } = await import('@/lib/tranzak');
    (tranzakClient.getPaymentDetails as jest.Mock).mockResolvedValueOnce({ status: 'FAILED' });

    await paymentsService.handleWebhook(validPayload);

    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('processes a valid webhook: updates payment, tickets, order, and logs audit', async () => {
    const prisma = (await import('@/lib/prisma')).default as unknown as {
      payment: { findFirst: jest.Mock };
      $transaction: jest.Mock;
    };
    prisma.payment.findFirst.mockResolvedValueOnce(null); // not yet processed

    await paymentsService.handleWebhook(validPayload);

    // Transaction should have been called once
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('schedules receipt and reminders for authenticated ticket holders', async () => {
    const prisma = (await import('@/lib/prisma')).default as unknown as {
      payment: { findFirst: jest.Mock };
    };
    prisma.payment.findFirst.mockResolvedValueOnce(null);

    const { notificationsService } = await import('@/modules/notifications/notifications.service');

    await paymentsService.handleWebhook(validPayload);

    // One ticket with eventeeId='user-1' → should schedule receipt + reminder
    expect(notificationsService.scheduleReceipt).toHaveBeenCalledWith('tkt-1', 'user-1');
    expect(notificationsService.scheduleReminders).toHaveBeenCalledWith('tkt-1', 'evt-1');
  });
});
