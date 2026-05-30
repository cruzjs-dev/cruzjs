/**
 * Soft Delete tRPC Middleware
 *
 * Creates a tRPC middleware that injects the active soft-delete scope
 * into the tRPC context, so downstream procedures and services can
 * use it to filter queries automatically.
 *
 * @example
 * ```typescript
 * import { softDeleteMiddleware } from '@cruzjs/core';
 * import { SoftDeleteScope } from '@cruzjs/core';
 *
 * // Default scope (exclude soft-deleted)
 * const withoutDeleted = softDeleteMiddleware();
 *
 * // Include all records
 * const withDeleted = softDeleteMiddleware(SoftDeleteScope.WITH_DELETED);
 *
 * export const myProcedure = protectedProcedure
 *   .use(withoutDeleted)
 *   .query(async ({ ctx }) => {
 *     // ctx.softDeleteScope is now available
 *   });
 * ```
 */

import { SoftDeleteScope } from './soft-delete.types';

export function softDeleteMiddleware(scope: SoftDeleteScope = SoftDeleteScope.DEFAULT) {
  return async function softDelete(opts: { ctx: any; next: Function }) {
    return opts.next({
      ctx: {
        ...opts.ctx,
        softDeleteScope: scope,
      },
    });
  };
}
