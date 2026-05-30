/**
 * @cruzjs/core Pagination
 *
 * Offset and cursor pagination with Drizzle integration,
 * tRPC middleware, validation schemas, and RFC 5988 Link headers.
 */

// Types
export type {
  OffsetPaginationParams,
  CursorPaginationParams,
  CursorDirection,
  OffsetPaginationMeta,
  CursorPaginationMeta,
  PaginationLinks,
  PaginatedResult,
} from './pagination.types';
export {
  PaginationType,
  DEFAULT_PAGE,
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
  DEFAULT_CURSOR_LIMIT,
  MAX_CURSOR_LIMIT,
} from './pagination.types';

// Service
export { PaginationService } from './pagination.service';
export type { OffsetPaginateOptions, CursorPaginateOptions } from './pagination.service';

// Validation
export {
  offsetPaginationSchema,
  cursorPaginationSchema,
  paginationSchema,
} from './pagination.validation';
export type {
  OffsetPaginationInput,
  CursorPaginationInput,
  PaginationInput,
} from './pagination.validation';

// Middleware
export {
  paginatedMiddleware,
  cursorPaginatedMiddleware,
  paginatedResponse,
  cursorPaginatedResponse,
} from './pagination.middleware';

// Module
export { PaginationModule } from './pagination.module';
