/**
 * Pagination Unit Tests
 *
 * Tests for offset pagination, cursor pagination, link header generation,
 * middleware, validation schemas, and edge cases.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PaginationService } from '../pagination.service';
import {
  paginatedMiddleware,
  cursorPaginatedMiddleware,
  paginatedResponse,
  cursorPaginatedResponse,
} from '../pagination.middleware';
import {
  offsetPaginationSchema,
  cursorPaginationSchema,
  paginationSchema,
} from '../pagination.validation';
import { z } from 'zod';

// ─── Offset Pagination ──────────────────────────────────────────────────────

describe('PaginationService - Offset', () => {
  let service: PaginationService;

  beforeEach(() => {
    service = new PaginationService();
  });

  it('should paginate first page correctly', () => {
    const result = service.paginateOffset({
      data: [{ id: 1 }, { id: 2 }],
      total: 50,
      params: { page: 1, perPage: 25 },
      baseUrl: 'https://api.example.com/items',
    });

    expect(result.data).toHaveLength(2);
    expect(result.meta.type).toBe('offset');
    expect(result.meta.page).toBe(1);
    expect(result.meta.perPage).toBe(25);
    expect(result.meta.total).toBe(50);
    expect(result.meta.totalPages).toBe(2);
  });

  it('should calculate totalPages correctly for exact division', () => {
    const result = service.paginateOffset({
      data: [],
      total: 100,
      params: { page: 1, perPage: 25 },
      baseUrl: 'https://api.example.com/items',
    });

    expect(result.meta.totalPages).toBe(4);
  });

  it('should calculate totalPages correctly with remainder', () => {
    const result = service.paginateOffset({
      data: [],
      total: 101,
      params: { page: 1, perPage: 25 },
      baseUrl: 'https://api.example.com/items',
    });

    expect(result.meta.totalPages).toBe(5);
  });

  it('should handle single page result', () => {
    const result = service.paginateOffset({
      data: [{ id: 1 }, { id: 2 }, { id: 3 }],
      total: 3,
      params: { page: 1, perPage: 25 },
      baseUrl: 'https://api.example.com/items',
    });

    expect(result.meta.totalPages).toBe(1);
    expect(result.links.next).toBeUndefined();
    expect(result.links.prev).toBeUndefined();
  });

  it('should handle empty results', () => {
    const result = service.paginateOffset({
      data: [],
      total: 0,
      params: { page: 1, perPage: 25 },
      baseUrl: 'https://api.example.com/items',
    });

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
    expect(result.meta.totalPages).toBe(1);
    expect(result.links.next).toBeUndefined();
    expect(result.links.prev).toBeUndefined();
  });

  it('should generate correct links for middle page', () => {
    const result = service.paginateOffset({
      data: [{ id: 26 }],
      total: 75,
      params: { page: 2, perPage: 25 },
      baseUrl: 'https://api.example.com/items',
    });

    expect(result.links.self).toBe('https://api.example.com/items?page=2&perPage=25');
    expect(result.links.first).toBe('https://api.example.com/items?page=1&perPage=25');
    expect(result.links.last).toBe('https://api.example.com/items?page=3&perPage=25');
    expect(result.links.prev).toBe('https://api.example.com/items?page=1&perPage=25');
    expect(result.links.next).toBe('https://api.example.com/items?page=3&perPage=25');
  });

  it('should generate correct links for last page', () => {
    const result = service.paginateOffset({
      data: [{ id: 51 }],
      total: 75,
      params: { page: 3, perPage: 25 },
      baseUrl: 'https://api.example.com/items',
    });

    expect(result.links.prev).toBe('https://api.example.com/items?page=2&perPage=25');
    expect(result.links.next).toBeUndefined();
  });

  it('should generate correct links for first page', () => {
    const result = service.paginateOffset({
      data: [{ id: 1 }],
      total: 75,
      params: { page: 1, perPage: 25 },
      baseUrl: 'https://api.example.com/items',
    });

    expect(result.links.prev).toBeUndefined();
    expect(result.links.next).toBe('https://api.example.com/items?page=2&perPage=25');
  });

  it('should work with different perPage values', () => {
    const result = service.paginateOffset({
      data: [{ id: 1 }],
      total: 10,
      params: { page: 1, perPage: 5 },
      baseUrl: 'https://api.example.com/items',
    });

    expect(result.meta.perPage).toBe(5);
    expect(result.meta.totalPages).toBe(2);
    expect(result.links.self).toContain('perPage=5');
  });
});

// ─── Cursor Pagination ──────────────────────────────────────────────────────

describe('PaginationService - Cursor', () => {
  let service: PaginationService;

  beforeEach(() => {
    service = new PaginationService();
  });

  it('should paginate forward with hasMore = true when extra row present', () => {
    // Simulates fetching limit + 1 rows
    const data = [
      { id: 'a', name: 'Item A' },
      { id: 'b', name: 'Item B' },
      { id: 'c', name: 'Item C' }, // extra row
    ];

    const result = service.paginateCursor({
      data,
      params: { limit: 2, direction: 'forward' },
      baseUrl: 'https://api.example.com/items',
      getCursor: (row) => row.id,
    });

    expect(result.data).toHaveLength(2);
    expect(result.meta.type).toBe('cursor');
    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.nextCursor).toBe('b');
    expect(result.meta.prevCursor).toBeNull(); // no cursor param was provided
    expect(result.meta.cursor).toBeNull();
  });

  it('should paginate forward with hasMore = false on last page', () => {
    const data = [
      { id: 'd', name: 'Item D' },
      { id: 'e', name: 'Item E' },
    ];

    const result = service.paginateCursor({
      data,
      params: { cursor: 'c', limit: 5, direction: 'forward' },
      baseUrl: 'https://api.example.com/items',
      getCursor: (row) => row.id,
    });

    expect(result.data).toHaveLength(2);
    expect(result.meta.hasMore).toBe(false);
    expect(result.meta.nextCursor).toBeNull();
    expect(result.meta.prevCursor).toBe('d'); // cursor was provided, so prevCursor is set
    expect(result.meta.cursor).toBe('c');
  });

  it('should paginate backward and reverse data', () => {
    // Data comes in reverse order from DB (e.g., ORDER BY id DESC)
    const data = [
      { id: 'c', name: 'Item C' },
      { id: 'b', name: 'Item B' },
      { id: 'a', name: 'Item A' }, // extra row
    ];

    const result = service.paginateCursor({
      data,
      params: { cursor: 'd', limit: 2, direction: 'backward' },
      baseUrl: 'https://api.example.com/items',
      getCursor: (row) => row.id,
    });

    // Data should be reversed back to ascending order
    expect(result.data).toHaveLength(2);
    expect(result.data[0].id).toBe('b');
    expect(result.data[1].id).toBe('c');
    expect(result.meta.hasMore).toBe(true);
  });

  it('should handle empty results', () => {
    const result = service.paginateCursor({
      data: [],
      params: { limit: 25, direction: 'forward' },
      baseUrl: 'https://api.example.com/items',
      getCursor: (row: any) => row.id,
    });

    expect(result.data).toHaveLength(0);
    expect(result.meta.hasMore).toBe(false);
    expect(result.meta.nextCursor).toBeNull();
    expect(result.meta.prevCursor).toBeNull();
  });

  it('should include total when provided', () => {
    const result = service.paginateCursor({
      data: [{ id: 'a' }],
      params: { limit: 25 },
      baseUrl: 'https://api.example.com/items',
      getCursor: (row) => row.id,
      total: 42,
    });

    expect(result.meta.total).toBe(42);
  });

  it('should omit total when not provided', () => {
    const result = service.paginateCursor({
      data: [{ id: 'a' }],
      params: { limit: 25 },
      baseUrl: 'https://api.example.com/items',
      getCursor: (row) => row.id,
    });

    expect(result.meta.total).toBeUndefined();
  });

  it('should generate cursor links with next', () => {
    const result = service.paginateCursor({
      data: [{ id: 'a' }, { id: 'b' }, { id: 'extra' }],
      params: { limit: 2 },
      baseUrl: 'https://api.example.com/items',
      getCursor: (row) => row.id,
    });

    expect(result.links.next).toContain('cursor=b');
    expect(result.links.next).toContain('direction=forward');
    expect(result.links.next).toContain('limit=2');
  });

  it('should generate cursor links with prev when cursor provided', () => {
    const result = service.paginateCursor({
      data: [{ id: 'c' }, { id: 'd' }],
      params: { cursor: 'b', limit: 5 },
      baseUrl: 'https://api.example.com/items',
      getCursor: (row) => row.id,
    });

    expect(result.links.prev).toContain('cursor=c');
    expect(result.links.prev).toContain('direction=backward');
  });
});

// ─── Link Header ────────────────────────────────────────────────────────────

describe('PaginationService - Link Header', () => {
  let service: PaginationService;

  beforeEach(() => {
    service = new PaginationService();
  });

  it('should build RFC 5988 link header with all links', () => {
    const header = service.buildLinkHeader({
      self: 'https://api.example.com/items?page=2',
      first: 'https://api.example.com/items?page=1',
      prev: 'https://api.example.com/items?page=1',
      next: 'https://api.example.com/items?page=3',
      last: 'https://api.example.com/items?page=5',
    });

    expect(header).toContain('<https://api.example.com/items?page=1>; rel="first"');
    expect(header).toContain('<https://api.example.com/items?page=1>; rel="prev"');
    expect(header).toContain('<https://api.example.com/items?page=3>; rel="next"');
    expect(header).toContain('<https://api.example.com/items?page=5>; rel="last"');
  });

  it('should build link header with only some links', () => {
    const header = service.buildLinkHeader({
      self: 'https://api.example.com/items?page=1',
      first: 'https://api.example.com/items?page=1',
      next: 'https://api.example.com/items?page=2',
    });

    expect(header).toContain('rel="first"');
    expect(header).toContain('rel="next"');
    expect(header).not.toContain('rel="prev"');
    expect(header).not.toContain('rel="last"');
  });

  it('should return empty string when no optional links', () => {
    const header = service.buildLinkHeader({
      self: 'https://api.example.com/items',
    });

    expect(header).toBe('');
  });

  it('should separate multiple links with commas', () => {
    const header = service.buildLinkHeader({
      self: 'https://api.example.com/items?page=2',
      first: 'https://api.example.com/items?page=1',
      next: 'https://api.example.com/items?page=3',
    });

    const parts = header.split(', ');
    expect(parts).toHaveLength(2);
  });
});

// ─── Validation Schemas ─────────────────────────────────────────────────────

describe('Pagination Validation', () => {
  describe('offsetPaginationSchema', () => {
    it('should accept valid offset params', () => {
      const result = offsetPaginationSchema.parse({ page: 2, perPage: 10 });
      expect(result.page).toBe(2);
      expect(result.perPage).toBe(10);
    });

    it('should apply defaults', () => {
      const result = offsetPaginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(25);
    });

    it('should coerce string values', () => {
      const result = offsetPaginationSchema.parse({ page: '3', perPage: '15' });
      expect(result.page).toBe(3);
      expect(result.perPage).toBe(15);
    });

    it('should reject page below 1', () => {
      const result = offsetPaginationSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject perPage above max', () => {
      const result = offsetPaginationSchema.safeParse({ perPage: 200 });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer values', () => {
      const result = offsetPaginationSchema.safeParse({ page: 1.5 });
      expect(result.success).toBe(false);
    });
  });

  describe('cursorPaginationSchema', () => {
    it('should accept valid cursor params', () => {
      const result = cursorPaginationSchema.parse({
        type: 'cursor',
        cursor: 'abc123',
        limit: 10,
        direction: 'forward',
      });
      expect(result.cursor).toBe('abc123');
      expect(result.limit).toBe(10);
      expect(result.direction).toBe('forward');
    });

    it('should apply default limit', () => {
      const result = cursorPaginationSchema.parse({ type: 'cursor' });
      expect(result.limit).toBe(25);
    });

    it('should accept backward direction', () => {
      const result = cursorPaginationSchema.parse({
        type: 'cursor',
        direction: 'backward',
      });
      expect(result.direction).toBe('backward');
    });

    it('should reject limit above max', () => {
      const result = cursorPaginationSchema.safeParse({
        type: 'cursor',
        limit: 200,
      });
      expect(result.success).toBe(false);
    });

    it('should allow omitting cursor', () => {
      const result = cursorPaginationSchema.parse({ type: 'cursor', limit: 10 });
      expect(result.cursor).toBeUndefined();
    });
  });

  describe('paginationSchema (discriminated union)', () => {
    it('should parse offset type', () => {
      const result = paginationSchema.parse({ type: 'offset', page: 1, perPage: 10 });
      expect(result.type).toBe('offset');
    });

    it('should parse cursor type', () => {
      const result = paginationSchema.parse({ type: 'cursor', limit: 10 });
      expect(result.type).toBe('cursor');
    });

    it('should reject invalid type', () => {
      const result = paginationSchema.safeParse({ type: 'invalid' });
      expect(result.success).toBe(false);
    });
  });
});

// ─── Middleware ──────────────────────────────────────────────────────────────

describe('paginatedMiddleware', () => {
  it('should extract offset pagination from input and add to context', async () => {
    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = { request: new Request('https://example.com') };
    const input = { page: 3, perPage: 10, someFilter: 'test' };

    await paginatedMiddleware({ ctx, input, next });

    expect(next).toHaveBeenCalledTimes(1);
    const passedCtx = next.mock.calls[0][0].ctx;
    expect(passedCtx.pagination.page).toBe(3);
    expect(passedCtx.pagination.perPage).toBe(10);
  });

  it('should use defaults when input has no pagination params', async () => {
    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = {};
    const input = {};

    await paginatedMiddleware({ ctx, input, next });

    const passedCtx = next.mock.calls[0][0].ctx;
    expect(passedCtx.pagination.page).toBe(1);
    expect(passedCtx.pagination.perPage).toBe(25);
  });

  it('should preserve existing context properties', async () => {
    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = { session: { user: { id: 'user-1' } } };
    const input = { page: 1, perPage: 25 };

    await paginatedMiddleware({ ctx, input, next });

    const passedCtx = next.mock.calls[0][0].ctx;
    expect(passedCtx.session.user.id).toBe('user-1');
    expect(passedCtx.pagination).toBeDefined();
  });
});

describe('cursorPaginatedMiddleware', () => {
  it('should extract cursor pagination from input', async () => {
    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = {};
    const input = { type: 'cursor', cursor: 'abc', limit: 10, direction: 'backward' };

    await cursorPaginatedMiddleware({ ctx, input, next });

    const passedCtx = next.mock.calls[0][0].ctx;
    expect(passedCtx.pagination.cursor).toBe('abc');
    expect(passedCtx.pagination.limit).toBe(10);
    expect(passedCtx.pagination.direction).toBe('backward');
  });

  it('should use defaults for invalid input', async () => {
    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = {};
    const input = {};

    await cursorPaginatedMiddleware({ ctx, input, next });

    const passedCtx = next.mock.calls[0][0].ctx;
    expect(passedCtx.pagination.cursor).toBeUndefined();
    expect(passedCtx.pagination.limit).toBe(25);
    expect(passedCtx.pagination.direction).toBe('forward');
  });
});

// ─── Response Helpers ───────────────────────────────────────────────────────

describe('paginatedResponse', () => {
  it('should create a valid zod schema for offset pagination response', () => {
    const itemSchema = z.object({ id: z.string(), name: z.string() });
    const schema = paginatedResponse(itemSchema);

    const valid = schema.safeParse({
      data: [{ id: '1', name: 'Test' }],
      meta: {
        type: 'offset',
        page: 1,
        perPage: 25,
        total: 1,
        totalPages: 1,
      },
      links: {
        self: 'https://example.com/items?page=1&perPage=25',
      },
    });

    expect(valid.success).toBe(true);
  });

  it('should reject invalid data items', () => {
    const itemSchema = z.object({ id: z.string() });
    const schema = paginatedResponse(itemSchema);

    const result = schema.safeParse({
      data: [{ notId: 'bad' }],
      meta: {
        type: 'offset',
        page: 1,
        perPage: 25,
        total: 1,
        totalPages: 1,
      },
      links: { self: 'https://example.com' },
    });

    expect(result.success).toBe(false);
  });
});

describe('cursorPaginatedResponse', () => {
  it('should create a valid zod schema for cursor pagination response', () => {
    const itemSchema = z.object({ id: z.string() });
    const schema = cursorPaginatedResponse(itemSchema);

    const valid = schema.safeParse({
      data: [{ id: '1' }],
      meta: {
        type: 'cursor',
        cursor: null,
        nextCursor: 'abc',
        prevCursor: null,
        hasMore: true,
      },
      links: {
        self: 'https://example.com/items',
      },
    });

    expect(valid.success).toBe(true);
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────────────

describe('Edge Cases', () => {
  let service: PaginationService;

  beforeEach(() => {
    service = new PaginationService();
  });

  it('should handle very large total with small perPage', () => {
    const result = service.paginateOffset({
      data: [],
      total: 1_000_000,
      params: { page: 1, perPage: 10 },
      baseUrl: 'https://api.example.com/items',
    });

    expect(result.meta.totalPages).toBe(100_000);
  });

  it('should handle perPage = 1', () => {
    const result = service.paginateOffset({
      data: [{ id: 1 }],
      total: 5,
      params: { page: 3, perPage: 1 },
      baseUrl: 'https://api.example.com/items',
    });

    expect(result.meta.totalPages).toBe(5);
    expect(result.links.prev).toContain('page=2');
    expect(result.links.next).toContain('page=4');
  });

  it('should handle cursor pagination with exactly limit items (no extra)', () => {
    const data = [{ id: 'a' }, { id: 'b' }];

    const result = service.paginateCursor({
      data,
      params: { limit: 2 },
      baseUrl: 'https://api.example.com/items',
      getCursor: (row) => row.id,
    });

    expect(result.data).toHaveLength(2);
    expect(result.meta.hasMore).toBe(false);
    expect(result.meta.nextCursor).toBeNull();
  });

  it('should handle cursor pagination with single item', () => {
    const result = service.paginateCursor({
      data: [{ id: 'only-one' }],
      params: { limit: 25 },
      baseUrl: 'https://api.example.com/items',
      getCursor: (row) => row.id,
    });

    expect(result.data).toHaveLength(1);
    expect(result.meta.hasMore).toBe(false);
  });
});

// ─── Import from vitest (implicit global) ───────────────────────────────────
import { vi } from 'vitest';
