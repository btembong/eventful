import type { FastifyInstance } from 'fastify';
import { createTestApp, post, get } from './helpers/app';
import { cleanup, disconnectDb, prisma } from './helpers/db';

const RUN = Date.now();
const email = (tag: string) => `tickets-${RUN}-${tag}@test.example.com`;

let app: FastifyInstance;
let creatorToken: string;
let eventeeToken: string;
let creatorId: string;
let eventeeId: string;

const createdUserIds: string[] = [];
const createdEventIds: string[] = [];

const futureDate = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 86_400_000).toISOString();

const makeEvent = (price = 0) => ({
  title: `Tickets Test Event ${RUN}`,
  description: 'Test event for tickets',
  category: 'SPORTS',
  venue: 'Test Stadium',
  startsAt: futureDate(14),
  endsAt:   new Date(Date.now() + 14 * 86_400_000 + 3_600_000).toISOString(),
  capacity: 50,
  price,
  currency: 'XAF',
});

beforeAll(async () => {
  app = await createTestApp();

  const cr = await post(app, '/auth/register', {
    email: email('creator'),
    password: 'Password1!',
    fullName: 'Ticket Creator',
    becomeCreator: true,
  });
  const crBody = cr.json();
  creatorToken = crBody.accessToken;
  creatorId = crBody.user.id;
  createdUserIds.push(creatorId);

  const ev = await post(app, '/auth/register', {
    email: email('eventee'),
    password: 'Password1!',
    fullName: 'Ticket Eventee',
  });
  const evBody = ev.json();
  eventeeToken = evBody.accessToken;
  eventeeId = evBody.user.id;
  createdUserIds.push(eventeeId);
});

afterAll(async () => {
  await cleanup({ userIds: createdUserIds, eventIds: createdEventIds });
  await app.close();
  await disconnectDb();
});

// ── Free ticket ───────────────────────────────────────────────────────────────

describe('Free event ticket purchase', () => {
  let eventId: string;

  beforeAll(async () => {
    const res = await post(app, '/events', makeEvent(0), creatorToken);
    eventId = res.json().id;
    createdEventIds.push(eventId);
  });

  it('issues a PAID ticket immediately for a free event → 201', async () => {
    const res = await post(app, `/events/${eventId}/apply`, {}, eventeeToken);
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.paymentRequired).toBe(false);
    expect(body.ticket.status).toBe('PAID');
    expect(body.ticket.eventId).toBe(eventId);
    expect(body.paymentUrl).toBeUndefined();
  });

  it('rejects duplicate purchase → 409', async () => {
    const res = await post(app, `/events/${eventId}/apply`, {}, eventeeToken);
    expect(res.statusCode).toBe(409);
  });

  it('returns the ticket in GET /eventees/me/tickets', async () => {
    const res = await get(app, '/eventees/me/tickets', eventeeToken);
    expect(res.statusCode).toBe(200);
    const tickets = res.json();
    expect(tickets.some((t: any) => t.eventId === eventId)).toBe(true);
  });
});

// ── Paid ticket ───────────────────────────────────────────────────────────────

describe('Paid event ticket purchase', () => {
  let eventId: string;
  let otherEventeeToken: string;

  beforeAll(async () => {
    const res = await post(app, '/events', makeEvent(5000), creatorToken);
    eventId = res.json().id;
    createdEventIds.push(eventId);

    // Second eventee for paid ticket test
    const ev2 = await post(app, '/auth/register', {
      email: email('eventee2'),
      password: 'Password1!',
      fullName: 'Ticket Eventee 2',
    });
    otherEventeeToken = ev2.json().accessToken;
    createdUserIds.push(ev2.json().user.id);
  });

  it('creates PENDING_PAYMENT ticket and returns paymentUrl → 201', async () => {
    const res = await post(app, `/events/${eventId}/apply`, {}, otherEventeeToken);
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.paymentRequired).toBe(true);
    expect(body.ticket.status).toBe('PENDING_PAYMENT');
    expect(body.paymentUrl).toBe('https://sandbox.tranzak.me/pay/mock001');
  });
});

// ── Check-in ──────────────────────────────────────────────────────────────────

describe('POST /events/:id/checkin', () => {
  let eventId: string;
  let qrPayload: string;
  let ticketId: string;

  beforeAll(async () => {
    // Create event + free ticket so it's PAID immediately
    const evRes = await post(app, '/events', makeEvent(0), creatorToken);
    eventId = evRes.json().id;
    createdEventIds.push(eventId);

    // Third unique eventee for check-in
    const ev3 = await post(app, '/auth/register', {
      email: email('checkin-eventee'),
      password: 'Password1!',
      fullName: 'Checkin Eventee',
    });
    const ev3Token = ev3.json().accessToken;
    createdUserIds.push(ev3.json().user.id);

    const ticketRes = await post(app, `/events/${eventId}/apply`, {}, ev3Token);
    const ticketBody = ticketRes.json();
    ticketId = ticketBody.ticket.id;

    // Get qrPayload from the single ticket endpoint
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

  it('is idempotent on second scan → 200 with alreadyCheckedIn=true', async () => {
    const res = await post(app, `/events/${eventId}/checkin`, { qrPayload }, creatorToken);
    expect(res.statusCode).toBe(200);
    expect(res.json().alreadyCheckedIn).toBe(true);
  });

  it('rejects an invalid QR payload → 422', async () => {
    const res = await post(
      app,
      `/events/${eventId}/checkin`,
      { qrPayload: 'invalid-payload' },
      creatorToken,
    );
    expect(res.statusCode).toBe(422);
  });
});
