import { redis } from '@/lib/redis';

/**
 * Non-blocking replacement for redis.keys(pattern).
 *
 * Uses SCAN with a cursor so Redis is never blocked for a long time.
 * Safe at any keyspace size — iterates in batches of 200.
 */
export async function scanKeys(pattern: string): Promise<string[]> {
  const results: string[] = [];
  let cursor = '0';

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
    cursor = nextCursor;
    results.push(...keys);
  } while (cursor !== '0');

  return results;
}
