/**
 * Session tRPC Router
 *
 * Endpoints for listing, revoking, and managing user sessions.
 * Uses protectedProcedure since sessions are user-scoped.
 */

import { Inject } from '../di';
import { Router, Route, TrpcRouter } from '../trpc/router-class';
import { protectedProcedure } from '../trpc/context';
import { TRPCError } from '@trpc/server';
import { SessionService } from './session.service';
import { revokeSessionSchema } from './session.validation';

@Router()
export class SessionTrpc extends TrpcRouter {
  @Inject(SessionService) private service!: SessionService;

  /** List all active sessions for the current user */
  @Route() listSessions = protectedProcedure
    .query(async ({ ctx }) => {
      const sessions = await this.service.listActive(ctx.session.user.id);
      // Strip token hashes from the response for security
      return sessions.map((s) => ({
        id: s.id,
        userId: s.userId,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        deviceFingerprint: s.deviceFingerprint,
        deviceLabel: s.deviceLabel,
        lastActiveAt: s.lastActiveAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        metadata: s.metadata,
        createdAt: s.createdAt.toISOString(),
      }));
    });

  /** Revoke a specific session */
  @Route() revokeSession = protectedProcedure
    .input(revokeSessionSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify the session belongs to the current user
      const sessions = await this.service.listActive(ctx.session.user.id);
      const targetSession = sessions.find((s) => s.id === input.id);

      if (!targetSession) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      await this.service.revoke(input.id);
      return { revoked: true };
    });

  /** Revoke all sessions for the current user */
  @Route() revokeAllSessions = protectedProcedure
    .mutation(async ({ ctx }) => {
      await this.service.revokeAll(ctx.session.user.id);
      return { revoked: true };
    });

  /** Get the current session info (based on the request token) */
  @Route() getCurrentSession = protectedProcedure
    .query(async ({ ctx }) => {
      // The current session is available from the auth context
      // We return a summary since the full session data is internal
      const sessions = await this.service.listActive(ctx.session.user.id);

      // Find the most recently active session as the "current" one
      if (sessions.length === 0) {
        return null;
      }

      const current = sessions.sort(
        (a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime(),
      )[0];

      return {
        id: current.id,
        userId: current.userId,
        ipAddress: current.ipAddress,
        deviceLabel: current.deviceLabel,
        lastActiveAt: current.lastActiveAt.toISOString(),
        expiresAt: current.expiresAt.toISOString(),
        createdAt: current.createdAt.toISOString(),
      };
    });
}
