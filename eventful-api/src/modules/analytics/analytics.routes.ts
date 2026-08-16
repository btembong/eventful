import type { FastifyInstance } from 'fastify';
import { requireAuth, requireCreator, requireRole } from '@/middleware/auth.guard';
import { analyticsService } from './analytics.service';

export default async function analyticsRoutes(app: FastifyInstance) {
  // ── Creator: all-time stats ───────────────────────────────────────────────

  app.get(
    '/creators/me/analytics',
    {
      onRequest: [requireCreator],
      schema: {
        tags: ['Analytics'],
        summary: 'All-time stats for the authenticated creator',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      return analyticsService.getCreatorStats(req.user!.id);
    },
  );

  // ── Creator: per-event stats ──────────────────────────────────────────────

  app.get(
    '/creators/me/events/:id/analytics',
    {
      onRequest: [requireCreator],
      schema: {
        tags: ['Analytics'],
        summary: 'Per-event analytics for the authenticated creator',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (req) => {
      const { id } = req.params as { id: string };
      return analyticsService.getEventStats(id, req.user!.id);
    },
  );

  // ── Admin: platform-wide totals ───────────────────────────────────────────

  app.get(
    '/admin/analytics',
    {
      onRequest: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Analytics'],
        summary: 'Platform-wide totals (admin only)',
        security: [{ bearerAuth: [] }],
      },
    },
    async () => {
      return analyticsService.getPlatformStats();
    },
  );
}
