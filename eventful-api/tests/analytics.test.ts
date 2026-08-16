import type { FastifyInstance } from 'fastify';
import { createTestApp, post, get } from './helpers/app';
import { cleanup, disconnectDb, prisma } from './helpers/db';

const RUN = Date.now();
const email = (tag: string) => `analytics-${RUN}-${tag}@test.example.com`;

let app: FastifyInstance;
let creatorToken: string;
let creatorId: string;
let eventId: string;

const createdUserIds: string[] = [];
const createdEventIds: string[] = [];

beforeAll(async () => {
  app = await createTestApp();

  // Creator with a free event + one PAID ticket for meaningful stats
  const cr = await post(app, '/auth/register', {
    email: email('creator'),
    password: 'Password1!',
    fullName: 'Analytics Creator',
    becomeCreator: true,
  });
  const crBody = cr.json();
  creatorToken = crBody.accessToken;
  creatorId = crBody.user.id;
  createdUserIds.push(creatorId);

  const ev = await post(app, '/auth/register', {
    email: email('eventee'),
    password: 'Password1!',
    fullName: 'Analytics Eventee',
  });
  const evBody = ev.json();
  createdUserIds.push(evBody.user.id);
  const eventeeToken = evBody.accessToken;

  // Create event
  const evRes = await post(app, '/events', {
    title: `Analytics Event ${RUN}`,
    description: 'For analytics tests',
    category: 'CULTURAL',
    venue: 'Analytics Venue',
    startsAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    endsAt:   new Date(Date.now() + 30 * 86_400_000 + 3_600_000).toISOString(),
    capacity: 100,
    price: 0,
    currency: 'XAF',
  }, creatorToken);
  eventId = evRes.json().id;
  createdEventIds.push(eventId);

  // Purchase a ticket so there's something to count
  await post(app, `/events/${eventId}/apply`, {}, eventeeToken);
});

afterAll(async () => {
  await cleanup({ userIds: createdUserIds, eventIds: createdEventIds });
  await app.close();
  await disconnectDb();
});

// ── Creator stats ─────────────────────────────────────────────────────────────

describe('GET /creators/me/analytics', () => {
  it('returns stats for the authenticated creator → 200', async () => {
    const res = await get(app, '/creators/me/analytics', creatorToken);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.totalEvents).toBe('number');
    expect(typeof body.totalTicketsSold).toBe('number');
    expect(typeof body.totalRevenue).toBe('number');
    expect(typeof body.checkInRate).toBe('number');
    expect(body.totalEvents).toBeGreaterThanOrEqual(1);
    expect(body.totalTicketsSold).toBeGreaterThanOrEqual(1);
  });

  it('requires authentication → 401', async () => {
    const res = await get(app, '/creators/me/analytics');
    expect(res.statusCode).toBe(401);
  });
});

// ── Per-event stats ───────────────────────────────────────────────────────────

describe('GET /creators/me/events/:id/analytics', () => {
  it('returns event-level stats → 200', async () => {
    const res = await get(app, `/creators/me/events/${eventId}/analytics`, creatorToken);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.capacity).toBe(100);
    expect(typeof body.ticketsSold).toBe('number');
    expect(typeof body.checkedIn).toBe('number');
    expect(typeof body.checkInRate).toBe('number');
    expect(body.ticketsSold).toBeGreaterThanOrEqual(1);
  });

  it('returns 404 for an event the creator does not own', async () => {
    const res = await get(
      app,
      '/creators/me/events/00000000-0000-0000-0000-000000000000/analytics',
      creatorToken,
    );
    expect(res.statusCode).toBe(404);
  });
});

// ── Admin stats ───────────────────────────────────────────────────────────────

describe('GET /admin/analytics', () => {
  it('returns 403 for a non-admin user', async () => {
    // creatorToken has CREATOR role but not ADMIN
    const res = await get(app, '/admin/analytics', creatorToken);
    expect(res.statusCode).toBe(403);
  });

  it('returns platform stats for an ADMIN user → 200', async () => {
    // Promote the creator to ADMIN directly in DB
    await prisma.user.update({
      where: { id: creatorId },
      data: { roles: { push: 'ADMIN' } },
    });

    // Re-login to get a token that includes the ADMIN role
    const loginRes = await post(app, '/auth/login', {
      email: email('creator'),
      password: 'Password1!',
    });
    const adminToken = loginRes.json().accessToken;

    const res = await get(app, '/admin/analytics', adminToken);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.totalUsers).toBe('number');
    expect(typeof body.totalEvents).toBe('number');
    expect(typeof body.totalRevenue).toBe('number');
    expect(body.tickets).toBeDefined();
  });
});
