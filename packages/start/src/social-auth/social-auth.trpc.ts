/**
 * Social Auth tRPC Router (OOP)
 *
 * Provides endpoints for OAuth flow management and account connections.
 * - getAuthUrl: Generate a provider authorization URL (public)
 * - getAvailableProviders: List configured providers (public)
 * - handleCallback: Exchange code for session (public)
 * - listConnections: List user's connected social accounts (protected)
 * - disconnect: Remove a social connection (protected)
 * - getConnection: Get a specific connection (protected)
 * - syncAccount: Refresh profile data from provider (protected)
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Inject, Router, Route, TrpcRouter } from '@cruzjs/core';
import { publicProcedure, protectedProcedure } from '@cruzjs/core/trpc/context';
import { SocialOAuthService, generateState, generateCodeVerifier, generateCodeChallenge } from './oauth.service';
import {
  getAuthUrlSchema,
  handleCallbackSchema,
  disconnectSchema,
  getConnectionSchema,
  syncAccountSchema,
} from './social-auth.validation';

@Router()
export class SocialAuthTrpc extends TrpcRouter {
  @Inject(SocialOAuthService) private service!: SocialOAuthService;

  /**
   * Get the authorization URL for a provider.
   * Returns the URL, state (CSRF token), and optional codeVerifier (for PKCE providers).
   * The client must store state and codeVerifier to pass back in the callback.
   */
  @Route() getAuthUrl = publicProcedure
    .input(getAuthUrlSchema)
    .query(async ({ input }) => {
      const provider = this.service.getProvider(input.provider);
      if (!provider) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Unknown OAuth provider: ${input.provider}`,
        });
      }

      const state = generateState();

      // Generate PKCE code verifier for providers that support it
      const needsPkce = provider.requiresPkce ?? false;
      let codeVerifier: string | undefined;
      let codeChallenge: string | undefined;

      if (needsPkce) {
        codeVerifier = generateCodeVerifier();
        codeChallenge = await generateCodeChallenge(codeVerifier);
      }

      const url = provider.getAuthUrl(state, input.redirectUri, codeChallenge);

      return { url, state, codeVerifier };
    });

  /**
   * List all available (configured) OAuth providers.
   */
  @Route() getAvailableProviders = publicProcedure.query(() => {
    return { providers: this.service.getAvailableProviders() };
  });

  /**
   * Handle the OAuth callback. Exchanges the authorization code for a session.
   * Can optionally link to an existing user when called from a protected context.
   */
  @Route() handleCallback = publicProcedure
    .input(
      handleCallbackSchema.extend({
        expectedState: z.string().min(1),
        codeVerifier: z.string().optional(),
        linkToUserId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const metadata = getRequestMetadata(ctx.request);
        const result = await this.service.handleCallback(
          input.provider,
          input.code,
          input.state,
          input.expectedState,
          input.redirectUri,
          input.linkToUserId,
          metadata.userAgent,
          metadata.ipAddress,
          input.codeVerifier,
        );
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'OAuth callback failed';
        throw new TRPCError({ code: 'BAD_REQUEST', message });
      }
    });

  /**
   * List all social connections for the current user.
   */
  @Route() listConnections = protectedProcedure.query(async ({ ctx }) => {
    return this.service.listConnections(ctx.session.user.id);
  });

  /**
   * Disconnect a social provider from the current user's account.
   */
  @Route() disconnect = protectedProcedure
    .input(disconnectSchema)
    .mutation(async ({ ctx, input }) => {
      await this.service.disconnect(ctx.session.user.id, input.provider);
      return { success: true };
    });

  /**
   * Get a specific social connection for the current user.
   */
  @Route() getConnection = protectedProcedure
    .input(getConnectionSchema)
    .query(async ({ ctx, input }) => {
      return this.service.getConnection(ctx.session.user.id, input.provider);
    });

  /**
   * Sync profile data from the provider for a connected account.
   * Fetches fresh profile data using the stored access token.
   */
  @Route() syncAccount = protectedProcedure
    .input(syncAccountSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await this.service.syncProfile(ctx.session.user.id, input.provider);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Profile sync failed';
        throw new TRPCError({ code: 'BAD_REQUEST', message });
      }
    });
}

/**
 * Extract user agent and IP address from the request.
 */
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
