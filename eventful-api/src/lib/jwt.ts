import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import env from '@/config/env';
import type { Role } from '@prisma/client';

// ─── Payload types ────────────────────────────────────────────────────────────

export interface ScannerPayload {
  sub:       string;   // jti (unique token id)
  eventId:   string;
  creatorId: string;
  label?:    string;
  type:      'scanner';
  iat?:      number;
  exp?:      number;
}

export interface AccessPayload {
  sub: string;    // userId
  roles: Role[];
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface RefreshPayload {
  sub: string;    // userId
  jti: string;    // unique token ID — used as Redis key fragment
  type: 'refresh';
  iat?: number;
  exp?: number;
}

// ─── TTL parser ───────────────────────────────────────────────────────────────

const TTL_UNITS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

export function parseTtlToSeconds(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid TTL format: "${ttl}" — expected e.g. "15m", "30d"`);
  return parseInt(match[1]) * TTL_UNITS[match[2]];
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

export const jwtLib = {
  signAccess(userId: string, roles: Role[]): string {
    return jwt.sign(
      { sub: userId, roles, type: 'access' } satisfies Omit<AccessPayload, 'iat' | 'exp'>,
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'] },
    );
  },

  signRefresh(userId: string): { token: string; jti: string } {
    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { sub: userId, jti, type: 'refresh' } satisfies Omit<RefreshPayload, 'iat' | 'exp'>,
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_TTL as jwt.SignOptions['expiresIn'] },
    );
    return { token, jti };
  },

  verifyAccess(token: string): AccessPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
  },

  verifyRefresh(token: string): RefreshPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
  },

  signScanner(eventId: string, creatorId: string, jti: string, expiresIn: string, label?: string): string {
    return jwt.sign(
      { sub: jti, eventId, creatorId, label, type: 'scanner' } satisfies Omit<ScannerPayload, 'iat' | 'exp'>,
      env.JWT_ACCESS_SECRET,
      { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] },
    );
  },

  verifyScanner(token: string): ScannerPayload {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as ScannerPayload;
    if (payload.type !== 'scanner') throw new Error('Not a scanner token');
    return payload;
  },
};
