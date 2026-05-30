import type { PaginationMeta } from './resource.types';

/**
 * Build pagination metadata from totals.
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  perPage: number,
): PaginationMeta {
  return {
    total,
    page,
    perPage,
    lastPage: Math.max(1, Math.ceil(total / perPage)),
  };
}

/**
 * Slice an in-memory array and return it with pagination metadata.
 *
 * Useful when the full dataset is already loaded (e.g. from a
 * non-offset DB query).  For database-level pagination, build the
 * meta via `buildPaginationMeta` and pass it to `ResourceCollection`.
 */
export function paginate<T>(
  items: T[],
  page: number,
  perPage: number,
): { data: T[]; meta: PaginationMeta } {
  const total = items.length;
  const meta = buildPaginationMeta(total, page, perPage);
  const start = (page - 1) * perPage;
  const data = items.slice(start, start + perPage);

  return { data, meta };
}
