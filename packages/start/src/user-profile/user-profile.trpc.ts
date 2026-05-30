import { SessionService } from '@cruzjs/core/auth/session.service';
import { protectedProcedure, router } from '@cruzjs/core/trpc/context';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { UserProfileService } from './user-profile.service';

export const userProfileTrpc = router({
  /**
   * Get current user
   */
  current: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

        const userProfileService = ctx.container.get<UserProfileService>(UserProfileService);
    try {
      const user = await userProfileService.getUser(ctx.session.user.id);
      return user;
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }
      throw error;
    }
  }),

  /**
   * Get user by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

            const userProfileService = ctx.container.get<UserProfileService>(UserProfileService);
      try {
        const user = await userProfileService.getUser(input.id);
        return user;
      } catch (error) {
        if (error instanceof Error && error.message === 'User not found') {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }
        throw error;
      }
    }),

  /**
   * Update current user
   */
  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        avatarUrl: z.string().url().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

            const userProfileService = ctx.container.get<UserProfileService>(UserProfileService);
      const user = await userProfileService.updateUser(ctx.session.user.id, input);
      return user;
    }),

  /**
   * Change password
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

            const userProfileService = ctx.container.get<UserProfileService>(UserProfileService);
      try {
        await userProfileService.changePassword(
          ctx.session.user.id,
          input.currentPassword,
          input.newPassword
        );
        return { success: true };
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Get feature onboarding status
   */
  getFeatureOnboarding: protectedProcedure
    .input(z.object({ featureKey: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

            const userProfileService = ctx.container.get<UserProfileService>(UserProfileService);
      const completed = await userProfileService.hasCompletedFeatureOnboarding(
        ctx.session.user.id,
        input.featureKey
      );
      return { completed };
    }),

  /**
   * Mark feature onboarding as complete
   */
  completeFeatureOnboarding: protectedProcedure
    .input(z.object({ featureKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

            const userProfileService = ctx.container.get<UserProfileService>(UserProfileService);
      await userProfileService.markFeatureOnboardingComplete(
        ctx.session.user.id,
        input.featureKey
      );
      return { success: true };
    }),

  /**
   * Set current organization for the session
   */
  setCurrentOrg: protectedProcedure
    .input(z.object({ orgId: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const authHeader = ctx.request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (!token) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'No session token provided',
        });
      }

            const sessionService = ctx.container.get<SessionService>(SessionService);
      await sessionService.updateCurrentOrg(token, input.orgId);

      return { success: true };
    }),
});
