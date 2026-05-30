/**
 * Magic Link tRPC Router
 *
 * Public endpoints for requesting and verifying magic links.
 * Both procedures are public since the user is not yet authenticated.
 */

import { TRPCError } from '@trpc/server';
import { Inject } from '../di';
import { TrpcRouter, Router, Route } from '../trpc/router-class';
import { publicProcedure } from '../trpc/context';
import { MagicLinkService } from './magic-link.service';
import {
  requestMagicLinkSchema,
  verifyMagicLinkSchema,
} from './magic-link.validation';

@Router()
export class MagicLinkTrpc extends TrpcRouter {
  @Inject(MagicLinkService) private service!: MagicLinkService;

  /**
   * Request a magic link email (public).
   * Always returns success to prevent email enumeration.
   */
  @Route() request = publicProcedure
    .input(requestMagicLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const forwarded = ctx.request.headers.get('x-forwarded-for');
      const ipAddress = forwarded ? forwarded.split(',')[0].trim() : undefined;

      await this.service.request({
        email: input.email,
        redirectTo: input.redirectTo,
        ipAddress,
      });

      return { success: true };
    });

  /**
   * Verify and consume a magic link token (public).
   * Returns user info and redirect URL on success.
   */
  @Route() verify = publicProcedure
    .input(verifyMagicLinkSchema)
    .mutation(async ({ input }) => {
      const result = await this.service.verify(input.token);

      if (!result.success) {
        const messages: Record<string, string> = {
          invalid: 'Invalid or unknown magic link',
          expired: 'This magic link has expired',
          used: 'This magic link has already been used',
        };

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: messages[result.reason],
        });
      }

      return {
        userId: result.userId,
        email: result.email,
        isNewUser: result.isNewUser,
        redirectTo: result.redirectTo,
      };
    });
}
