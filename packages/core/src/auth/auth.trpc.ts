import {
  protectedProcedure,
  publicProcedure,
  router,
} from '../trpc/context';
import { z } from 'zod';
import { ORG_SERVICE, MEMBER_SERVICE, type IOrgService, type IMemberService } from '../orgs/interfaces';
import type { OrganizationResponse } from '../orgs/org.models';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { AuthService } from './auth.service';
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.validation';
import { authIdentity } from '../database/schema';
import { IUserHydrator, USER_HYDRATOR } from './interfaces/user-hydrator.interface';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { DRIZZLE, type DrizzleDatabase } from '../shared/database/drizzle.service';

function getRequestMetadata(request: Request): {
  userAgent?: string;
  ipAddress?: string;
} {
  const userAgent = request.headers.get('user-agent') || undefined;
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    undefined;

  return { userAgent, ipAddress };
}

const AUTH_COOKIE_NAME = 'auth_token';
const DEFAULT_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function buildAuthCookie(token: string, maxAgeSeconds = DEFAULT_SESSION_TTL_SECONDS): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

function clearAuthCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function extractTokenFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.substring(7);
  return extractTokenFromCookie(request);
}

export const authTrpc = router({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ ctx, input }) => {
      const requiredCode = process.env.REGISTRATION_INVITE_CODE;
      if (requiredCode && input.inviteCode !== requiredCode) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Invalid invite code',
        });
      }
      const { userAgent, ipAddress } = getRequestMetadata(ctx.request);
      const authService = ctx.container.get<AuthService>(AuthService);
      const result = await authService.register(input, userAgent, ipAddress);
      // Set HttpOnly cookie — browser will send on subsequent requests.
      if (result?.session?.token) {
        ctx.resHeaders.append('Set-Cookie', buildAuthCookie(result.session.token));
      }
      return result;
    }),

  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    const { userAgent, ipAddress } = getRequestMetadata(ctx.request);
    const authService = ctx.container.get<AuthService>(AuthService);
    const result = await authService.login(input, userAgent, ipAddress);
    if (result?.session?.token) {
      ctx.resHeaders.append('Set-Cookie', buildAuthCookie(result.session.token));
    }
    return result;
  }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const token = extractToken(ctx.request);
    if (token) {
      const sessionService = ctx.container.get<SessionService>(SessionService);
      await sessionService.deleteSession(token);
    }
    ctx.resHeaders.append('Set-Cookie', clearAuthCookie());
    return { success: true };
  }),

  session: publicProcedure.query(async ({ ctx }) => {
    const token = extractToken(ctx.request);
    if (!token) {
      return null;
    }

    const sessionService = ctx.container.get<SessionService>(SessionService);
    const db = ctx.container.get<DrizzleDatabase>(DRIZZLE);
    const hydrator = ctx.container.get<IUserHydrator>(USER_HYDRATOR);

    let orgService: IOrgService | null = null;
    let memberService: IMemberService | null = null;
    try {
      orgService = ctx.container.get<IOrgService>(ORG_SERVICE);
      memberService = ctx.container.get<IMemberService>(MEMBER_SERVICE);
    } catch {
      // OrgModule not registered — orgs unavailable
    }

    const [session, _refreshed] = await Promise.all([
      sessionService.getSession(token),
      sessionService.refreshSession(token),
    ]);

    if (!session) {
      return null;
    }

    const refreshedSession = _refreshed || session;
    const finalSession = refreshedSession;

    const [identity, hydratedData, orgs] = await Promise.all([
      db
        .select()
        .from(authIdentity)
        .where(eq(authIdentity.id, finalSession.userId))
        .limit(1)
        .then(rows => rows[0]),
      hydrator.hydrate(finalSession.userId, ''),
      orgService ? orgService.listUserOrgs(finalSession.userId) : Promise.resolve([]),
    ]);

    if (!identity) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    const organizations = await Promise.all(
      orgs.map(async (org: OrganizationResponse) => {
        const member = memberService
          ? await memberService.getMember(org.id, finalSession.userId)
          : null;
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          avatarUrl: org.avatarUrl,
          role: member?.role || null,
          isCurrent: org.id === finalSession.currentOrgId,
        };
      })
    );

    return {
      session: {
        userId: finalSession.userId,
        currentOrgId: finalSession.currentOrgId || null,
        expiresAt:
          finalSession.expiresAt instanceof Date
            ? finalSession.expiresAt.toISOString()
            : finalSession.expiresAt,
      },
      user: {
        id: identity.id,
        email: identity.email,
        name: hydratedData.profile?.fullName ?? null,
        emailVerified: identity.emailVerified,
        avatarUrl: hydratedData.profile?.avatarUrl ?? null,
        createdAt: identity.createdAt,
      },
      organizations,
    };
  }),

  verifyEmail: publicProcedure
    .input(verifyEmailSchema)
    .mutation(async ({ ctx, input }) => {
      const authService = ctx.container.get<AuthService>(AuthService);
      await authService.verifyEmail(input);
      return { success: true };
    }),

  requestPasswordReset: publicProcedure
    .input(requestPasswordResetSchema)
    .mutation(async ({ ctx, input }) => {
      const authService = ctx.container.get<AuthService>(AuthService);
      await authService.requestPasswordReset(input);
      return {
        success: true,
        message: 'If an account exists, a password reset email has been sent',
      };
    }),

  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const authService = ctx.container.get<AuthService>(AuthService);
      await authService.resetPassword(input);
      return {
        success: true,
        message: 'Password reset successfully',
      };
    }),

  refreshToken: publicProcedure
    .input(refreshTokenSchema)
    .mutation(async ({ ctx, input }) => {
      const tokenService = ctx.container.get<TokenService>(TokenService);
      const userId = await tokenService.verifyRefreshToken(input.refreshToken);
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired refresh token',
        });
      }

      const accessToken = tokenService.generateAccessToken(userId);
      const refreshToken = await tokenService.generateRefreshToken(userId);
      await tokenService.revokeRefreshToken(input.refreshToken);

      return {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60,
      };
    }),

  sessionsList: protectedProcedure.query(async ({ ctx }) => {
    const sessionService = ctx.container.get<SessionService>(SessionService);
    return sessionService.listUserSessions(ctx.session.user.id);
  }),

  sessionsRevoke: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sessionService = ctx.container.get<SessionService>(SessionService);
      await sessionService.revokeSessionById(input.sessionId, ctx.session.user.id);
      return { success: true };
    }),

  sessionsRevokeAll: protectedProcedure.mutation(async ({ ctx }) => {
    const sessionService = ctx.container.get<SessionService>(SessionService);
    await sessionService.deleteAllSessions(ctx.session.user.id);
    return { success: true };
  }),

  accountRequestDeletion: protectedProcedure.mutation(async ({ ctx }) => {
    const authService = ctx.container.get<AuthService>(AuthService);
    await authService.requestAccountDeletion(ctx.session.user.id);
    return { success: true };
  }),

  accountCancelDeletion: protectedProcedure.mutation(async ({ ctx }) => {
    const authService = ctx.container.get<AuthService>(AuthService);
    await authService.cancelDeletion(ctx.session.user.id);
    return { success: true };
  }),

  accountExportData: protectedProcedure.query(async ({ ctx }) => {
    const authService = ctx.container.get<AuthService>(AuthService);
    return authService.exportUserData(ctx.session.user.id);
  }),

  accountDeletionStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.container.get<DrizzleDatabase>(DRIZZLE);
    const [identity] = await db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.id, ctx.session.user.id))
      .limit(1);
    return {
      deletionRequestedAt: identity?.deletionRequestedAt ?? null,
    };
  }),
});
