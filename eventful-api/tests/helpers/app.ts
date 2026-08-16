import type { FastifyInstance } from 'fastify';
import { buildApp } from '@/apps/api';

/**
 * Build the Fastify app once per test file.
 * Call in beforeAll, close in afterAll.
 */
export async function createTestApp(): Promise<FastifyInstance> {
  return buildApp();
}

/** Convenience: POST JSON and return the response. */
export async function post(app: FastifyInstance, url: string, payload: object, token?: string) {
  const res = await app.inject({
    method: 'POST',
    url,
    payload,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return res;
}

/** Convenience: GET and return the response. */
export async function get(app: FastifyInstance, url: string, token?: string) {
  const res = await app.inject({
    method: 'GET',
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return res;
}

/** Convenience: PATCH JSON. */
export async function patch(app: FastifyInstance, url: string, payload: object, token?: string) {
  const res = await app.inject({
    method: 'PATCH',
    url,
    payload,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return res;
}

/** Convenience: DELETE. */
export async function del(app: FastifyInstance, url: string, token?: string) {
  const res = await app.inject({
    method: 'DELETE',
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return res;
}
