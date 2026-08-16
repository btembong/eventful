import type { FastifyInstance } from 'fastify';
import { createTestApp, post, get, patch, del } from './helpers/app';
import { cleanup, disconnectDb } from './helpers/db';

const RUN = Date.now();
const email = (tag: string) => `events-${RUN}-${tag}@test.example.com`;

let app: FastifyInstance;
let creatorToken: string;
let eventeeToken: string;
let creatorId: string;

const createdUserIds: string[] = [];
const createdEventIds: string[] = [];

beforeAll(async () => {
  app = await createTestApp();

  // Register a creator
  const cr = await post(app, '/auth/register', {
    email: email('creator'),
    password: 'Password1!',
    fullName: 'Event Creator',
    becomeCreator: true,
  });
  const crBody = cr.json();
  creatorToken = crBody.accessToken;
  creatorId = crBody.user.id;
  createdUserIds.push(creatorId);

  // Register a plain eventee (no CREATOR role)
  const ev = await post(app, '/auth/register', {
    email: email('eventee'),
    password: 'Password1!',
    fullName: 'Event Eventee',
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

const baseEvent = () => ({
  title: `Test Concert ${RUN}`,
  description: 'A great test concert',
  category: 'CONCERT',
  venue: 'Test Venue',
  startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 days
  endsAt:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
  capacity: 100,
  price: 0,
  currency: 'XAF',
});

// ── Create ─────────────────────────────────────────────────────────────────────

describe('POST /events', () => {
  it('creates an event as creator → 201', async () => {
    const res = await post(app, '/events', baseEvent(), creatorToken);
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.title).toBe(`Test Concert ${RUN}`);
    expect(body.shareSlug).toBeTruthy();
    createdEventIds.push(body.id);
  });

  it('rejects eventee without CREATOR role → 403', async () => {
    const res = await post(app, '/events', baseEvent(), eventeeToken);
    expect(res.statusCode).toBe(403);
  });

  it('rejects unauthenticated request → 401', async () => {
    const res = await post(app, '/events', baseEvent());
    expect(res.statusCode).toBe(401);
  });
});

// ── Read ──────────────────────────────────────────────────────────────────────

describe('GET /events', () => {
  let eventId: string;

  beforeAll(async () => {
    const res = await post(app, '/events', baseEvent(), creatorToken);
    eventId = res.json().id;
    createdEventIds.push(eventId);
  });

  it('discovery feed returns paginated list → 200', async () => {
    const res = await get(app, '/events');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.events)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  it('returns event by id → 200', async () => {
    const res = await get(app, `/events/${eventId}`);
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(eventId);
  });

  it('returns 404 for unknown event', async () => {
    const res = await get(app, '/events/00000000-0000-0000-0000-000000000000');
    expect(res.statusCode).toBe(404);
  });

  it('returns share links → 200', async () => {
    const res = await get(app, `/events/${eventId}/share`);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.url).toBeTruthy();
    expect(body.whatsapp).toBeTruthy();
  });
});

// ── Update ────────────────────────────────────────────────────────────────────

describe('PATCH /events/:id', () => {
  let eventId: string;

  beforeAll(async () => {
    const res = await post(app, '/events', baseEvent(), creatorToken);
    eventId = res.json().id;
    createdEventIds.push(eventId);
  });

  it('updates event fields → 200', async () => {
    const res = await patch(app, `/events/${eventId}`, { title: 'Updated Title' }, creatorToken);
    expect(res.statusCode).toBe(200);
    expect(res.json().title).toBe('Updated Title');
  });

  it('returns 403 when another user tries to update → 403', async () => {
    const res = await patch(app, `/events/${eventId}`, { title: 'Hacked' }, eventeeToken);
    expect(res.statusCode).toBe(403);
  });
});

// ── Cancel ────────────────────────────────────────────────────────────────────

describe('DELETE /events/:id', () => {
  it('cancels event → 204', async () => {
    const created = await post(app, '/events', baseEvent(), creatorToken);
    const eventId = created.json().id;
    createdEventIds.push(eventId);

    const res = await del(app, `/events/${eventId}`, creatorToken);
    expect(res.statusCode).toBe(204);
  });
});
