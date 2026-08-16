import Redis from 'ioredis';
import env from '@/config/env';

// maxRetriesPerRequest: null is required by BullMQ
const globalForRedis = globalThis as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

if (env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export default redis;
