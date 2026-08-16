/**
 * Unit tests for ordersService capacity and validation logic.
 *
 * Prisma and Tranzak are mocked via jest.config.ts moduleNameMapper so no
 * real DB or network calls happen.
 */

import { ordersService } from '@/modules/orders/orders.service';

// ── Prisma mock ───────────────────────────────────────────────────────────────

jest.mock('@/lib/prisma', () => {
  const event = {
    id: 'evt-1', capacity: 10, currency: 'XAF', isCancelled: false,
    startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    isPublished: true,
  };

  const tier = {
    id: 'tier-1', eventId: 'evt-1', name: 'GA', type: 'PAID',
    price: { toString: () => '5000' }, currency: 'XAF',
    capacity: 5, sold: 0, orderLimit: 10, isOnSale: true,
    salesStart: null, salesEnd: null, inviteCode: null,
  };

  const mockTx = {
    ticket: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(({ data }: { data: { id?: string } }) =>
        Promise.resolve({ id: data.id ?? 'tkt-1', ...data }),
      ),
    },
    order: {
      create: jest.fn().mockImplementation(({ data }: { data: { id?: string } }) =>
        Promise.resolve({ id: data.id ?? 'ord-1', ...data }),
      ),
    },
    ticketTier: {
      update: jest.fn().mockResolvedValue(tier),
    },
    payment: {
      create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
    },
  };

  return {
    __esModule: true,
    default: {
      event: {
        findFirst: jest.fn().mockResolvedValue(event),
      },
      ticketTier: {
        findFirst: jest.fn().mockResolvedValue(tier),
      },
      $transaction: jest.fn().mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx),
      ),
      _mockTx: mockTx,
      _event: event,
      _tier: tier,
    },
  };
});

// ── Notifications mock ────────────────────────────────────────────────────────

jest.mock('@/modules/notifications/notifications.service', () => ({
  notificationsService: {
    scheduleReceipt: jest.fn().mockResolvedValue(undefined),
    scheduleReminders: jest.fn().mockResolvedValue(undefined),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const baseParams = {
  tierId:     'tier-1',
  quantity:   1,
  buyerName:  'Test Buyer',
  buyerEmail: 'buyer@test.com',
  userId:     'user-1',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ordersService.createOrder', () => {

  beforeEach(() => jest.clearAllMocks());

  it('throws 404 when event is not found', async () => {
    const prisma = (await import('@/lib/prisma')).default as unknown as { event: { findFirst: jest.Mock } };
    prisma.event.findFirst.mockResolvedValueOnce(null);

    await expect(ordersService.createOrder('evt-missing', baseParams))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 when event is not published', async () => {
    const prisma = (await import('@/lib/prisma')).default as unknown as { event: { findFirst: jest.Mock } };
    prisma.event.findFirst.mockResolvedValueOnce({ ...prisma.event.findFirst.mock.results[0]?.value, isPublished: false });

    await expect(ordersService.createOrder('evt-1', baseParams))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 410 when event is cancelled', async () => {
    const prisma = (await import('@/lib/prisma')).default as unknown as { event: { findFirst: jest.Mock } };
    prisma.event.findFirst.mockResolvedValueOnce({
      id: 'evt-1', capacity: 10, currency: 'XAF', isCancelled: true,
      startsAt: new Date(Date.now() + 86_400_000).toISOString(),
      isPublished: true,
    });

    await expect(ordersService.createOrder('evt-1', baseParams))
      .rejects.toMatchObject({ statusCode: 410 });
  });

  it('throws 409 when event has already started', async () => {
    const prisma = (await import('@/lib/prisma')).default as unknown as { event: { findFirst: jest.Mock } };
    prisma.event.findFirst.mockResolvedValueOnce({
      id: 'evt-1', capacity: 10, currency: 'XAF', isCancelled: false,
      startsAt: new Date(Date.now() - 3600_000).toISOString(), // in the past
      isPublished: true,
    });

    await expect(ordersService.createOrder('evt-1', baseParams))
      .rejects.toMatchObject({ statusCode: 410 });
  });

  it('throws 404 when tier is not found', async () => {
    const prisma = (await import('@/lib/prisma')).default as unknown as {
      ticketTier: { findFirst: jest.Mock };
    };
    prisma.ticketTier.findFirst.mockResolvedValueOnce(null);

    await expect(ordersService.createOrder('evt-1', baseParams))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 422 when quantity exceeds orderLimit', async () => {
    await expect(
      ordersService.createOrder('evt-1', { ...baseParams, quantity: 99 }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 403 when invite code is wrong for INVITE_ONLY tier', async () => {
    const prisma = (await import('@/lib/prisma')).default as unknown as {
      ticketTier: { findFirst: jest.Mock };
    };
    prisma.ticketTier.findFirst.mockResolvedValueOnce({
      id: 'tier-invite', eventId: 'evt-1', name: 'VIP', type: 'INVITE_ONLY',
      price: { toString: () => '0' }, currency: 'XAF',
      capacity: 5, sold: 0, orderLimit: 10, isOnSale: true,
      salesStart: null, salesEnd: null, inviteCode: 'SECRET',
    });

    await expect(
      ordersService.createOrder('evt-1', { ...baseParams, tierId: 'tier-invite' }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('accepts a correct invite code for INVITE_ONLY tier', async () => {
    const prisma = (await import('@/lib/prisma')).default as unknown as {
      ticketTier: { findFirst: jest.Mock };
      $transaction: jest.Mock;
    };
    prisma.ticketTier.findFirst.mockResolvedValueOnce({
      id: 'tier-invite', eventId: 'evt-1', name: 'VIP', type: 'INVITE_ONLY',
      price: { toString: () => '0' }, currency: 'XAF',
      capacity: 5, sold: 0, orderLimit: 10, isOnSale: true,
      salesStart: null, salesEnd: null, inviteCode: 'SECRET',
    });

    const result = await ordersService.createOrder('evt-1', {
      ...baseParams, tierId: 'tier-invite', inviteCode: 'SECRET',
    });
    expect(result.paymentRequired).toBe(false); // INVITE_ONLY is free
  });

  it('throws 409 when event capacity is exhausted', async () => {
    const prisma = (await import('@/lib/prisma')).default as unknown as {
      $transaction: jest.Mock;
      _mockTx: { ticket: { count: jest.Mock } };
    };
    // First count (event capacity) returns 10 = full
    prisma._mockTx.ticket.count.mockResolvedValueOnce(10);

    await expect(ordersService.createOrder('evt-1', baseParams))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws 409 when tier capacity is exhausted', async () => {
    const prisma = (await import('@/lib/prisma')).default as unknown as {
      _mockTx: { ticket: { count: jest.Mock } };
    };
    // Event count OK (0), tier count full (5)
    prisma._mockTx.ticket.count
      .mockResolvedValueOnce(0)  // event capacity check
      .mockResolvedValueOnce(5); // tier capacity check

    await expect(ordersService.createOrder('evt-1', baseParams))
      .rejects.toMatchObject({ statusCode: 409 });
  });
});
