import type { FastifyInstance } from 'fastify';
import { requireAuth } from '@/middleware/auth.guard';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export default async function apiKeysRoutes(app: FastifyInstance) {

  // POST /api-keys — create a new API key
  app.post<{
    Body: { name: string; scopes: string[]; expiresInDays?: number };
  }>('/', {
    schema: {
      tags: ['API Keys'],
      summary: 'Create a new API key (shown once — store it securely)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'scopes'],
        properties: {
          name:          { type: 'string', minLength: 1, maxLength: 80, description: 'Human-readable label, e.g. "CI deploy key"' },
          scopes:        { type: 'array', items: { type: 'string' }, minItems: 1, description: 'e.g. ["events:read","tickets:write"]' },
          expiresInDays: { type: 'integer', minimum: 1, maximum: 3650, description: 'Days until expiry — omit for no expiry' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id:     { type: 'string' },
            name:   { type: 'string' },
            key:    { type: 'string', description: 'Full API key — only returned once. Store this value.' },
            prefix: { type: 'string' },
            scopes: { type: 'array', items: { type: 'string' } },
            expiresAt: { type: 'string', nullable: true },
          },
        },
      },
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    // Generate: evtk_<32 random bytes as hex> = "evtk_" + 64 hex chars = 69 chars total
    const rawKey  = `evtk_${randomBytes(32).toString('hex')}`;
    const prefix  = rawKey.slice(0, 12); // "evtk_XXXXXXX" — first 12 chars
    const keyHash = await bcrypt.hash(rawKey, 10); // 10 rounds — fast enough for key lookup

    const expiresAt = req.body.expiresInDays
      ? new Date(Date.now() + req.body.expiresInDays * 86_400_000)
      : null;

    const apiKey = await prisma.apiKey.create({
      data: {
        userId:    req.user!.id,
        name:      req.body.name,
        prefix,
        keyHash,
        scopes:    req.body.scopes,
        expiresAt,
      },
    });

    // Return the raw key — this is the ONLY time it is ever returned
    return reply.status(201).send({
      id:        apiKey.id,
      name:      apiKey.name,
      key:        rawKey,
      prefix:    apiKey.prefix,
      scopes:    apiKey.scopes,
      expiresAt: apiKey.expiresAt?.toISOString() ?? null,
    });
  });

  // GET /api-keys — list all keys for the current user (no secrets)
  app.get('/', {
    schema: {
      tags: ['API Keys'],
      summary: 'List API keys for the authenticated user',
      security: [{ bearerAuth: [] }],
    },
    preHandler: requireAuth,
  }, async (req) => {
    return prisma.apiKey.findMany({
      where: { userId: req.user!.id, revokedAt: null },
      select: {
        id: true, name: true, prefix: true, scopes: true,
        expiresAt: true, lastUsedAt: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  // DELETE /api-keys/:id — revoke a key
  app.delete<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['API Keys'],
      summary: 'Revoke an API key',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      response: { 200: { type: 'object', properties: { message: { type: 'string' } } } },
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    const key = await prisma.apiKey.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!key) return reply.status(404).send({ error: 'API key not found' });
    if (key.revokedAt) return reply.status(409).send({ error: 'Already revoked' });

    await prisma.apiKey.update({
      where: { id: req.params.id },
      data:  { revokedAt: new Date() },
    });

    return reply.send({ message: 'API key revoked' });
  });
}
