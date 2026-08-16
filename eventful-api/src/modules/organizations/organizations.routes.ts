import type { FastifyInstance } from 'fastify';
import { requireAuth } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';

export default async function organizationsRoutes(app: FastifyInstance) {

  // POST /organizations — create an organization
  app.post<{
    Body: { name: string; slug: string; logoUrl?: string; website?: string };
  }>('/', {
    schema: {
      tags: ['Organizations'],
      summary: 'Create a new organization',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name:    { type: 'string', minLength: 2 },
          slug:    { type: 'string', minLength: 2, pattern: '^[a-z0-9-]+$', description: 'URL-safe slug, e.g. "acme-events"' },
          logoUrl: { type: 'string', format: 'uri' },
          website: { type: 'string', format: 'uri' },
        },
      },
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    const existing = await prisma.organization.findUnique({ where: { slug: req.body.slug } });
    if (existing) return reply.status(409).send({ error: 'Slug already taken' });

    const org = await prisma.organization.create({
      data: {
        name:    req.body.name,
        slug:    req.body.slug,
        logoUrl: req.body.logoUrl,
        website: req.body.website,
        members: {
          create: { userId: req.user!.id, role: 'OWNER' },
        },
      },
      include: { members: { include: { user: { select: { id: true, fullName: true, email: true } } } } },
    });

    return reply.status(201).send(org);
  });

  // GET /organizations/:slug — get org by slug (public)
  app.get<{ Params: { slug: string } }>('/:slug', {
    schema: {
      tags: ['Organizations'],
      summary: 'Get organization by slug',
      params: {
        type: 'object',
        required: ['slug'],
        properties: { slug: { type: 'string' } },
      },
    },
  }, async (req, reply) => {
    const org = await prisma.organization.findUnique({
      where: { slug: req.params.slug },
      include: { members: { include: { user: { select: { id: true, fullName: true, email: true } } } } },
    });
    if (!org) return reply.status(404).send({ error: 'Organization not found' });
    return org;
  });

  // GET /organizations/me — list orgs the current user belongs to
  app.get('/me', {
    schema: {
      tags: ['Organizations'],
      summary: 'List organizations the authenticated user belongs to',
      security: [{ bearerAuth: [] }],
    },
    preHandler: requireAuth,
  }, async (req) => {
    return prisma.orgMember.findMany({
      where: { userId: req.user!.id },
      include: { org: true },
      orderBy: { joinedAt: 'desc' },
    });
  });

  // POST /organizations/:slug/members — invite a member
  app.post<{
    Params: { slug: string };
    Body:   { userId: string; role?: 'ADMIN' | 'MEMBER' };
  }>('/:slug/members', {
    schema: {
      tags: ['Organizations'],
      summary: 'Invite a user to an organization (OWNER or ADMIN)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['slug'],
        properties: { slug: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          role:   { type: 'string', enum: ['ADMIN', 'MEMBER'], default: 'MEMBER' },
        },
      },
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    const org = await prisma.organization.findUnique({ where: { slug: req.params.slug } });
    if (!org) return reply.status(404).send({ error: 'Organization not found' });

    const myMembership = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: req.user!.id } },
    });
    if (!myMembership || !['OWNER', 'ADMIN'].includes(myMembership.role)) {
      return reply.status(403).send({ error: 'Forbidden — only OWNER or ADMIN can invite members' });
    }

    const invitee = await prisma.user.findFirst({
      where: { id: req.body.userId, deletedAt: null },
      select: { id: true },
    });
    if (!invitee) return reply.status(404).send({ error: 'User not found' });

    const member = await prisma.orgMember.upsert({
      where: { orgId_userId: { orgId: org.id, userId: req.body.userId } },
      update: { role: req.body.role ?? 'MEMBER' },
      create: { orgId: org.id, userId: req.body.userId, role: req.body.role ?? 'MEMBER' },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });

    return reply.status(201).send(member);
  });

  // DELETE /organizations/:slug/members/:userId — remove member
  app.delete<{ Params: { slug: string; userId: string } }>('/:slug/members/:userId', {
    schema: {
      tags: ['Organizations'],
      summary: 'Remove a member from an organization (OWNER only)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['slug', 'userId'],
        properties: {
          slug:   { type: 'string' },
          userId: { type: 'string', format: 'uuid' },
        },
      },
      response: { 200: { type: 'object', properties: { message: { type: 'string' } } } },
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    const org = await prisma.organization.findUnique({ where: { slug: req.params.slug } });
    if (!org) return reply.status(404).send({ error: 'Organization not found' });

    const myMembership = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: req.user!.id } },
    });
    if (!myMembership || myMembership.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Forbidden — only OWNER can remove members' });
    }

    const target = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: req.params.userId } },
    });
    if (!target) return reply.status(404).send({ error: 'Member not found' });
    if (target.role === 'OWNER') return reply.status(409).send({ error: 'Cannot remove the OWNER' });

    await prisma.orgMember.delete({
      where: { orgId_userId: { orgId: org.id, userId: req.params.userId } },
    });

    return reply.send({ message: 'Member removed' });
  });

  // DELETE /organizations/:slug — delete org (OWNER only)
  app.delete<{ Params: { slug: string } }>('/:slug', {
    schema: {
      tags: ['Organizations'],
      summary: 'Delete an organization (OWNER only)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['slug'],
        properties: { slug: { type: 'string' } },
      },
      response: { 200: { type: 'object', properties: { message: { type: 'string' } } } },
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    const org = await prisma.organization.findUnique({ where: { slug: req.params.slug } });
    if (!org) return reply.status(404).send({ error: 'Organization not found' });

    const myMembership = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: req.user!.id } },
    });
    if (!myMembership || myMembership.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    await prisma.$transaction([
      prisma.orgMember.deleteMany({ where: { orgId: org.id } }),
      prisma.organization.delete({ where: { id: org.id } }),
    ]);

    return reply.send({ message: 'Organization deleted' });
  });
}
