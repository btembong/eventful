import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Role } from '@prisma/client';
import { jwtLib } from '@/lib/jwt';
import { redis } from '@/lib/redis';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

// Augment FastifyRequest so req.user is typed everywhere
declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; roles: Role[] };
    scannerEventId?: string; // set when authenticated via scanner token
  }
}

// ── Internal helper ──────────────────────────────────────────────────────────

/**
 * Populate req.user from the Authorization header.
 * Accepts two schemes:
 *   Bearer <jwt>     — standard JWT access token
 *   ApiKey evtk_…   — long-lived API key (looked up by prefix + bcrypt verify)
 *
 * Returns true on success, false if the header is missing or invalid.
 */
async function authenticate(req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Missing Authorization header' });
    return false;
  }

  // ── Bearer JWT ─────────────────────────────────────────────────────────────
  if (authHeader.startsWith('Bearer ')) {
    try {
      const payload = jwtLib.verifyAccess(authHeader.slice(7));
      req.user = { id: payload.sub, roles: payload.roles };
      return true;
    } catch {
      reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
      return false;
    }
  }

  // ── API Key ────────────────────────────────────────────────────────────────
  if (authHeader.startsWith('ApiKey ')) {
    const rawKey = authHeader.slice(7);
    if (!rawKey.startsWith('evtk_')) {
      reply.status(401).send({ error: 'Unauthorized', message: 'Invalid API key format' });
      return false;
    }

    const prefix = rawKey.slice(0, 12);
    const apiKey = await prisma.apiKey.findUnique({
      where: { prefix },
      include: { user: { select: { id: true, roles: true, deletedAt: true } } },
    });

    if (!apiKey || apiKey.revokedAt || apiKey.user.deletedAt) {
      reply.status(401).send({ error: 'Unauthorized', message: 'API key not found or revoked' });
      return false;
    }
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      reply.status(401).send({ error: 'Unauthorized', message: 'API key has expired' });
      return false;
    }

    const valid = await bcrypt.compare(rawKey, apiKey.keyHash);
    if (!valid) {
      reply.status(401).send({ error: 'Unauthorized', message: 'Invalid API key' });
      return false;
    }

    // Update lastUsedAt non-blocking
    prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

    req.user = { id: apiKey.user.id, roles: apiKey.user.roles };
    return true;
  }

  reply.status(401).send({ error: 'Unauthorized', message: 'Unsupported auth scheme — use Bearer or ApiKey' });
  return false;
}

// ── Exported middleware ───────────────────────────────────────────────────────

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await authenticate(req, reply);
}

export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const ok = await authenticate(req, reply);
    if (!ok) return;
    if (!roles.some((r) => req.user!.roles.includes(r))) {
      reply.status(403).send({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
  };
}

export async function requireCreator(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const ok = await authenticate(req, reply);
  if (!ok) return;
  if (!req.user!.roles.includes('CREATOR')) {
    reply.status(403).send({ error: 'Forbidden', message: 'Creator role required' });
  }
}

/**
 * Accepts either:
 *  1. Creator Bearer JWT  — req.user.roles includes CREATOR
 *  2. Scanner Bearer JWT  — signed scanner token with matching eventId
 *
 * The route must be mounted under a path that has `/:id` (eventId) as a param.
 * On scanner auth: sets req.scannerEventId so the handler can skip ownership check.
 */
export async function requireScannerOrCreator(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Missing Bearer token' });
    return;
  }

  const token = authHeader.slice(7);

  // Try scanner token first
  try {
    const payload = jwtLib.verifyScanner(token);
    // Check the token hasn't been revoked in Redis
    const stored = await redis.get(`scanner_token:${payload.sub}`);
    if (!stored) {
      reply.status(401).send({ error: 'Unauthorized', message: 'Scanner token revoked or expired' });
      return;
    }
    // Token must be scoped to this event
    if (payload.eventId !== req.params.id) {
      reply.status(403).send({ error: 'Forbidden', message: 'Scanner token not valid for this event' });
      return;
    }
    req.scannerEventId = payload.eventId;
    // Provide a minimal user so handlers that read req.user don't crash
    req.user = { id: payload.creatorId, roles: [] };
    return;
  } catch { /* not a scanner token — fall through to creator check */ }

  // Try creator JWT
  const ok = await authenticate(req, reply);
  if (!ok) return;
  if (!req.user!.roles.includes('CREATOR')) {
    reply.status(403).send({ error: 'Forbidden', message: 'Creator or scanner token required' });
  }
}
