import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';

const CACHE_TTL = 300; // 5 minutes

function clientError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

export const analyticsService = {
  /**
   * All-time stats for a creator across all their events.
   * Cached per creator for 5 minutes.
   */
  async getCreatorStats(creatorId: string) {
    const cacheKey = `analytics:creator:${creatorId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [
      totalEvents,
      activeEvents,
      ticketCounts,
      revenueResult,
    ] = await Promise.all([
      // All non-deleted events
      prisma.event.count({
        where: { creatorId, deletedAt: null },
      }),
      // Active (not cancelled, not started)
      prisma.event.count({
        where: { creatorId, deletedAt: null, isCancelled: false, startsAt: { gt: new Date() } },
      }),
      // Ticket breakdown for sold/checked-in
      prisma.ticket.groupBy({
        by: ['status'],
        where: {
          event: { creatorId },
          status: { in: ['PAID', 'CHECKED_IN'] },
        },
        _count: { _all: true },
      }),
      // Revenue from successful payments
      prisma.payment.aggregate({
        where: { event: { creatorId }, status: 'success' },
        _sum: { amount: true },
      }),
    ]);

    const paid      = ticketCounts.find((r) => r.status === 'PAID')?._count._all ?? 0;
    const checkedIn = ticketCounts.find((r) => r.status === 'CHECKED_IN')?._count._all ?? 0;
    const totalTicketsSold = paid + checkedIn;
    const checkInRate = totalTicketsSold > 0 ? checkedIn / totalTicketsSold : 0;

    const stats = {
      totalEvents,
      activeEvents,
      totalTicketsSold,
      checkedIn,
      checkInRate: Math.round(checkInRate * 1000) / 10, // percentage to 1dp
      totalRevenue: Number(revenueResult._sum.amount ?? 0),
    };

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(stats));
    return stats;
  },

  /**
   * Per-event stats. Verifies that creatorId owns the event.
   * Cached per event for 5 minutes.
   */
  async getEventStats(eventId: string, creatorId: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { creatorId: true, capacity: true, price: true, currency: true },
    });
    if (!event)                        throw clientError('Event not found', 404);
    if (event.creatorId !== creatorId) throw clientError('Forbidden', 403);

    const cacheKey = `analytics:event:${eventId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [ticketCounts, revenueResult] = await Promise.all([
      prisma.ticket.groupBy({
        by: ['status'],
        where: { eventId },
        _count: { _all: true },
      }),
      prisma.payment.aggregate({
        where: { eventId, status: 'success' },
        _sum: { amount: true },
      }),
    ]);

    const countFor = (s: string) =>
      ticketCounts.find((r) => r.status === s)?._count._all ?? 0;

    const paid            = countFor('PAID');
    const checkedIn       = countFor('CHECKED_IN');
    const pendingPayment  = countFor('PENDING_PAYMENT');
    const cancelled       = countFor('CANCELLED');
    const refunded        = countFor('REFUNDED');
    const ticketsSold     = paid + checkedIn;
    const checkInRate     = ticketsSold > 0 ? checkedIn / ticketsSold : 0;

    const stats = {
      capacity: event.capacity,
      capacityRemaining: Math.max(0, event.capacity - ticketsSold - pendingPayment),
      ticketsSold,
      checkedIn,
      pendingPayment,
      cancelled,
      refunded,
      checkInRate: Math.round(checkInRate * 1000) / 10,
      revenue: Number(revenueResult._sum.amount ?? 0),
      currency: event.currency,
    };

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(stats));
    return stats;
  },

  /**
   * Platform-wide totals — admin only.
   * Cached globally for 5 minutes.
   */
  async getPlatformStats() {
    const cacheKey = 'analytics:platform';
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [totalUsers, totalEvents, ticketCounts, revenueResult] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.event.count({ where: { deletedAt: null } }),
      prisma.ticket.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'success' },
        _sum: { amount: true },
      }),
    ]);

    const countFor = (s: string) =>
      ticketCounts.find((r) => r.status === s)?._count._all ?? 0;

    const stats = {
      totalUsers,
      totalEvents,
      tickets: {
        paid:           countFor('PAID'),
        checkedIn:      countFor('CHECKED_IN'),
        pendingPayment: countFor('PENDING_PAYMENT'),
        cancelled:      countFor('CANCELLED'),
        refunded:       countFor('REFUNDED'),
      },
      totalRevenue: Number(revenueResult._sum.amount ?? 0),
    };

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(stats));
    return stats;
  },
};
