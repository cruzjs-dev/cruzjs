/**
 * Pagination Types
 *
 * Core types for the pagination system supporting both
 * offset-based and cursor-based pagination strategies.
 */

export const PaginationType = {
  OFFSET: 'offset',
  CURSOR: 'cursor',
} as const;

export type PaginationType = (typeof PaginationType)[keyof typeof PaginationType];

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_PAGE = 1;
export const DEFAULT_PER_PAGE = 25;
export const MAX_PER_PAGE = 100;
export const DEFAULT_CURSOR_LIMIT = 25;
export const MAX_CURSOR_LIMIT = 100;

// ── Offset Pagination ─────────────────────────────────────────────────────────

export type OffsetPaginationParams = {
  page: number;
  perPage: number;
};

export type OffsetPaginationMeta = {
  type: 'offset';
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

// ── Cursor Pagination ─────────────────────────────────────────────────────────

export type CursorDirection = 'forward' | 'backward';

export type CursorPaginationParams = {
  cursor?: string;
  limit: number;
  direction?: CursorDirection;
};

export type CursorPaginationMeta = {
  type: 'cursor';
  cursor: string | null;
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  total?: number;
};

// ── Shared ────────────────────────────────────────────────────────────────────

export type PaginationLinks = {
  self: string;
  first?: string;
  last?: string;
  prev?: string;
  next?: string;
};

export type PaginatedResult<T, M = OffsetPaginationMeta | CursorPaginationMeta> = {
  data: T[];
  meta: M;
  links: PaginationLinks;
};
