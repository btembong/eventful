import * as Sentry from '@sentry/node';
import env from '@/config/env';

/**
 * Initialise Sentry once at server startup.
 * No-ops silently when SENTRY_DSN is not set (development / local).
 */
export function initSentry(): void {
  if (!env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

/** Capture an error, enriched with optional context. */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!env.SENTRY_DSN) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}
