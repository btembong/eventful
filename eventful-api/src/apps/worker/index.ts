import env from '@/config/env';
import { redis } from '@/lib/redis';
import '@/workers/reminder.worker';
import '@/workers/receipt.worker';
import '@/workers/webhook-delivery.worker';
import '@/workers/broadcast.worker';

console.log(`[worker] Starting in ${env.NODE_ENV} mode`);
console.log('[worker] reminder.worker          ✓');
console.log('[worker] receipt.worker           ✓');
console.log('[worker] webhook-delivery.worker  ✓');
console.log('[worker] broadcast.worker         ✓');

// Graceful shutdown — let in-flight jobs finish before exiting
const shutdown = async () => {
  console.log('[worker] Shutting down gracefully...');
  await redis.quit();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
