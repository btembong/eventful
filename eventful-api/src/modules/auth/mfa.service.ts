/**
 * MFA / TOTP service
 *
 * Flow:
 *  1. POST /auth/mfa/setup    — generates secret + otpauth URI; stores secret (unconfirmed)
 *  2. POST /auth/mfa/verify   — user provides first valid code; sets mfaEnabled = true
 *  3. POST /auth/mfa/disable  — user provides valid code + password; sets mfaEnabled = false
 *
 * Login flow change (auth.service.ts):
 *  - If mfaEnabled, login returns { requiresMfa: true, mfaToken: <short-lived Redis key> }
 *    instead of access/refresh tokens.
 *  - POST /auth/mfa/complete  — user submits TOTP code + mfaToken; returns full token pair.
 */

import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { jwtLib, parseTtlToSeconds } from '@/lib/jwt';
import env from '@/config/env';
import { randomUUID } from 'crypto';

const refreshKey = (userId: string, jti: string) => `refresh:${userId}:${jti}`;

// TOTP window: accept codes ±1 step (30s each side) to handle clock drift
authenticator.options = { window: 1 };

const APP_NAME = 'Eventful';

function clientError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

export const mfaService = {
  /**
   * Generate a TOTP secret for the user and return the otpauth URI + QR code PNG.
   * The secret is stored on the user row immediately but mfaEnabled stays false
   * until the user verifies their first code.
   */
  async setup(userId: string): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, mfaEnabled: true },
    });
    if (!user) throw clientError('User not found', 404);
    if (user.mfaEnabled) throw clientError('MFA is already enabled. Disable it first.', 409);

    const secret     = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, APP_NAME, secret);
    const qrDataUrl  = await QRCode.toDataURL(otpauthUrl);

    // Store secret (unconfirmed until /verify completes)
    await prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });

    return { secret, otpauthUrl, qrDataUrl };
  },

  /**
   * Verify the first TOTP code to confirm setup and enable MFA.
   */
  async verify(userId: string, code: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabled: true },
    });
    if (!user)          throw clientError('User not found', 404);
    if (!user.mfaSecret) throw clientError('Run /auth/mfa/setup first', 400);
    if (user.mfaEnabled) throw clientError('MFA is already enabled', 409);

    const valid = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!valid) throw clientError('Invalid or expired TOTP code', 422);

    await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    return { message: 'MFA enabled successfully.' };
  },

  /**
   * Disable MFA. Requires a valid TOTP code and the user's current password.
   */
  async disable(userId: string, code: string, password: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabled: true, passwordHash: true },
    });
    if (!user)           throw clientError('User not found', 404);
    if (!user.mfaEnabled) throw clientError('MFA is not enabled', 400);

    const pwOk = await bcrypt.compare(password, user.passwordHash);
    if (!pwOk) throw clientError('Incorrect password', 401);

    const valid = authenticator.verify({ token: code, secret: user.mfaSecret! });
    if (!valid) throw clientError('Invalid or expired TOTP code', 422);

    await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false, mfaSecret: null } });
    return { message: 'MFA disabled.' };
  },

  /**
   * Called during login when mfaEnabled = true.
   * Creates a short-lived mfaToken in Redis and returns it instead of issuing tokens.
   * The client must POST /auth/mfa/complete with this token + TOTP code.
   */
  async createMfaChallenge(userId: string): Promise<string> {
    const mfaToken = randomUUID();
    // 5 minute window to enter the TOTP code
    await redis.set(`mfa:challenge:${mfaToken}`, userId, 'EX', 300);
    return mfaToken;
  },

  /**
   * Complete login: validate mfaToken + TOTP code, issue full token pair.
   */
  async complete(mfaToken: string, code: string) {
    const userId = await redis.get(`mfa:challenge:${mfaToken}`);
    if (!userId) throw clientError('MFA session expired or invalid. Please log in again.', 401);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, roles: true, mfaSecret: true, mfaEnabled: true, deletedAt: true },
    });
    if (!user || user.deletedAt) throw clientError('User not found', 404);
    if (!user.mfaEnabled || !user.mfaSecret) throw clientError('MFA not configured', 400);

    const valid = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!valid) throw clientError('Invalid or expired TOTP code', 422);

    // Consume the challenge — one-time use
    await redis.del(`mfa:challenge:${mfaToken}`);

    const accessToken                   = jwtLib.signAccess(userId, user.roles);
    const { token: refreshToken, jti }  = jwtLib.signRefresh(userId);
    const ttlSeconds                    = parseTtlToSeconds(env.JWT_REFRESH_TTL);
    await redis.set(refreshKey(userId, jti), '1', 'EX', ttlSeconds);

    return {
      user: { id: user.id, email: user.email, fullName: user.fullName, roles: user.roles },
      accessToken,
      refreshToken,
    };
  },
};
