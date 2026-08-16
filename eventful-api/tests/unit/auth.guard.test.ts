import type { FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth, requireRole, requireCreator } from '@/middleware/auth.guard';
import { jwtLib } from '@/lib/jwt';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReply() {
  const reply = {
    status: jest.fn().mockReturnThis(),
    send:   jest.fn().mockReturnThis(),
  } as unknown as FastifyReply;
  return reply;
}

function makeRequest(overrides: Partial<FastifyRequest> = {}): FastifyRequest {
  return { headers: {}, ...overrides } as unknown as FastifyRequest;
}

const done = jest.fn();

// ── requireAuth ───────────────────────────────────────────────────────────────

describe('requireAuth', () => {
  beforeEach(() => done.mockClear());

  it('calls done() when a valid Bearer token is provided', () => {
    const token = jwtLib.signAccess('user-1', ['EVENTEE']);
    const req   = makeRequest({ headers: { authorization: `Bearer ${token}` } });
    const reply = makeReply();

    requireAuth(req, reply, done);

    expect(done).toHaveBeenCalledTimes(1);
    expect(req.user?.id).toBe('user-1');
    expect(req.user?.roles).toContain('EVENTEE');
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('sends 401 when Authorization header is missing', () => {
    const req   = makeRequest({ headers: {} });
    const reply = makeReply();

    requireAuth(req, reply, done);

    expect(done).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('sends 401 for a malformed token', () => {
    const req   = makeRequest({ headers: { authorization: 'Bearer not.a.jwt' } });
    const reply = makeReply();

    requireAuth(req, reply, done);

    expect(done).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('sends 401 when the token is missing the Bearer prefix', () => {
    const token = jwtLib.signAccess('user-1', ['EVENTEE']);
    const req   = makeRequest({ headers: { authorization: token } });
    const reply = makeReply();

    requireAuth(req, reply, done);

    expect(done).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(401);
  });
});

// ── requireRole ───────────────────────────────────────────────────────────────

describe('requireRole', () => {
  beforeEach(() => done.mockClear());

  it('calls done() when the user has the required role', () => {
    const req   = makeRequest({ user: { id: 'u', roles: ['CREATOR', 'EVENTEE'] } } as any);
    const reply = makeReply();

    requireRole('CREATOR')(req, reply, done);

    expect(done).toHaveBeenCalledTimes(1);
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('sends 403 when the user lacks the required role', () => {
    const req   = makeRequest({ user: { id: 'u', roles: ['EVENTEE'] } } as any);
    const reply = makeReply();

    requireRole('CREATOR')(req, reply, done);

    expect(done).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('sends 403 when user is not set on request', () => {
    const req   = makeRequest();
    const reply = makeReply();

    requireRole('CREATOR')(req, reply, done);

    expect(done).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('accepts any of multiple allowed roles', () => {
    const req   = makeRequest({ user: { id: 'u', roles: ['ADMIN'] } } as any);
    const reply = makeReply();

    requireRole('CREATOR', 'ADMIN')(req, reply, done);

    expect(done).toHaveBeenCalledTimes(1);
  });
});

// ── requireCreator ────────────────────────────────────────────────────────────

describe('requireCreator', () => {
  beforeEach(() => done.mockClear());

  it('calls done() for a valid CREATOR token', () => {
    const token = jwtLib.signAccess('creator-1', ['CREATOR', 'EVENTEE']);
    const req   = makeRequest({ headers: { authorization: `Bearer ${token}` } });
    const reply = makeReply();

    requireCreator(req, reply, done);

    expect(done).toHaveBeenCalledTimes(1);
  });

  it('sends 403 for an EVENTEE-only token', () => {
    const token = jwtLib.signAccess('eventee-1', ['EVENTEE']);
    const req   = makeRequest({ headers: { authorization: `Bearer ${token}` } });
    const reply = makeReply();

    requireCreator(req, reply, done);

    expect(done).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(403);
  });
});
