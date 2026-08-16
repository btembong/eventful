import type { FastifyInstance } from 'fastify';
import { requireCreator, requireAuth } from '@/middleware/auth.guard';
import prisma from '@/lib/prisma';

export default async function eventMembersRoutes(app: FastifyInstance) {

  // GET /events/:id/members — list event team members (creator only)
  app.get<{ Params: { id: string } }>('/:id/members', {
    schema: {
      tags: ['Event Members'],
      summary: 'List team members for an event (CREATOR)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { creatorId: true },
    });
    if (!event) return reply.status(404).send({ error: 'Event not found' });
    if (event.creatorId !== req.user!.id) return reply.status(403).send({ error: 'Forbidden' });

    return prisma.eventMember.findMany({
      where: { eventId: req.params.id },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  });

  // POST /events/:id/members — invite a user to the event team
  app.post<{
    Params: { id: string };
    Body:   { userId: string; role: 'SCANNER' | 'FINANCE_VIEWER' | 'CO_ORGANIZER' };
  }>('/:id/members', {
    schema: {
      tags: ['Event Members'],
      summary: 'Add a team member to an event (CREATOR)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['userId', 'role'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          role:   { type: 'string', enum: ['SCANNER', 'FINANCE_VIEWER', 'CO_ORGANIZER'] },
        },
      },
      response: { 201: { type: 'object', additionalProperties: true } },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { creatorId: true },
    });
    if (!event) return reply.status(404).send({ error: 'Event not found' });
    if (event.creatorId !== req.user!.id) return reply.status(403).send({ error: 'Forbidden' });

    // Prevent creator from adding themselves
    if (req.body.userId === req.user!.id) {
      return reply.status(409).send({ error: 'You are already the event owner' });
    }

    const invitee = await prisma.user.findFirst({
      where: { id: req.body.userId, deletedAt: null },
      select: { id: true },
    });
    if (!invitee) return reply.status(404).send({ error: 'User not found' });

    const member = await prisma.eventMember.upsert({
      where: { eventId_userId: { eventId: req.params.id, userId: req.body.userId } },
      update: { role: req.body.role },
      create: { eventId: req.params.id, userId: req.body.userId, role: req.body.role },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });

    return reply.status(201).send(member);
  });

  // DELETE /events/:id/members/:userId — remove a team member
  app.delete<{ Params: { id: string; userId: string } }>('/:id/members/:userId', {
    schema: {
      tags: ['Event Members'],
      summary: 'Remove a team member from an event (CREATOR)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'userId'],
        properties: {
          id:     { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
        },
      },
      response: { 200: { type: 'object', properties: { message: { type: 'string' } } } },
    },
    preHandler: requireCreator,
  }, async (req, reply) => {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { creatorId: true },
    });
    if (!event) return reply.status(404).send({ error: 'Event not found' });
    if (event.creatorId !== req.user!.id) return reply.status(403).send({ error: 'Forbidden' });

    const { count } = await prisma.eventMember.deleteMany({
      where: { eventId: req.params.id, userId: req.params.userId },
    });
    if (count === 0) return reply.status(404).send({ error: 'Member not found' });

    return reply.send({ message: 'Member removed' });
  });

  // GET /events/my-assignments — list events where the authenticated user is a team member
  app.get('/my-assignments', {
    schema: {
      tags: ['Event Members'],
      summary: 'List events where the current user has been assigned a team role',
      security: [{ bearerAuth: [] }],
    },
    preHandler: requireAuth,
  }, async (req) => {
    return prisma.eventMember.findMany({
      where: { userId: req.user!.id },
      include: {
        event: {
          select: { id: true, title: true, startsAt: true, venue: true, creatorId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });
}
