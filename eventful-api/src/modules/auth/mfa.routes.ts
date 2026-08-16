import type { FastifyInstance } from 'fastify';
import { requireAuth } from '@/middleware/auth.guard';
import { mfaService } from './mfa.service';

export default async function mfaRoutes(app: FastifyInstance) {

  // POST /auth/mfa/setup — generate TOTP secret + QR code
  app.post('/mfa/setup', {
    schema: {
      tags: ['Auth'],
      summary: 'Begin MFA setup — returns secret and QR code data URL',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            secret:      { type: 'string', description: 'Base32 secret — show to user as backup' },
            otpauthUrl:  { type: 'string' },
            qrDataUrl:   { type: 'string', description: 'data:image/png;base64,… — render as <img>' },
          },
        },
      },
    },
    preHandler: requireAuth,
  }, async (req) => {
    return mfaService.setup(req.user!.id);
  });

  // POST /auth/mfa/verify — confirm setup by submitting first TOTP code
  app.post<{ Body: { code: string } }>('/mfa/verify', {
    schema: {
      tags: ['Auth'],
      summary: 'Confirm MFA setup with first TOTP code — enables MFA on the account',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['code'],
        properties: { code: { type: 'string', minLength: 6, maxLength: 8 } },
      },
      response: { 200: { type: 'object', properties: { message: { type: 'string' } } } },
    },
    preHandler: requireAuth,
  }, async (req) => {
    return mfaService.verify(req.user!.id, req.body.code);
  });

  // POST /auth/mfa/disable — disable MFA (requires TOTP code + current password)
  app.post<{ Body: { code: string; password: string } }>('/mfa/disable', {
    schema: {
      tags: ['Auth'],
      summary: 'Disable MFA — requires current TOTP code and account password',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['code', 'password'],
        properties: {
          code:     { type: 'string', minLength: 6, maxLength: 8 },
          password: { type: 'string' },
        },
      },
      response: { 200: { type: 'object', properties: { message: { type: 'string' } } } },
    },
    preHandler: requireAuth,
  }, async (req) => {
    return mfaService.disable(req.user!.id, req.body.code, req.body.password);
  });

  // POST /auth/mfa/complete — exchange mfaToken + TOTP code for access/refresh tokens
  app.post<{ Body: { mfaToken: string; code: string } }>('/mfa/complete', {
    schema: {
      tags: ['Auth'],
      summary: 'Complete MFA login — exchange mfaToken + TOTP code for token pair',
      body: {
        type: 'object',
        required: ['mfaToken', 'code'],
        properties: {
          mfaToken: { type: 'string', description: 'Short-lived token returned by /auth/login when MFA is required' },
          code:     { type: 'string', minLength: 6, maxLength: 8 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user:         { type: 'object', additionalProperties: true },
            accessToken:  { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
  }, async (req) => {
    return mfaService.complete(req.body.mfaToken, req.body.code);
  });
}
