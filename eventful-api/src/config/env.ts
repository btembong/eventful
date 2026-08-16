import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  QR_SIGNING_SECRET: z.string().min(32, 'QR_SIGNING_SECRET must be at least 32 chars'),

  // Tranzak — get keys from https://developer.tranzak.me
  TRANZAK_APP_ID: z.string().min(1, 'TRANZAK_APP_ID is required'),
  TRANZAK_APP_KEY: z.string().min(1, 'TRANZAK_APP_KEY is required'),
  // "sandbox" | "production" — controls which base URL the client uses
  TRANZAK_ENV: z.enum(['sandbox', 'production']).default('sandbox'),

  // Brevo (transactional email — https://app.brevo.com)
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().email().optional(),
  BREVO_SENDER_NAME: z.string().optional(),

  AFRICAS_TALKING_API_KEY: z.string().optional(),
  AFRICAS_TALKING_USERNAME: z.string().optional(),

  APP_BASE_URL: z.string().url().default('http://localhost:3000'),

  // Platform fee charged on every paid ticket (percentage, e.g. 5 = 5%)
  PLATFORM_FEE_PCT: z.coerce.number().min(0).max(100).default(5),

  // Cloudinary — server-side (signed ops, deletions)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Sentry error tracking — optional in development, required in production
  SENTRY_DSN: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

const env: Env = parsed.data;

export default env;
