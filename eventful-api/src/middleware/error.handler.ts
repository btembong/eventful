import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { captureError } from '@/lib/sentry';

export function errorHandler(
  error: FastifyError,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const statusCode = error.statusCode ?? 500;

  if (statusCode >= 500) {
    reply.log.error(error);
    captureError(error, {
      url:    req.url,
      method: req.method,
      userId: req.user?.id,
    });
  }

  reply.status(statusCode).send({
    error: error.name ?? 'InternalServerError',
    message: statusCode < 500 ? error.message : 'An unexpected error occurred',
    ...(process.env.NODE_ENV !== 'production' && statusCode >= 500
      ? { stack: error.stack }
      : {}),
  });
}
