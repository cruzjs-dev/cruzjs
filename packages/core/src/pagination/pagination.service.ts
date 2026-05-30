/**
 * Pagination Service
 *
 * Central service for paginating query results using either
 * offset-based or cursor-based strategies. Works with Drizzle
 * query builders and provides RFC 5988 Link header generation.
 */

import { Injectable } from '../di';
import type {
  OffsetPaginationParams,
  CursorPaginationParams,
  OffsetPaginationMeta,
  CursorPaginationMeta,
  PaginatedResult,
  PaginationLinks,
} from './pagination.types';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE } from './pagination.types';

export type OffsetPaginateOptions<T> = {
  /** Pre-fetched data for the current page */
  data: T[];
  /** Total number of rows (from a separate COUNT query) */
  total: number;
  /** Pagination parameters */
  params: OffsetPaginationParams;
  /** Base URL for link generation (without query params) */
  baseUrl: string;
};

export type CursorPaginateOptions<T> = {
  /**
   * Pre-fetched data for the current page.
   * Should fetch `limit + 1` rows so the service can determine `hasMore`.
   */
  data: T[];
  /** Pagination parameters */
  params: CursorPaginationParams;
  /** Base URL for link generation (without query params) */
  baseUrl: string;
  /** Extract the cursor value from a row */
  getCursor: (row: T) => string;
  /** Optional total count (expensive for cursor pagination, so optional) */
  total?: number;
};

@Injectable()
export class PaginationService {
  /**
   * Build an offset-paginated result from pre-fetched data and a total count.
   *
   * The caller is responsible for applying LIMIT/OFFSET to the query
   * and providing the total row count.
   */
  paginateOffset<T>(options: OffsetPaginateOptions<T>): PaginatedResult<T, OffsetPaginationMeta> {
    const { data, total, params, baseUrl } = options;
    const page = params.page ?? DEFAULT_PAGE;
    const perPage = params.perPage ?? DEFAULT_PER_PAGE;
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    const meta: OffsetPaginationMeta = {
      type: 'offset',
      page,
      perPage,
      total,
      totalPages,
    };

    const links = this.buildOffsetLinks(baseUrl, page, perPage, totalPages);

    return { data, meta, links };
  }

  /**
   * Build a cursor-paginated result from pre-fetched data.
   *
   * The caller should fetch `limit + 1` rows. The extra row is used to
   * determine whether more data exists and is stripped from the result.
   */
  paginateCursor<T>(options: CursorPaginateOptions<T>): PaginatedResult<T, CursorPaginationMeta> {
    const { params, baseUrl, getCursor, total } = options;
    const limit = params.limit;
    const direction = params.direction ?? 'forward';

    // If we got more rows than requested, there are more results
    const hasMore = options.data.length > limit;
    const data = hasMore ? options.data.slice(0, limit) : options.data;

    // For backward direction, reverse to maintain expected order
    if (direction === 'backward') {
      data.reverse();
    }

    const firstItem = data.length > 0 ? data[0] : undefined;
    const lastItem = data.length > 0 ? data[data.length - 1] : undefined;

    const nextCursor = hasMore && lastItem ? getCursor(lastItem) : null;
    const prevCursor = params.cursor && firstItem ? getCursor(firstItem) : null;

    const meta: CursorPaginationMeta = {
      type: 'cursor',
      cursor: params.cursor ?? null,
      nextCursor,
      prevCursor,
      hasMore,
      ...(total !== undefined ? { total } : {}),
    };

    const links = this.buildCursorLinks(baseUrl, limit, nextCursor, prevCursor);

    return { data, meta, links };
  }

  /**
   * Build an RFC 5988 Link header string from pagination links.
   *
   * @example
   * ```
   * <https://api.example.com/items?page=2&perPage=25>; rel="next",
   * <https://api.example.com/items?page=1&perPage=25>; rel="first"
   * ```
   */
  buildLinkHeader(links: PaginationLinks): string {
    const parts: string[] = [];

    if (links.first) parts.push(`<${links.first}>; rel="first"`);
    if (links.prev) parts.push(`<${links.prev}>; rel="prev"`);
    if (links.next) parts.push(`<${links.next}>; rel="next"`);
    if (links.last) parts.push(`<${links.last}>; rel="last"`);

    return parts.join(', ');
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private buildOffsetLinks(
    baseUrl: string,
    page: number,
    perPage: number,
    totalPages: number,
  ): PaginationLinks {
    const buildUrl = (p: number) => `${baseUrl}?page=${p}&perPage=${perPage}`;

    const links: PaginationLinks = {
      self: buildUrl(page),
      first: buildUrl(1),
      last: buildUrl(totalPages),
    };

    if (page > 1) {
      links.prev = buildUrl(page - 1);
    }

    if (page < totalPages) {
      links.next = buildUrl(page + 1);
    }

    return links;
  }

  private buildCursorLinks(
    baseUrl: string,
    limit: number,
    nextCursor: string | null,
    prevCursor: string | null,
  ): PaginationLinks {
    const buildUrl = (cursor?: string, direction?: string) => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (cursor) params.set('cursor', cursor);
      if (direction) params.set('direction', direction);
      return `${baseUrl}?${params.toString()}`;
    };

    const links: PaginationLinks = {
      self: buildUrl(undefined),
    };

    if (nextCursor) {
      links.next = buildUrl(nextCursor, 'forward');
    }

    if (prevCursor) {
      links.prev = buildUrl(prevCursor, 'backward');
    }

    return links;
  }
}
