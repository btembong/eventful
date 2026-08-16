import { PrismaClient } from '@prisma/client';

// Separate Prisma instance for test cleanup — connects to DATABASE_URL from .env.test
export const prisma = new PrismaClient();

/**
 * Delete all data created during a test suite, in FK-safe order:
 * AuditLog → ReminderPref → Payment → Ticket → Event → User
 */
export async function cleanup(ids: {
  userIds?: string[];
  eventIds?: string[];
}): Promise<void> {
  const { userIds = [], eventIds = [] } = ids;

  if (eventIds.length) {
    // Get payment IDs so we can delete audit logs by entity
    const payments = await prisma.payment.findMany({
      where: { eventId: { in: eventIds } },
      select: { id: true },
    });
    const paymentIds = payments.map((p) => p.id);

    if (paymentIds.length) {
      await prisma.auditLog.deleteMany({
        where: { entityType: 'Payment', entityId: { in: paymentIds } },
      });
    }

    // Audit logs for tickets/events
    const tickets = await prisma.ticket.findMany({
      where: { eventId: { in: eventIds } },
      select: { id: true },
    });
    const ticketIds = tickets.map((t) => t.id);
    if (ticketIds.length) {
      await prisma.auditLog.deleteMany({
        where: { entityType: 'Ticket', entityId: { in: ticketIds } },
      });
    }

    await prisma.auditLog.deleteMany({
      where: { entityType: 'Event', entityId: { in: eventIds } },
    });

    await prisma.reminderPref.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.payment.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.ticket.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
  }

  if (userIds.length) {
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

/** Disconnect Prisma — call in afterAll. */
export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
