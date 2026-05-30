import { TRPCError } from '@trpc/server';
import { publicProcedure } from '@cruzjs/core/trpc/context';
import { ApiKeyService } from './api-key.service';
import { hasScope } from './api-key.middleware';
import type { ValidatedApiKey } from './api-key.types';

// ============================================================================
// Dual-Auth Procedure: Session OR API Token
// ============================================================================

/**
 * Creates a tRPC procedure that accepts EITHER a session token OR an API key.
 *
 * Useful for endpoints that should be accessible both from browser (session)
 * and programmatic clients (API key).
 *
 * Authentication priority:
 * 1. If the request has a valid session, use session auth (apiKey = null)
 * 2. If the request has an API key (Authorization: Bearer ax_k_... or x-api-key),
 *    validate and optionally check scope
 * 3. If neither is present, throw UNAUTHORIZED
 *
 * The resulting context always includes:
 * - `apiKey: ValidatedApiKey | null` -- non-null only for API key auth
 * - `session` -- always present (real session or synthetic from API key)
 *
 * @param requiredScope - Optional scope to enforce when authenticating via API key.
 *   Ignored for session-based auth (sessions are already authorized via org roles).
 *
 * @example
 * ```typescript
 * // No scope required -- any valid API key or session works
 * @Route() list = apiTokenProcedure().query(async ({ ctx }) => { ... });
 *
 * // Require specific scope for API key auth
 * @Route() create = apiTokenProcedure('webhooks:write').mutation(async ({ ctx, input }) => { ... });
 * ```
 */
export const apiTokenProcedure = (requiredScope?: string) =>
  publicProcedure.use(async ({ ctx, next }) => {
    // 1. Try session-based auth first
    if (ctx.session?.user) {
      return next({
        ctx: {
          ...ctx,
          apiKey: null as ValidatedApiKey | null,
        },
      });
    }

    // 2. Try API key auth
    const authHeader = ctx.request.headers.get('authorization');
    const xApiKey = ctx.request.headers.get('x-api-key');

    let rawKey: string | null = null;

    if (authHeader?.startsWith('Bearer ax_k_')) {
      rawKey = authHeader.substring(7); // Strip 'Bearer '
    } else if (xApiKey) {
      rawKey = xApiKey;
    }

    if (!rawKey) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Provide a session cookie or API key.',
      });
    }

    const apiKeyService = ctx.container.get<ApiKeyService>(ApiKeyService);
    const keyHash = await apiKeyService.hashApiKey(rawKey);
    const validated = await apiKeyService.validateKey(keyHash);

    if (!validated) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid, expired, or revoked API key.',
      });
    }

    if (requiredScope && !hasScope(validated, requiredScope)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `API key missing required scope: ${requiredScope}`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        apiKey: validated as ValidatedApiKey | null,
      },
    });
  });
