import type { FastifyInstance } from 'fastify';
import { authService } from './auth.service';
import { requireAuth } from '@/middleware/auth.guard';

export default async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post<{
    Body: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      becomeCreator?: boolean;
    };
  }>('/register', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Register a new account',
      body: {
        type: 'object',
        required: ['email', 'password', 'fullName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          fullName: { type: 'string', minLength: 1 },
          phone: { type: 'string' },
          becomeCreator: {
            type: 'boolean',
            description: 'Set true to also receive the CREATOR role at registration',
          },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                fullName: { type: 'string' },
                roles: { type: 'array', items: { type: 'string' } },
              },
            },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
  }, async (req, reply) => {
    const roles: ('EVENTEE' | 'CREATOR')[] = ['EVENTEE'];
    if (req.body.becomeCreator) roles.push('CREATOR');

    const result = await authService.register({ ...req.body, roles });
    return reply.status(201).send({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  });

  // POST /auth/login
  app.post<{ Body: { email: string; password: string } }>('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Login — returns access + refresh tokens',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            // Normal login
            user:         { type: 'object', additionalProperties: true },
            accessToken:  { type: 'string' },
            refreshToken: { type: 'string' },
            // MFA challenge (when mfaEnabled = true)
            requiresMfa: { type: 'boolean' },
            mfaToken:    { type: 'string', description: 'Pass to POST /auth/mfa/complete' },
          },
        },
      },
    },
  }, async (req, reply) => {
    const result = await authService.login(req.body);
    return reply.send(result);
  });

  // POST /auth/refresh
  app.post<{ Body: { refreshToken: string } }>('/refresh', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Exchange a refresh token for a new access + refresh token pair',
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
  }, async (req, reply) => {
    const result = await authService.refresh(req.body.refreshToken);
    return reply.send({ accessToken: result.accessToken, refreshToken: result.refreshToken });
  });

  // POST /auth/logout
  app.post('/logout', {
    schema: {
      tags: ['Auth'],
      summary: 'Revoke the current refresh token',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: { message: { type: 'string' } },
        },
      },
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    const { refreshToken } = req.body as { refreshToken: string };
    const { jti } = (await import('@/lib/jwt')).jwtLib.verifyRefresh(refreshToken);
    await authService.logout(req.user!.id, jti);
    return reply.send({ message: 'Logged out' });
  });

  // GET /auth/verify-email?token=xxx
  app.get<{ Querystring: { token: string } }>('/verify-email', {
    schema: {
      tags: ['Auth'],
      summary: 'Verify email address via token from the verification email',
      querystring: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { message: { type: 'string' } } } },
    },
  }, async (req) => {
    return authService.verifyEmail(req.query.token);
  });

  // POST /auth/resend-verification — accepts email (no auth) or bearer token
  app.post<{ Body: { email?: string } }>('/resend-verification', {
    schema: {
      tags: ['Auth'],
      summary: 'Resend email verification link (pass email in body)',
      body: {
        type: 'object',
        properties: { email: { type: 'string', format: 'email' } },
      },
      response: { 200: { type: 'object', properties: { message: { type: 'string' } } } },
    },
  }, async (req) => {
    const email = req.body?.email;
    if (!email) return { message: 'If that email exists, a verification link has been sent.' };
    const user = await (await import('@/lib/prisma')).default.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, email: true, fullName: true, emailVerifiedAt: true },
    });
    if (!user || user.emailVerifiedAt) return { message: 'If that email exists, a verification link has been sent.' };
    authService.sendVerificationEmail(user.id, user.email, user.fullName)
      .catch((err) => console.error('[auth] Failed to resend verification email:', err));
    return { message: 'If that email exists, a verification link has been sent.' };
  });

  // POST /auth/forgot-password
  app.post<{ Body: { email: string } }>('/forgot-password', {
    config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
    schema: {
      tags: ['Auth'],
      summary: 'Request a password reset email',
      body: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } },
      },
      response: { 200: { type: 'object', properties: { message: { type: 'string' } } } },
    },
  }, async (req) => {
    return authService.forgotPassword(req.body.email);
  });

  // POST /auth/reset-password
  app.post<{ Body: { token: string; password: string } }>('/reset-password', {
    schema: {
      tags: ['Auth'],
      summary: 'Reset password using the token from the reset email',
      body: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token:    { type: 'string' },
          password: { type: 'string', minLength: 8 },
        },
      },
      response: { 200: { type: 'object', properties: { message: { type: 'string' } } } },
    },
  }, async (req) => {
    return authService.resetPassword(req.body.token, req.body.password);
  });

  // GET /auth/sessions — list all active refresh token sessions
  app.get('/sessions', {
    schema: {
      tags: ['Auth'],
      summary: 'List all active sessions for the current user',
      security: [{ bearerAuth: [] }],
    },
    preHandler: requireAuth,
  }, async (req) => {
    return authService.listSessions(req.user!.id);
  });

  // DELETE /auth/sessions/:jti — revoke a specific session
  app.delete<{ Params: { jti: string } }>('/sessions/:jti', {
    schema: {
      tags: ['Auth'],
      summary: 'Revoke a specific session by JTI',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { jti: { type: 'string' } } },
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    await authService.revokeSession(req.user!.id, req.params.jti);
    return reply.send({ message: 'Session revoked' });
  });

  // DELETE /auth/sessions — revoke all sessions except the current one
  app.delete('/sessions', {
    schema: {
      tags: ['Auth'],
      summary: 'Revoke all sessions except the current one',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: { exceptJti: { type: 'string', description: 'JTI of the current session to keep' } },
      },
    },
    preHandler: requireAuth,
  }, async (req) => {
    const { exceptJti } = (req.body as { exceptJti?: string }) ?? {};
    return authService.revokeAllSessions(req.user!.id, exceptJti);
  });

  // POST /auth/become-creator
  // Lets an EVENTEE add the CREATOR role to their account
  app.post('/become-creator', {
    schema: {
      tags: ['Auth'],
      summary: 'Add the CREATOR role to the authenticated account',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            roles: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    preHandler: requireAuth,
  }, async (req, reply) => {
    const db = (await import('@/lib/prisma')).default;
    const [user] = await db.$transaction([
      db.user.update({
        where: { id: req.user!.id },
        data: { roles: { push: 'CREATOR' } },
        select: { roles: true },
      }),
      db.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'user.became_creator',
          entityType: 'User',
          entityId: req.user!.id,
        },
      }),
    ]);
    return reply.send({ roles: user.roles });
  });
}
