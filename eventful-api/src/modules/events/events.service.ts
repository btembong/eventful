import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { scanKeys } from '@/lib/redis-scan';
import env from '@/config/env';
import { metadataSchemaByCategory } from './event-metadata.schema';
import type { EventCategory, Prisma } from '@prisma/client';

// ─── Cache helpers ────────────────────────────────────────────────────────────

const DISCOVERY_TTL = 60;   // seconds
const EVENT_TTL     = 300;  // seconds

function discoveryKey(hash: string) { return `events:discovery:${hash}`; }
function eventKey(id: string)       { return `events:${id}`; }

async function invalidateDiscoveryCache() {
  const keys = await scanKeys('events:discovery:*');
  if (keys.length > 0) await redis.del(...keys);
}

async function invalidateEventCache(id: string) {
  await redis.del(eventKey(id));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clientError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

function generateShareSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(4).toString('hex');
  return `${base}-${year}-${random}`;
}

function validateMetadata(category: EventCategory, metadata: unknown) {
  const schema = metadataSchemaByCategory[category as keyof typeof metadataSchemaByCategory];
  if (!schema) return; // should not happen — category is an enum
  const result = schema.safeParse(metadata);
  if (!result.success) {
    throw clientError(
      `Invalid metadata for category ${category}: ${result.error.issues.map((i) => i.message).join(', ')}`,
      422,
    );
  }
  return result.data;
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateEventInput {
  title: string;
  description: string;
  category: EventCategory;
  venue: string;
  startsAt: string;   // ISO datetime
  endsAt: string;     // ISO datetime
  capacity: number;
  price: number;
  currency?: string;
  country?: string;
  defaultReminderOffsets?: number[];
  metadata?: unknown;
  coverImageUrl?: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  venue?: string;
  startsAt?: string;
  endsAt?: string;
  capacity?: number;
  price?: number;
  currency?: string;
  country?: string;
  defaultReminderOffsets?: number[];
  metadata?: unknown;
  isPublished?: boolean;
  inDiscovery?: boolean;
  confirmationMessage?: string | null;
  coverImageUrl?: string | null;
}

export interface DiscoveryFilters {
  category?: EventCategory;
  country?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  limit?: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const eventsService = {
  async createEvent(creatorId: string, data: CreateEventInput) {
    const validatedMetadata = data.metadata ? validateMetadata(data.category, data.metadata) : undefined;

    const startsAt = new Date(data.startsAt);
    const endsAt   = new Date(data.endsAt);
    if (isNaN(startsAt.getTime())) throw clientError('Invalid startsAt date', 422);
    if (isNaN(endsAt.getTime()))   throw clientError('Invalid endsAt date', 422);
    if (endsAt <= startsAt)        throw clientError('endsAt must be after startsAt', 422);

    // Slug must be unique — retry on collision (extremely rare with random suffix)
    let shareSlug = generateShareSlug(data.title);
    const existing = await prisma.event.findUnique({ where: { shareSlug } });
    if (existing) shareSlug = generateShareSlug(data.title);

    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          creatorId,
          title: data.title,
          description: data.description,
          category: data.category,
          venue: data.venue,
          startsAt,
          endsAt,
          capacity: data.capacity,
          price: data.price,
          currency: data.currency ?? 'XAF',
          shareSlug,
          country: data.country ?? null,
          defaultReminderOffsets: data.defaultReminderOffsets ?? [],
          metadata: (validatedMetadata ?? undefined) as Prisma.InputJsonValue | undefined,
          coverImageUrl: data.coverImageUrl ?? undefined,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: creatorId,
          action: 'event.created',
          entityType: 'Event',
          entityId: created.id,
        },
      });
      return created;
    });

    await invalidateDiscoveryCache();
    return event;
  },

  async getDiscoveryFeed(filters: DiscoveryFilters) {
    const { category, country, from, to, q, page = 1, limit = 20 } = filters;
    const cacheKey = discoveryKey(
      crypto.createHash('sha1').update(JSON.stringify(filters)).digest('hex'),
    );

    // Skip cache for search queries — results must be fresh
    const cached = q ? null : await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const where = {
      isCancelled: false,
      deletedAt: null,
      ...(category ? { category } : {}),
      ...(country  ? { country } : {}),
      ...(from || to
        ? { startsAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {}),
      ...(q ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { venue: { contains: q, mode: 'insensitive' as const } },
        ],
      } : {}),
    };

    const [rawEvents, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { startsAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, title: true, category: true, venue: true,
          startsAt: true, endsAt: true, currency: true,
          shareSlug: true, capacity: true,
          _count: { select: { tickets: true } },
          tiers: {
            where: { isOnSale: true },
            select: { price: true, type: true },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    // Compute accurate min price from live tiers instead of stale event.price
    const events = rawEvents.map(({ tiers, ...ev }) => {
      const paidTiers = tiers.filter((t) => t.type !== 'FREE' && t.type !== 'INVITE_ONLY');
      const hasFree   = tiers.some((t) => t.type === 'FREE');
      const minPrice  = paidTiers.length > 0
        ? Math.min(...paidTiers.map((t) => Number(t.price)))
        : 0;
      return { ...ev, minPrice, isFree: paidTiers.length === 0 || hasFree };
    });

    const result = { events, total, page, limit, pages: Math.ceil(total / limit) };
    await redis.set(cacheKey, JSON.stringify(result), 'EX', DISCOVERY_TTL);
    return result;
  },

  async getEventByShareSlug(shareSlug: string) {
    const cacheKey = `events:slug:${shareSlug}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const event = await prisma.event.findFirst({
      where: { shareSlug, isCancelled: false, deletedAt: null },
      include: {
        creator: { select: { id: true, fullName: true } },
        _count: { select: { tickets: true } },
        tiers: {
          where: { isOnSale: true },
          select: {
            id: true, name: true, type: true, price: true, currency: true,
            capacity: true, sold: true, orderLimit: true, description: true,
            perks: true, salesStart: true, salesEnd: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!event) throw clientError('Event not found', 404);

    await redis.set(cacheKey, JSON.stringify(event), 'EX', EVENT_TTL);
    return event;
  },

  async getEventById(id: string) {
    const cacheKey = eventKey(id);
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const event = await prisma.event.findFirst({
      where: { id, isCancelled: false, deletedAt: null },
      include: {
        creator: { select: { id: true, fullName: true } },
        _count: { select: { tickets: true } },
      },
    });
    if (!event) throw clientError('Event not found', 404);

    await redis.set(cacheKey, JSON.stringify(event), 'EX', EVENT_TTL);
    return event;
  },

  async updateEvent(id: string, creatorId: string, data: UpdateEventInput) {
    const event = await prisma.event.findFirst({
      where: { id, deletedAt: null },
    });
    if (!event)                     throw clientError('Event not found', 404);
    if (event.creatorId !== creatorId) throw clientError('Forbidden', 403);
    if (event.isCancelled)          throw clientError('Cannot update a cancelled event', 409);

    const mergedMetadata = data.metadata
      ? { ...(event.metadata as Record<string, unknown> ?? {}), ...(data.metadata as Record<string, unknown>) }
      : undefined;
    const validatedMetadata = mergedMetadata
      ? validateMetadata(event.category, mergedMetadata)
      : undefined;

    const changedFields = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => k);

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.event.update({
        where: { id },
        data: {
          ...(data.title       ? { title: data.title }             : {}),
          ...(data.description ? { description: data.description } : {}),
          ...(data.venue       ? { venue: data.venue }             : {}),
          ...(data.startsAt    ? { startsAt: new Date(data.startsAt) } : {}),
          ...(data.endsAt      ? { endsAt: new Date(data.endsAt) }     : {}),
          ...(data.capacity    !== undefined ? { capacity: data.capacity }  : {}),
          ...(data.price       !== undefined ? { price: data.price }        : {}),
          ...(data.currency    ? { currency: data.currency }       : {}),
          ...(data.country    !== undefined ? { country: data.country } : {}),
          ...(data.defaultReminderOffsets ? { defaultReminderOffsets: data.defaultReminderOffsets } : {}),
          ...(validatedMetadata ? { metadata: validatedMetadata as Prisma.InputJsonValue } : {}),
          ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
          ...(data.inDiscovery  !== undefined ? { inDiscovery:  data.inDiscovery  } : {}),
          ...(data.confirmationMessage !== undefined ? { confirmationMessage: data.confirmationMessage } : {}),
          ...(data.coverImageUrl !== undefined ? { coverImageUrl: data.coverImageUrl } : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: creatorId,
          action: 'event.updated',
          entityType: 'Event',
          entityId: id,
          meta: { changedFields },
        },
      });
      return u;
    });

    await Promise.all([invalidateEventCache(id), invalidateDiscoveryCache()]);
    return updated;
  },

  async cancelEvent(id: string, creatorId: string) {
    const event = await prisma.event.findFirst({
      where: { id, deletedAt: null },
    });
    if (!event)                     throw clientError('Event not found', 404);
    if (event.creatorId !== creatorId) throw clientError('Forbidden', 403);
    if (event.isCancelled)          throw clientError('Event is already cancelled', 409);

    await prisma.$transaction([
      prisma.event.update({ where: { id }, data: { isCancelled: true } }),
      prisma.auditLog.create({
        data: {
          actorId: creatorId,
          action: 'event.cancelled',
          entityType: 'Event',
          entityId: id,
        },
      }),
    ]);

    await Promise.all([invalidateEventCache(id), invalidateDiscoveryCache()]);
  },

  async getShareLinks(id: string) {
    const event = await prisma.event.findFirst({
      where: { id, isCancelled: false, deletedAt: null },
      select: { id: true, title: true, shareSlug: true },
    });
    if (!event) throw clientError('Event not found', 404);

    const url = `${env.APP_BASE_URL}/e/${event.shareSlug}`;
    const text = encodeURIComponent(`Check out "${event.title}" on Eventful!`);
    return {
      url,
      whatsapp: `https://wa.me/?text=${text}%20${encodeURIComponent(url)}`,
      twitter:  `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };
  },

  async getCreatorEvents(creatorId: string, page = 1, limit = 20) {
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where: { creatorId, deletedAt: null },
        orderBy: { startsAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { tickets: true } } },
      }),
      prisma.event.count({ where: { creatorId, deletedAt: null } }),
    ]);
    return { events, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async getEventAttendees(eventId: string, creatorId: string, page = 1, limit = 50) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { creatorId: true },
    });
    if (!event)                        throw clientError('Event not found', 404);
    if (event.creatorId !== creatorId) throw clientError('Forbidden', 403);

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where: { eventId },
        orderBy: { purchasedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, status: true, purchasedAt: true, checkedInAt: true,
          eventee: { select: { id: true, fullName: true, email: true } },
        },
      }),
      prisma.ticket.count({ where: { eventId } }),
    ]);
    return { tickets, total, page, limit, pages: Math.ceil(total / limit) };
  },
};
