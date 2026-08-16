import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { scanKeys } from '@/lib/redis-scan';
import { jwtLib, parseTtlToSeconds } from '@/lib/jwt';
import { notificationsService } from '@/modules/notifications/notifications.service';
import { tplVerifyEmail, tplPasswordReset } from '@/modules/notifications/email-templates';
import env from '@/config/env';

const BCRYPT_ROUNDS    = 12;
const MAX_ATTEMPTS     = 5;        // lock after this many failures
const LOCKOUT_SECONDS  = 15 * 60;  // 15 minutes
const RESET_TTL        = 15 * 60;  // password reset token: 15 minutes
const VERIFY_TTL       = 24 * 3600; // email verification token: 24 hours

// ─── Redis key helpers ─────────────────────────────────────────────────────

const refreshKey  = (userId: string, jti: string) => `refresh:${userId}:${jti}`;
const failKey     = (email: string)                => `auth:failed:${email}`;
const resetKey    = (token: string)                => `auth:reset:${token}`;
const verifyKey   = (token: string)                => `auth:verify:${token}`;

// ─── Helpers ───────────────────────────────────────────────────────────────

function clientError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

function secureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ─── Service ───────────────────────────────────────────────────────────────

export const authService = {

  async register(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    roles?: Role[];
  }) {
    const existing = await prisma.user.findFirst({
      where: { email: data.email, deletedAt: null },
    });
    if (existing) throw clientError('Email already registered', 409);

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email:        data.email,
        passwordHash,
        fullName:     data.fullName,
        phone:        data.phone,
        roles:        data.roles ?? ['EVENTEE'],
      },
      select: { id: true, email: true, fullName: true, roles: true, createdAt: true },
    });

    // Send verification email (non-blocking — don't fail registration if email fails)
    authService.sendVerificationEmail(user.id, user.email, user.fullName)
      .then(() => console.info('[auth] Verification email sent to', user.email))
      .catch((err) => console.error('[auth] Failed to send verification email:', err));

    const tokens = await issueTokens(user.id, user.roles);
    return { user, ...tokens };
  },

  async login(data: { email: string; password: string }) {
    // ── Brute force check ──────────────────────────────────────────────────
    const fk       = failKey(data.email);
    const attempts = await redis.get(fk);
    if (attempts && parseInt(attempts, 10) >= MAX_ATTEMPTS) {
      throw clientError(
        `Too many failed attempts. Please wait 15 minutes before trying again.`,
        429,
      );
    }

    const user = await prisma.user.findFirst({
      where: { email: data.email, deletedAt: null },
    });

    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      // Increment failure counter
      const current = await redis.incr(fk);
      if (current === 1) await redis.expire(fk, LOCKOUT_SECONDS);

      const remaining = MAX_ATTEMPTS - current;
      const msg = remaining > 0
        ? `Invalid credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Account temporarily locked due to too many failed attempts.';
      throw clientError(msg, 401);
    }

    // Successful login — clear failure counter
    await redis.del(fk);

    // Email verification gate
    if (!user.emailVerifiedAt) {
      throw clientError(
        'Please verify your email before signing in. Check your inbox for the verification link.',
        403,
      );
    }

    // MFA gate: if enabled, issue a short-lived challenge instead of tokens
    if (user.mfaEnabled) {
      const { mfaService } = await import('./mfa.service');
      const mfaToken = await mfaService.createMfaChallenge(user.id);
      return { requiresMfa: true, mfaToken } as unknown as ReturnType<typeof issueTokens> & { requiresMfa: true; mfaToken: string };
    }

    const tokens = await issueTokens(user.id, user.roles);
    return {
      user: {
        id: user.id, email: user.email, fullName: user.fullName, roles: user.roles,
        emailVerifiedAt: user.emailVerifiedAt,
      },
      ...tokens,
    };
  },

  async refresh(refreshToken: string) {
    let payload: { sub: string; jti: string };
    try {
      payload = jwtLib.verifyRefresh(refreshToken);
    } catch {
      throw clientError('Invalid or expired refresh token', 401);
    }

    const key    = refreshKey(payload.sub, payload.jti);
    const exists = await redis.exists(key);
    if (!exists) throw clientError('Refresh token revoked or expired', 401);

    await redis.del(key);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, roles: true, deletedAt: true },
    });
    if (!user || user.deletedAt) throw clientError('User not found', 401);

    return issueTokens(user.id, user.roles);
  },

  async logout(userId: string, jti: string) {
    await redis.del(refreshKey(userId, jti));
  },

  // ── Email verification ─────────────────────────────────────────────────

  async sendVerificationEmail(userId: string, email: string, fullName: string) {
    const token = secureToken();
    await redis.set(verifyKey(token), userId, 'EX', VERIFY_TTL);

    const frontendUrl = env.APP_BASE_URL.replace(':3000', ':3000'); // marketing site on :3000
    const link = `${frontendUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    await notificationsService.sendEmail(
      email,
      'Verify your Eventful account',
      tplVerifyEmail({ fullName, verifyUrl: link }),
    );
  },

  async verifyEmail(token: string) {
    const userId = await redis.get(verifyKey(token));
    if (!userId) throw clientError('Verification link is invalid or has expired', 400);

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });

    await redis.del(verifyKey(token));
    return { message: 'Email verified successfully' };
  },

  async resendVerification(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, emailVerifiedAt: true },
    });
    if (!user) throw clientError('User not found', 404);
    if (user.emailVerifiedAt) throw clientError('Email is already verified', 400);

    await authService.sendVerificationEmail(user.id, user.email, user.fullName);
    return { message: 'Verification email sent' };
  },

  // ── Password reset ─────────────────────────────────────────────────────

  async forgotPassword(email: string) {
    // Always respond the same way — no user enumeration
    const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const token = secureToken();
    await redis.set(resetKey(token), user.id, 'EX', RESET_TTL);

    const link = `${env.APP_BASE_URL}/reset-password?token=${token}`;

    await notificationsService.sendEmail(
      user.email,
      'Reset your Eventful password',
      tplPasswordReset({ fullName: user.fullName, resetUrl: link }),
    );

    return { message: 'If that email exists, a reset link has been sent.' };
  },

  async resetPassword(token: string, newPassword: string) {
    const userId = await redis.get(resetKey(token));
    if (!userId) throw clientError('Reset link is invalid or has expired', 400);

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    // Invalidate ALL refresh tokens for this user
    const pattern = `refresh:${userId}:*`;
    const keys    = await scanKeys(pattern);
    if (keys.length > 0) await redis.del(...keys);

    await redis.del(resetKey(token));
    return { message: 'Password updated. Please sign in again.' };
  },

  // ── Session management ────────────────────────────────────────────────

  async listSessions(userId: string) {
    const keys = await scanKeys(`refresh:${userId}:*`);
    // Key format: refresh:{userId}:{jti}  — extract jti for display
    return keys.map((k) => {
      const jti = k.split(':').slice(2).join(':');
      return { jti, key: k };
    });
  },

  async revokeSession(userId: string, jti: string) {
    await redis.del(refreshKey(userId, jti));
  },

  async revokeAllSessions(userId: string, exceptJti?: string) {
    const keys = await scanKeys(`refresh:${userId}:*`);
    const toDelete = exceptJti
      ? keys.filter((k) => !k.endsWith(`:${exceptJti}`))
      : keys;
    if (toDelete.length > 0) await redis.del(...toDelete);
    return { revoked: toDelete.length };
  },
};

// ─── Internal helpers ──────────────────────────────────────────────────────

async function issueTokens(userId: string, roles: Role[]) {
  const accessToken = jwtLib.signAccess(userId, roles);
  const { token: refreshToken, jti } = jwtLib.signRefresh(userId);

  const ttlSeconds = parseTtlToSeconds(env.JWT_REFRESH_TTL);
  await redis.set(refreshKey(userId, jti), '1', 'EX', ttlSeconds);

  return { accessToken, refreshToken, jti };
}
