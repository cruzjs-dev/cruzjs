import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from '@cruzjs/core/trpc/context';
import { publicProcedure } from '@cruzjs/core/trpc/context';
import { ApiKeyService } from './api-key.service';
import type { ValidatedApiKey } from './api-key.types';

// ============================================================================
// Scope Authorization
// ============================================================================

/**
 * Check if a validated API key has a specific scope.
 *
 * Scope matching rules:
 * - `'*'` grants access to everything
 * - Exact match: `'api-keys:read'` satisfies `'api-keys:read'`
 * - Resource wildcard: `'api-keys:*'` satisfies `'api-keys:read'` and `'api-keys:write'`
 * - Legacy scopes (`READ`, `WRITE`, `ADMIN`) are also checked as-is
 */
export function hasScope(apiKey: ValidatedApiKey, requiredScope: string): boolean {
  const scopes = apiKey.scopes;

  // Wildcard grants everything
  if (scopes.includes('*')) return true;

  // Exact match
  if (scopes.includes(requiredScope)) return true;

  // Resource wildcard: 'api-keys:*' satisfies 'api-keys:read'
  const colonIndex = requiredScope.indexOf(':');
  if (colonIndex !== -1) {
    const resource = requiredScope.slice(0, colonIndex);
    if (scopes.includes(`${resource}:*`)) return true;
  }

  return false;
}

/**
 * Validate an API key from a request and verify it has the required scope.
 *
 * Flow:
 * 1. Extract key from Authorization header (`Bearer ax_k_...`) or x-api-key header
 * 2. Hash with SHA-256
 * 3. Validate via ApiKeyService (checks revocation + expiry)
 * 4. Check scope authorization
 * 5. Return validated key or throw
 *
 * @throws TRPCError UNAUTHORIZED if key is missing or invalid
 * @throws TRPCError FORBIDDEN if key lacks the required scope
 */
export async function requireApiKeyScope(
  request: Request,
  apiKeyService: ApiKeyService,
  requiredScope: string,
): Promise<ValidatedApiKey> {
  // Extract key from Authorization header or x-api-key header
  const authHeader = request.headers.get('authorization');
  const xApiKey = request.headers.get('x-api-key');

  let rawKey: string | null = null;

  if (authHeader?.startsWith('Bearer ax_k_')) {
    rawKey = authHeader.substring(7); // Strip 'Bearer '
  } else if (xApiKey) {
    rawKey = xApiKey;
  }

  if (!rawKey) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'API key required. Provide Authorization: Bearer ax_k_... or x-api-key header.',
    });
  }

  const keyHash = await apiKeyService.hashApiKey(rawKey);
  const validated = await apiKeyService.validateKey(keyHash);

  if (!validated) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid, expired, or revoked API key.',
    });
  }

  if (!hasScope(validated, requiredScope)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `API key missing required scope: ${requiredScope}`,
    });
  }

  return validated;
}

// ============================================================================
// Rate Limiting Helper
// ============================================================================

/**
 * Cloudflare Workers Rate Limiting interface
 * Matches the Cloudflare Rate Limiting API binding
 */
interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Check rate limit using Cloudflare Workers rate limiting bindings
 *
 * Gracefully handles missing bindings (development mode) by logging a warning
 * and allowing the request through.
 *
 * @param env - Cloudflare Workers environment bindings
 * @param key - Rate limit key (typically orgId or apiKeyId)
 * @param isAgent - Whether this is an agent request (higher limits)
 */
export async function checkRateLimit(
  env: Record<string, unknown> | undefined,
  key: string,
  isAgent: boolean,
): Promise<void> {
  if (!env) return;

  const limiterName = isAgent ? 'AGENT_RATE_LIMITER' : 'RATE_LIMITER';
  const limiter = env[limiterName] as RateLimiter | undefined;

  if (!limiter) {
    // Rate limiter not configured -- gracefully skip in development
    console.warn(`[API Key Middleware] Rate limiter binding "${limiterName}" not available. Skipping rate limit check.`);
    return;
  }

  const { success } = await limiter.limit({ key });
  if (!success) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded. Please try again later.',
    });
  }
}

// ============================================================================
// API Key Authentication Procedure
// ============================================================================

/**
 * tRPC procedure that authenticates requests via x-api-key header.
 *
 * This is used for API endpoints accessed by external agents/integrations
 * (Phase 4 agent runtime). It is separate from session-based auth.
 *
 * Flow:
 * 1. Read x-api-key header
 * 2. Hash the key with SHA-256
 * 3. Validate against stored hashes (checks revocation + expiry)
 * 4. Add validated key context to ctx.apiKey
 * 5. Optionally check rate limit
 */
export const apiKeyProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const apiKeyHeader = ctx.request.headers.get('x-api-key');

  if (!apiKeyHeader) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'API key required. Provide x-api-key header.',
    });
  }

  const apiKeyService = ctx.container.get<ApiKeyService>(ApiKeyService);
  const keyHash = await apiKeyService.hashApiKey(apiKeyHeader);
  const keyRecord = await apiKeyService.validateKey(keyHash);

  if (!keyRecord) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid, expired, or revoked API key.',
    });
  }

  // Rate limiting (graceful -- does not block if binding unavailable)
  try {
    const env = (ctx as Record<string, unknown>).env as Record<string, unknown> | undefined;
    await checkRateLimit(env, keyRecord.orgId, true);
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'TOO_MANY_REQUESTS') {
      throw error;
    }
    // Swallow other errors -- rate limiting should not block requests
    console.warn('[API Key Middleware] Rate limit check failed:', error);
  }

  return next({
    ctx: {
      ...ctx,
      apiKey: keyRecord,
    },
  });
});
