import type { FastifyInstance } from 'fastify';
import { createTestApp, post } from './helpers/app';
import { cleanup, disconnectDb, prisma } from './helpers/db';

const RUN = Date.now();
const email = (tag: string) => `auth-${RUN}-${tag}@test.example.com`;

let app: FastifyInstance;
const createdUserIds: string[] = [];

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await cleanup({ userIds: createdUserIds });
  await app.close();
  await disconnectDb();
});

// ── Register ──────────────────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  it('creates an account and returns tokens', async () => {
    const res = await post(app, '/auth/register', {
      email: email('reg1'),
      password: 'Password1!',
      fullName: 'Reg One',
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.email).toBe(email('reg1'));
    expect(body.user.roles).toContain('EVENTEE');
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();

    createdUserIds.push(body.user.id);
  });

  it('adds CREATOR role when becomeCreator=true', async () => {
    const res = await post(app, '/auth/register', {
      email: email('creator'),
      password: 'Password1!',
      fullName: 'Creator One',
      becomeCreator: true,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.roles).toContain('CREATOR');
    expect(body.user.roles).toContain('EVENTEE');

    createdUserIds.push(body.user.id);
  });

  it('returns 409 on duplicate email', async () => {
    const payload = { email: email('dup'), password: 'Password1!', fullName: 'Dup' };
    const first = await post(app, '/auth/register', payload);
    createdUserIds.push(first.json().user.id);

    const res = await post(app, '/auth/register', payload);
    expect(res.statusCode).toBe(409);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  const loginEmail = email('login');

  beforeAll(async () => {
    const res = await post(app, '/auth/register', {
      email: loginEmail,
      password: 'LoginPass1!',
      fullName: 'Login User',
    });
    createdUserIds.push(res.json().user.id);
  });

  it('returns tokens on valid credentials', async () => {
    const res = await post(app, '/auth/login', {
      email: loginEmail,
      password: 'LoginPass1!',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
  });

  it('returns 401 on wrong password', async () => {
    const res = await post(app, '/auth/login', {
      email: loginEmail,
      password: 'wrong-password',
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 on unknown email', async () => {
    const res = await post(app, '/auth/login', {
      email: 'nobody@test.example.com',
      password: 'whatever',
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── Refresh + Logout ──────────────────────────────────────────────────────────

describe('POST /auth/refresh and /auth/logout', () => {
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const res = await post(app, '/auth/register', {
      email: email('session'),
      password: 'SessionPass1!',
      fullName: 'Session User',
    });
    const body = res.json();
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
    createdUserIds.push(body.user.id);
  });

  it('exchanges a refresh token for a new pair', async () => {
    const res = await post(app, '/auth/refresh', { refreshToken });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    // update for the logout test
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });

  it('returns 401 on invalid refresh token', async () => {
    const res = await post(app, '/auth/refresh', { refreshToken: 'bad.token.here' });
    expect(res.statusCode).toBe(401);
  });

  it('logs out successfully', async () => {
    const res = await post(app, '/auth/logout', { refreshToken }, accessToken);
    expect(res.statusCode).toBe(200);
    expect(res.json().message).toBe('Logged out');
  });
});
