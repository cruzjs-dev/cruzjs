/**
 * Extended tRPC Procedure Builders
 *
 * Composable procedure variants that add cross-cutting concerns:
 * pagination, rate limiting, and API versioning.
 *
 * These extend the base `publicProcedure`, `protectedProcedure`, and
 * `orgProcedure` builders with pre-wired middleware so individual
 * routers don't have to repeat boilerplate.
 *
 * @example
 * ```typescript
 * @Route()
 * list = orgPaginatedProcedure
 *   .input(z.object({ search: z.string().optional() }))
 *   .query(async ({ ctx }) => {
 *     const { page, perPage } = ctx.pagination;
 *     // ...
 *   });
 * ```
 */

import { publicProcedure, protectedProcedure, orgProcedure } from './context';
import { paginatedMiddleware, cursorPaginatedMiddleware } from '../pagination/pagination.middleware';
import { rateLimitMiddleware } from '../rate-limiting/rate-limit.middleware';
import type { RateLimitKeyExtractor } from '../rate-limiting/rate-limit.middleware';
import { versionMiddleware } from '../versioning/versioning.middleware';
import type { VersionConfig } from '../versioning/versioning.types';
import { RateLimitService } from '../rate-limiting/rate-limit.service';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Middleware that resolves RateLimitService from the DI container
 * and applies the named limiter. All framework procedures have
 * `ctx.container` available.
 */
/**
 * Middleware that resolves RateLimitService from the DI container
 * and applies the named limiter. All framework procedures have
 * `ctx.container` available.
 *
 * Uses `any` for the opts parameter because tRPC middleware types are
 * deeply generic and cannot be satisfied with a standalone function signature.
 */
function resolvedRateLimit(limiterName: string, keyExtractor?: RateLimitKeyExtractor) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tRPC middleware opts type is deeply generic and varies per procedure chain; a concrete type cannot satisfy all `.use()` overloads
  return async function rateLimitFromContainer(opts: { ctx: any; next: Function }) {
    const service = opts.ctx.container.resolve(RateLimitService) as RateLimitService;
    return rateLimitMiddleware(service, limiterName, keyExtractor)(opts);
  };
}

// ─── Pagination variants ──────────────────────────────────────────────────────

/**
 * Offset-paginated public procedure.
 * Parses `page`/`perPage` from input (with safe defaults) and
 * adds `ctx.pagination` for the handler.
 */
export const paginatedPublicProcedure = publicProcedure.use(paginatedMiddleware);

/**
 * Offset-paginated protected procedure (requires authentication).
 */
export const paginatedProcedure = protectedProcedure.use(paginatedMiddleware);

/**
 * Offset-paginated org procedure (requires org context).
 */
export const orgPaginatedProcedure = orgProcedure.use(paginatedMiddleware);

/**
 * Cursor-paginated public procedure.
 * Parses `cursor`/`limit`/`direction` from input and adds `ctx.pagination`.
 */
export const cursorPaginatedPublicProcedure = publicProcedure.use(cursorPaginatedMiddleware);

/**
 * Cursor-paginated protected procedure (requires authentication).
 */
export const cursorPaginatedProcedure = protectedProcedure.use(cursorPaginatedMiddleware);

/**
 * Cursor-paginated org procedure (requires org context).
 */
export const orgCursorPaginatedProcedure = orgProcedure.use(cursorPaginatedMiddleware);

// ─── Rate-limiting variants ───────────────────────────────────────────────────

/**
 * Create a rate-limited public procedure that resolves `RateLimitService`
 * from the DI container.
 *
 * @param limiterName - Name of a limiter registered via `RateLimitService.defineLimiter()`
 * @param keyExtractor - Optional function to derive the rate-limit key from ctx
 *
 * @example
 * ```typescript
 * @Route()
 * requestMagicLink = rateLimitedPublicProcedure('magic-link')
 *   .input(requestMagicLinkSchema)
 *   .mutation(async ({ input }) => { ... });
 * ```
 */
export const rateLimitedPublicProcedure = (
  limiterName: string,
  keyExtractor?: RateLimitKeyExtractor,
) => publicProcedure.use(resolvedRateLimit(limiterName, keyExtractor));

/**
 * Create a rate-limited protected procedure.
 *
 * @example
 * ```typescript
 * @Route()
 * sendMessage = rateLimitedProcedure('messages', (ctx) => ctx.session.user.id)
 *   .mutation(async ({ input }) => { ... });
 * ```
 */
export const rateLimitedProcedure = (
  limiterName: string,
  keyExtractor?: RateLimitKeyExtractor,
) => protectedProcedure.use(resolvedRateLimit(limiterName, keyExtractor));

/**
 * Create a rate-limited org procedure.
 */
export const orgRateLimitedProcedure = (
  limiterName: string,
  keyExtractor?: RateLimitKeyExtractor,
) => orgProcedure.use(resolvedRateLimit(limiterName, keyExtractor));

// ─── API versioning variants ──────────────────────────────────────────────────

/**
 * Version-aware public procedure.
 * Resolves the API version from the incoming request (header, URL path, or
 * query param) and attaches `ctx.apiVersion` for the handler.
 *
 * @example
 * ```typescript
 * @Route()
 * getData = versionedPublicProcedure()
 *   .query(async ({ ctx }) => {
 *     if (ctx.apiVersion === 'v2') { return newFormat(); }
 *     return legacyFormat();
 *   });
 * ```
 */
export const versionedPublicProcedure = (config?: Partial<VersionConfig>) =>
  publicProcedure.use(versionMiddleware(config));

/**
 * Version-aware protected procedure.
 */
export const versionedAuthProcedure = (config?: Partial<VersionConfig>) =>
  protectedProcedure.use(versionMiddleware(config));

/**
 * Version-aware org procedure.
 */
export const orgVersionedProcedure = (config?: Partial<VersionConfig>) =>
  orgProcedure.use(versionMiddleware(config));

// ─── Combined variants ────────────────────────────────────────────────────────

/**
 * Rate-limited + offset-paginated protected procedure.
 *
 * @example
 * ```typescript
 * @Route()
 * list = rateLimitedPaginatedProcedure('api')
 *   .query(async ({ ctx }) => {
 *     const { page, perPage } = ctx.pagination;
 *   });
 * ```
 */
export const rateLimitedPaginatedProcedure = (
  limiterName: string,
  keyExtractor?: RateLimitKeyExtractor,
) => protectedProcedure
    .use(resolvedRateLimit(limiterName, keyExtractor))
    .use(paginatedMiddleware);

/**
 * Rate-limited + offset-paginated org procedure.
 */
export const orgRateLimitedPaginatedProcedure = (
  limiterName: string,
  keyExtractor?: RateLimitKeyExtractor,
) => orgProcedure
    .use(resolvedRateLimit(limiterName, keyExtractor))
    .use(paginatedMiddleware);
