import type { FastifyInstance } from 'fastify';
import { createTestApp, post } from './helpers/app';
import { cleanup, disconnectDb, prisma } from './helpers/db';

const RUN = Date.now();
const email = (tag: string) => `webhook-${RUN}-${tag}@test.example.com`;

let app: FastifyInstance;
const createdUserIds: string[] = [];
const createdEventIds: string[] = [];

// Tranzak request ID used for the webhook test payment row
const MOCK_REQUEST_ID = `trz-webhook-test-${RUN}`;
const MOCK_WEBHOOK_ID = `wh-test-${RUN}`;

beforeAll(async () => {
  app = await createTestApp();

  // Create creator + event + ticket + payment directly via Prisma
  // so we can control the tranzakRequestId precisely
  const creator = await prisma.user.create({
    data: {
      email: email('creator'),
      passwordHash: '$2b$10$placeholder',
      fullName: 'Webhook Creator',
      roles: ['CREATOR', 'EVENTEE'],
    },
  });
  createdUserIds.push(creator.id);

  const eventee = await prisma.user.create({
    data: {
      email: email('eventee'),
      passwordHash: '$2b$10$placeholder',
      fullName: 'Webhook Eventee',
      roles: ['EVENTEE'],
    },
  });
  createdUserIds.push(eventee.id);

  const event = await prisma.event.create({
    data: {
      creatorId: creator.id,
      title: `Webhook Test Event ${RUN}`,
      description: 'Webhook test',
      category: 'OTHER',
      venue: 'Webhook Venue',
      startsAt: new Date(Date.now() + 14 * 86_400_000),
      endsAt:   new Date(Date.now() + 14 * 86_400_000 + 3_600_000),
      capacity: 10,
      price: 1000,
      currency: 'XAF',
      shareSlug: `webhook-test-${RUN}`,
      defaultReminderOffsets: [],
    },
  });
  createdEventIds.push(event.id);

  // Create ticket + payment with known tranzakRequestId
  const { qrService } = await import('@/lib/qr');
  const ticketId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();

  await prisma.ticket.create({
    data: {
      id: ticketId,
      eventId: event.id,
      eventeeId: eventee.id,
      status: 'PENDING_PAYMENT',
      qrPayload: qrService.sign(ticketId, event.id),
    },
  });

  await prisma.payment.create({
    data: {
      id: paymentId,
      ticketId,
      eventId: event.id,
      tranzakRequestId: MOCK_REQUEST_ID,
      amount: 1000,
      currency: 'XAF',
      status: 'pending',
    },
  });
});

afterAll(async () => {
  await cleanup({ userIds: createdUserIds, eventIds: createdEventIds });
  await app.close();
  await disconnectDb();
});

const webhookPayload = (overrides = {}) => ({
  eventType:        'REQUEST.COMPLETED',
  appId:            'test_app_id',
  resourceId:       MOCK_REQUEST_ID,
  webhookId:        MOCK_WEBHOOK_ID,
  authKey:          'mock-auth-key',
  creationDateTime: new Date().toISOString(),
  ...overrides,
});

describe('POST /webhooks/tranzak', () => {
  it('always returns 200 {received:true}', async () => {
    const res = await post(app, '/webhooks/tranzak', webhookPayload());
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ received: true });
  });

  it('marks the ticket PAID and payment success on valid webhook', async () => {
    // Give the handler a moment to commit (it's synchronous in the route)
    const payment = await prisma.payment.findFirst({
      where: { tranzakRequestId: MOCK_REQUEST_ID },
      include: { ticket: true },
    });
    expect(payment?.status).toBe('success');
    expect(payment?.ticket.status).toBe('PAID');
    expect(payment?.webhookEventId).toBe(MOCK_WEBHOOK_ID);
  });

  it('is idempotent — second call with same webhookId still returns 200', async () => {
    const res = await post(app, '/webhooks/tranzak', webhookPayload());
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ received: true });
  });

  it('ignores non-COMPLETED event types', async () => {
    const res = await post(
      app,
      '/webhooks/tranzak',
      webhookPayload({ eventType: 'REQUEST.PENDING', webhookId: `wh-pending-${RUN}` }),
    );
    expect(res.statusCode).toBe(200);
  });
});
