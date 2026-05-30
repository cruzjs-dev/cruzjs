/**
 * Resource Middleware
 *
 * tRPC middleware that applies resource transformation to procedure output.
 * Wraps the return value in a Resource instance and calls `toJSON(ctx)`.
 *
 * @example
 * ```typescript
 * import { resourceMiddleware } from '@cruzjs/core';
 *
 * @Route() get = orgProcedure
 *   .use(resourceMiddleware(UserResource))
 *   .query(async ({ ctx, input }) => {
 *     // Return the raw model — middleware transforms it
 *     return this.userService.getById(input.id);
 *   });
 *
 * @Route() list = orgProcedure
 *   .use(resourceMiddleware(UserResource))
 *   .query(async ({ ctx }) => {
 *     // Arrays are automatically handled
 *     return this.userService.list(ctx.org.orgId);
 *   });
 * ```
 */

import type { Resource } from './resource';
import type { SerializationContext } from './resource.types';

/**
 * Create a tRPC middleware that wraps procedure output through a Resource class.
 *
 * Supports both single objects and arrays. When the output is an array,
 * each item is transformed individually. When the output is a single object,
 * it is wrapped in the Resource and serialized.
 *
 * Sparse fieldsets and includes can be passed via the tRPC context
 * (e.g., parsed from query parameters by an earlier middleware).
 *
 * @param ResourceClass - The Resource subclass to transform output through
 */
export function resourceMiddleware<T extends Resource<any, any>>(
  ResourceClass: new (data: any) => T,
) {
  return async function transformResource(opts: {
    ctx: any;
    next: Function;
  }) {
    const result = await opts.next();

    // tRPC middleware next() returns { ok, data, error, ... }
    if (!result.ok) {
      return result;
    }

    const rawData = result.data;

    // Build serialization context from tRPC context if available
    const serializationCtx: SerializationContext = {
      fields: opts.ctx.resourceFields,
      includes: opts.ctx.resourceIncludes,
      user: opts.ctx.session?.user
        ? { id: opts.ctx.session.user.id, role: opts.ctx.org?.role ?? 'user' }
        : undefined,
    };

    if (Array.isArray(rawData)) {
      const transformed = rawData.map(
        (item: any) => new ResourceClass(item).toJSON(serializationCtx),
      );
      return { ...result, data: transformed };
    }

    if (rawData !== null && rawData !== undefined && typeof rawData === 'object') {
      const resource = new ResourceClass(rawData);
      return { ...result, data: resource.toJSON(serializationCtx) };
    }

    // Primitives / null — pass through unchanged
    return result;
  };
}
