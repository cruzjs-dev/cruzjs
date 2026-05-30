/**
 * tRPC Middleware Pipeline
 *
 * Composes multiple tRPC middleware functions onto a base procedure builder
 * by chaining `.use()` calls. Provides a cleaner API than manually nesting
 * `.use().use().use()` when the middleware list is dynamic.
 *
 * @example
 * ```ts
 * import { createPipeline } from '@cruzjs/core/trpc/pipeline';
 * import { protectedProcedure } from '@cruzjs/core';
 *
 * const myProcedure = createPipeline(
 *   protectedProcedure,
 *   loggingMiddleware,
 *   rateLimitMiddleware,
 *   paginatedMiddleware,
 * );
 *
 * // Use like any other procedure:
 * myProcedure.input(z.object({ ... })).query(async ({ ctx }) => { ... });
 * ```
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tRPC's generic middleware types are deeply nested; using `any` for the middleware function signature is the only practical approach
type AnyMiddleware = (opts: any) => any;

/**
 * A tRPC procedure-like object that supports `.use()`.
 * Matches the shape of `publicProcedure`, `protectedProcedure`, `orgProcedure`, etc.
 */
interface ProcedureBuilder {
  use(middleware: AnyMiddleware): ProcedureBuilder;
}

/**
 * Compose a base tRPC procedure builder with one or more middleware functions.
 *
 * Middleware is applied in order (left-to-right), so the first middleware in
 * the list runs first (outermost), and the last runs closest to the handler.
 *
 * @param base        - The starting procedure builder (e.g. `protectedProcedure`)
 * @param middlewares  - One or more tRPC middleware functions to chain
 * @returns A new procedure builder with all middleware applied
 *
 * @example
 * ```ts
 * // Static composition
 * const audited = createPipeline(orgProcedure, auditMiddleware, loggingMiddleware);
 *
 * // Dynamic composition
 * const middlewares = [loggingMiddleware];
 * if (config.rateLimit) middlewares.push(rateLimitMiddleware);
 * const proc = createPipeline(protectedProcedure, ...middlewares);
 * ```
 */
export function createPipeline<T extends ProcedureBuilder>(
  base: T,
  ...middlewares: AnyMiddleware[]
): T {
  let result: ProcedureBuilder = base;

  for (const mw of middlewares) {
    result = result.use(mw);
  }

  // The return type stays `T` so callers retain full type inference
  // from the base procedure (input schemas, context shape, etc.)
  return result as T;
}
