/**
 * Pagination tRPC Middleware
 *
 * Creates a tRPC middleware that parses pagination parameters from input
 * and attaches them to the context for downstream use.
 */

import { z } from 'zod';
import { offsetPaginationSchema, cursorPaginationSchema } from './pagination.validation';
import type {
  OffsetPaginationMeta,
  CursorPaginationMeta,
  PaginatedResult,
  PaginationLinks,
} from './pagination.types';

/**
 * tRPC middleware that extracts offset pagination params from input
 * and adds them to context as `ctx.pagination`.
 *
 * @example
 * ```typescript
 * export const listItems = orgProcedure
 *   .input(z.object({ ...myFilters }).merge(offsetPaginationSchema))
 *   .use(paginatedMiddleware)
 *   .query(async ({ ctx, input }) => {
 *     const { page, perPage } = ctx.pagination;
 *     // ...
 *   });
 * ```
 */
export function paginatedMiddleware(opts: { ctx: any; input: any; next: Function }) {
  const parsed = offsetPaginationSchema.safeParse(opts.input);

  const pagination = parsed.success
    ? { page: parsed.data.page, perPage: parsed.data.perPage }
    : { page: 1, perPage: 25 };

  return opts.next({
    ctx: {
      ...opts.ctx,
      pagination,
    },
  });
}

/**
 * tRPC middleware that extracts cursor pagination params from input
 * and adds them to context as `ctx.pagination`.
 *
 * @example
 * ```typescript
 * export const listItems = orgProcedure
 *   .input(z.object({ ...myFilters }).merge(cursorPaginationSchema))
 *   .use(cursorPaginatedMiddleware)
 *   .query(async ({ ctx, input }) => {
 *     const { cursor, limit, direction } = ctx.pagination;
 *     // ...
 *   });
 * ```
 */
export function cursorPaginatedMiddleware(opts: { ctx: any; input: any; next: Function }) {
  const parsed = cursorPaginationSchema.safeParse(opts.input);

  const pagination = parsed.success
    ? { cursor: parsed.data.cursor, limit: parsed.data.limit, direction: parsed.data.direction ?? 'forward' }
    : { cursor: undefined, limit: 25, direction: 'forward' as const };

  return opts.next({
    ctx: {
      ...opts.ctx,
      pagination,
    },
  });
}

/**
 * Zod schema helper to wrap a data schema with offset pagination metadata.
 *
 * @example
 * ```typescript
 * const outputSchema = paginatedResponse(itemSchema);
 * ```
 */
export function paginatedResponse<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: z.array(dataSchema),
    meta: z.object({
      type: z.literal('offset'),
      page: z.number(),
      perPage: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
    links: z.object({
      self: z.string(),
      first: z.string().optional(),
      last: z.string().optional(),
      prev: z.string().optional(),
      next: z.string().optional(),
    }),
  });
}

/**
 * Zod schema helper to wrap a data schema with cursor pagination metadata.
 *
 * @example
 * ```typescript
 * const outputSchema = cursorPaginatedResponse(itemSchema);
 * ```
 */
export function cursorPaginatedResponse<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: z.array(dataSchema),
    meta: z.object({
      type: z.literal('cursor'),
      cursor: z.string().nullable(),
      nextCursor: z.string().nullable(),
      prevCursor: z.string().nullable(),
      hasMore: z.boolean(),
      total: z.number().optional(),
    }),
    links: z.object({
      self: z.string(),
      first: z.string().optional(),
      last: z.string().optional(),
      prev: z.string().optional(),
      next: z.string().optional(),
    }),
  });
}
