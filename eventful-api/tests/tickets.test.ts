import type { FastifyInstance } from 'fastify';
import { createTestApp, post, get } from './helpers/app';
import { cleanup, disconnectDb } from './helpers/db';

const RUN = Date.now();
const email = (tag: string) => `tickets-${RUN}-${tag}@test.example.com`;

let app: FastifyInstance;
let creatorToken: string;
let eventeeToken: string;

const createdUserIds: string[] = [];
const createdEventIds: string[] = [];

const futureDate = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 86_400_000).toISOString();

/** Create event body — price field kept for the event record itself (not used for orders) */
const makeEvent = (price = 0) => ({
  title:       `Tickets Test Event ${RUN}`,
  description: 'Test event for tickets',
  category:    'SPORTS',
  venue:       'Test Stadium',
  startsAt:    futureDate(14),
  endsAt:      new Date(Date.now() + 14 * 86_400_000 + 3_600_000).toISOString(),
  capacity:    50,
  price,
  currency:    'XAF',
});

/** Create a tier on an event (requires creator token) */
async function createTier(eventId: string, price: number, capacity = 50) {
  return post(app, `/events/${eventId}/tiers`, {
    name:     price === 0 ? 'Free Entry' : 'General Admission',
    type:     price === 0 ? 'FREE' : 'PAID',
    price,
    currency: 'XAF',
    capacity,
  }, creatorToken);
}

/** Place an order via the orders API */
async function placeOrder(eventId: string, tierId: string, token: string, buyerEmail: string) {
  return post(app, `/events/${eventId}/orders`, {
    tierId,
    quantity:   1,
    buyerName:  'Test Buyer',
    buyerEmail,
  }, token);
}

beforeAll(async () => {
  app = await createTestApp();

  const cr = await post(app, '/auth/register', {
    email:         email('creator'),
    password:      'Password1!',
    fullName:      'Ticket Creator',
    becomeCreator: true,
  });
  const crBody = cr.json();
  creatorToken = crBody.accessToken;
  createdUserIds.push(crBody.user.id);

  const ev = await post(app, '/auth/register', {
    email:    email('eventee'),
    password: 'Password1!',
    fullName: 'Ticket Eventee',
  });
  const evBody = ev.json();
  eventeeToken = evBody.accessToken;
  createdUserIds.push(evBody.user.id);
});

afterAll(async () => {
  await cleanup({ userIds: createdUserIds, eventIds: createdEventIds });
  await app.close();
  await disconnectDb();
});

// ── Free ticket ───────────────────────────────────────────────────────────────

describe('Free event — POST /events/:id/orders', () => {
  let eventId: string;
  let tierId: string;

  beforeAll(async () => {
    // Create event, publish it, create a free tier
    const evRes = await post(app, '/events', makeEvent(0), creatorToken);
    eventId = evRes.json().id;
    createdEventIds.push(eventId);

    await post(app, `/events/${eventId}`, { isPublished: true }, creatorToken);

    const tierRes = await createTier(eventId, 0);
    tierId = tierRes.json().id;
  });

  it('issues PAID tickets immediately → 201, paymentRequired=false', async () => {
    const res = await placeOrder(eventId, tierId, eventeeToken, email('eventee'));
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.paymentRequired).toBe(false);
    expect(body.paymentUrl).toBeUndefined();
    expect(body.order.tickets[0].status).toBe('PAID');
    expect(body.order.tickets[0].eventId).toBe(eventId);
  });

  it('returns the ticket in GET /eventees/me/tickets', async () => {
    const res = await get(app, '/eventees/me/tickets', eventeeToken);
    expect(res.statusCode).toBe(200);
    const tickets = res.json();
    expect(tickets.some((t: { eventId: string }) => t.eventId === eventId)).toBe(true);
  });

  it('rejects order when tier capacity is exhausted → 409', async () => {
    // Create a tiny-capacity tier and exhaust it
    const smallTierRes = await createTier(eventId, 0, 1);
    const smallTierId = smallTierRes.json().id;

    const ev2 = await post(app, '/auth/register', {
      email: email('cap-buyer'), password: 'Password1!', fullName: 'Cap Buyer',
    });
    createdUserIds.push(ev2.json().user.id);

    // First order fills capacity
    await placeOrder(eventId, smallTierId, ev2.json().accessToken, email('cap-buyer'));

    // Second order exceeds capacity
    const ev3 = await post(app, '/auth/register', {
      email: email('cap-buyer2'), password: 'Password1!', fullName: 'Cap Buyer 2',
    });
    createdUserIds.push(ev3.json().user.id);

    const res = await placeOrder(eventId, smallTierId, ev3.json().accessToken, email('cap-buyer2'));
    expect(res.statusCode).toBe(409);
  });
});

// ── Paid ticket ───────────────────────────────────────────────────────────────

describe('Paid event — POST /events/:id/orders', () => {
  let eventId: string;
  let tierId: string;
  let payerToken: string;

  beforeAll(async () => {
    const evRes = await post(app, '/events', makeEvent(5000), creatorToken);
    eventId = evRes.json().id;
    createdEventIds.push(eventId);

    await post(app, `/events/${eventId}`, { isPublished: true }, creatorToken);

    const tierRes = await createTier(eventId, 5000);
    tierId = tierRes.json().id;

    const payer = await post(app, '/auth/register', {
      email: email('payer'), password: 'Password1!', fullName: 'Payer',
    });
    payerToken = payer.json().accessToken;
    createdUserIds.push(payer.json().user.id);
  });

  it('creates PENDING_PAYMENT tickets and returns paymentUrl → 201', async () => {
    const res = await placeOrder(eventId, tierId, payerToken, email('payer'));
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.paymentRequired).toBe(true);
    expect(body.order.tickets[0].status).toBe('PENDING_PAYMENT');
    expect(body.paymentUrl).toBe('https://sandbox.tranzak.me/pay/mock001');
  });

  it('rejects orders on a non-published event → 403', async () => {
    const draftEvRes = await post(app, '/events', makeEvent(0), creatorToken);
    const draftEventId = draftEvRes.json().id;
    createdEventIds.push(draftEventId);

    const draftTierRes = await createTier(draftEventId, 0);
    const res = await placeOrder(draftEventId, draftTierRes.json().id, payerToken, email('payer'));
    expect(res.statusCode).toBe(403);
  });
});

// ── Check-in ──────────────────────────────────────────────────────────────────

describe('POST /events/:id/checkin', () => {
  let eventId: string;
  let qrPayload: string;
  let ticketId: string;

  beforeAll(async () => {
    const evRes = await post(app, '/events', makeEvent(0), creatorToken);
    eventId = evRes.json().id;
    createdEventIds.push(eventId);

    await post(app, `/events/${eventId}`, { isPublished: true }, creatorToken);

    const tierRes = await createTier(eventId, 0);
    const tierId  = tierRes.json().id;

    const ev3 = await post(app, '/auth/register', {
      email: email('checkin-eventee'), password: 'Password1!', fullName: 'Checkin Eventee',
    });
    const ev3Token = ev3.json().accessToken;
    createdUserIds.push(ev3.json().user.id);

    const orderRes = await placeOrder(eventId, tierId, ev3Token, email('checkin-eventee'));
    ticketId = orderRes.json().order.tickets[0].id;

    const tRes = await get(app, `/eventees/me/tickets/${ticketId}`, ev3Token);
    qrPayload = tRes.json().qrPayload;
  });

  it('checks in a valid PAID ticket → 200', async () => {
    const res = await post(app, `/events/${eventId}/checkin`, { qrPayload }, creatorToken);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.alreadyCheckedIn).toBe(false);
    expect(body.ticket.status).toBe('CHECKED_IN');
  });

  it('is idempotent on second scan → 200 alreadyCheckedIn=true', async () => {
    const res = await post(app, `/events/${eventId}/checkin`, { qrPayload }, creatorToken);
    expect(res.statusCode).toBe(200);
    expect(res.json().alreadyCheckedIn).toBe(true);
  });

  it('rejects an invalid QR payload → 422', async () => {
    const res = await post(app, `/events/${eventId}/checkin`, { qrPayload: 'invalid-payload' }, creatorToken);
    expect(res.statusCode).toBe(422);
  });
});
