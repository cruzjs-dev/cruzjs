/**
 * Pagination Validation Schemas
 *
 * Zod schemas for validating offset and cursor pagination parameters
 * with sensible defaults and coercion.
 */

import { z } from 'zod';
import {
  DEFAULT_PAGE,
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
  DEFAULT_CURSOR_LIMIT,
  MAX_CURSOR_LIMIT,
} from './pagination.types';

export const offsetPaginationSchema = z.object({
  type: z.literal('offset').default('offset'),
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  perPage: z.coerce.number().int().min(1).max(MAX_PER_PAGE).default(DEFAULT_PER_PAGE),
});

export type OffsetPaginationInput = z.infer<typeof offsetPaginationSchema>;

export const cursorPaginationSchema = z.object({
  type: z.literal('cursor'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_CURSOR_LIMIT).default(DEFAULT_CURSOR_LIMIT),
  direction: z.enum(['forward', 'backward']).default('forward').optional(),
});

export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>;

export const paginationSchema = z.discriminatedUnion('type', [
  offsetPaginationSchema,
  cursorPaginationSchema,
]);

export type PaginationInput = z.infer<typeof paginationSchema>;
