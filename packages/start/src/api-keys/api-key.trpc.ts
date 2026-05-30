import { orgProcedure, router } from '@cruzjs/core/trpc/context';
import { TRPCError } from '@trpc/server';
import { ApiKeyService } from './api-key.service';
import { apiKeyProcedure } from './api-key.middleware';
import {
  createApiKeySchema,
  revokeApiKeySchema,
  getApiKeySchema,
} from './api-key.types';

/**
 * API Key Router
 *
 * All endpoints use orgProcedure (requires org context).
 * API key management is an org-admin operation.
 */
export const apiKeyTrpc = router({
  /**
   * Verify an API key and return its org/project context.
   * Called by the CLI to confirm the key is valid.
   */
  verify: apiKeyProcedure.query(({ ctx }) => ({
    orgId: ctx.apiKey.orgId,
    projectScope: ctx.apiKey.projectScope,
    scopes: ctx.apiKey.scopes,
  })),

  /**
   * Create a new API key
   * Returns the plaintext key ONLY this once -- it is never stored or retrievable again
   */
  create: orgProcedure
    .input(createApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      const apiKeyService = ctx.container.get<ApiKeyService>(ApiKeyService);
      const result = await apiKeyService.createApiKey(
        ctx.org.org.orgId,
        ctx.org.user.id,
        input,
      );
      return result;
    }),

  /**
   * List all API keys for the current organization
   * Shows active and revoked keys (revoked shown for audit purposes)
   */
  list: orgProcedure.query(async ({ ctx }) => {
    const apiKeyService = ctx.container.get<ApiKeyService>(ApiKeyService);
    return apiKeyService.listApiKeys(ctx.org.org.orgId);
  }),

  /**
   * Get a single API key by ID
   */
  get: orgProcedure
    .input(getApiKeySchema)
    .query(async ({ ctx, input }) => {
      const apiKeyService = ctx.container.get<ApiKeyService>(ApiKeyService);
      const key = await apiKeyService.getApiKey(ctx.org.org.orgId, input.keyId);

      if (!key) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'API key not found',
        });
      }

      return key;
    }),

  /**
   * Revoke an API key (soft delete -- sets revokedAt timestamp)
   * This cannot be undone. The key remains visible for audit purposes.
   */
  revoke: orgProcedure
    .input(revokeApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      const apiKeyService = ctx.container.get<ApiKeyService>(ApiKeyService);

      // Verify the key exists and belongs to this org
      const key = await apiKeyService.getApiKey(ctx.org.org.orgId, input.keyId);
      if (!key) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'API key not found',
        });
      }

      if (key.revokedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'API key is already revoked',
        });
      }

      await apiKeyService.revokeApiKey(ctx.org.org.orgId, input.keyId);
      return { success: true };
    }),

  /**
   * Get usage stats for all API keys in the current organization.
   * Returns key metadata with last-used timestamps for the dashboard.
   */
  getUsageStats: orgProcedure.query(async ({ ctx }) => {
    const apiKeyService = ctx.container.get<ApiKeyService>(ApiKeyService);
    return apiKeyService.getUsageStats(ctx.org.org.orgId);
  }),

});
