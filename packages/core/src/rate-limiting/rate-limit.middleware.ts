/**
 * Rate Limit tRPC Middleware
 *
 * Creates a tRPC middleware that enforces rate limits on procedures.
 * Returns 429 (TOO_MANY_REQUESTS) with standard rate limit headers
 * when the limit is exceeded.
 */

import { TRPCError } from '@trpc/server';
import type { RateLimitService } from './rate-limit.service';

/** Context shape available to rate-limit key extractors */
export type RateLimitContext = { request?: Request; session?: { user?: { id?: string } }; [key: string]: unknown };

export type RateLimitKeyExtractor = (ctx: RateLimitContext) => string;

/**
 * Default key extractor: uses IP from request headers.
 */
const defaultKeyExtractor: RateLimitKeyExtractor = (ctx) => {
  const request = ctx.request as Request | undefined;
  if (!request) {
    return 'unknown';
  }
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? `ip:${forwarded.split(',')[0].trim()}` : 'ip:unknown';
};

/**
 * Create a tRPC middleware that enforces rate limits.
 *
 * @param rateLimitService - The RateLimitService instance
 * @param limiterName - Name of a registered limiter (defined via defineLimiter())
 * @param keyExtractor - Optional function to extract the rate limit key from context
 *
 * @example
 * ```typescript
 * const rateLimited = rateLimitMiddleware(rateLimitService, 'api');
 *
 * export const myProcedure = protectedProcedure
 *   .use(rateLimited)
 *   .query(async ({ ctx }) => { ... });
 * ```
 *
 * @example with custom key extractor
 * ```typescript
 * const rateLimited = rateLimitMiddleware(
 *   rateLimitService,
 *   'api',
 *   (ctx) => RateLimitService.keyFromUser(ctx.session.user.id),
 * );
 * ```
 */
export function rateLimitMiddleware(
  rateLimitService: RateLimitService,
  limiterName: string,
  keyExtractor?: RateLimitKeyExtractor,
) {
  const extractKey = keyExtractor ?? defaultKeyExtractor;

  return async function rateLimit(opts: { ctx: RateLimitContext; next: (opts: { ctx: RateLimitContext & { rateLimit: { limit: number; remaining: number; retryAfter: number } } }) => unknown }) {
    const key = extractKey(opts.ctx);
    const result = await rateLimitService.hit(limiterName, key);

    if (!result.allowed) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
        cause: {
          retryAfter: result.retryAfter,
          limit: result.limit,
          remaining: result.remaining,
        },
      });
    }

    // Proceed and attach rate limit info to context for header setting
    return opts.next({
      ctx: {
        ...opts.ctx,
        rateLimit: {
          limit: result.limit,
          remaining: result.remaining,
          retryAfter: result.retryAfter,
        },
      },
    });
  };
}

/**
 * Extract rate limit headers from a RateLimitResult.
 * These should be set on the HTTP response.
 */
export function rateLimitHeaders(rateLimit: {
  limit: number;
  remaining: number;
  retryAfter: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(rateLimit.limit),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(rateLimit.retryAfter),
  };
}
