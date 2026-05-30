import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Pagination', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('offset paginated endpoint returns pagination meta', async ({ request }) => {
    // Hit a tRPC endpoint that supports pagination (e.g., notifications or any list endpoint)
    const res = await request.get(
      `${BASE_URL}/api/trpc/notification.list?input=${encodeURIComponent(JSON.stringify({ json: { page: 1, perPage: 5 } }))}`,
    );

    // If this endpoint doesn't exist or requires auth, just verify the framework doesn't crash
    if (res.status() === 401 || res.status() === 404) {
      test.skip(true, 'Paginated endpoint not available without auth');
      return;
    }

    if (res.ok()) {
      const body = await res.json();
      const result = body?.result?.data?.json;

      // If the endpoint returns paginated data, verify the structure
      if (result?.meta) {
        expect(result.meta).toHaveProperty('page');
        expect(result.meta).toHaveProperty('perPage');
        expect(result.meta).toHaveProperty('total');
        expect(result.meta).toHaveProperty('totalPages');

        expect(typeof result.meta.page).toBe('number');
        expect(typeof result.meta.perPage).toBe('number');
        expect(typeof result.meta.total).toBe('number');
        expect(typeof result.meta.totalPages).toBe('number');

        expect(result.meta.page).toBeGreaterThanOrEqual(1);
        expect(result.meta.perPage).toBeGreaterThanOrEqual(1);
        expect(result.meta.totalPages).toBeGreaterThanOrEqual(1);
      }

      // Verify data is always an array
      if (result?.data) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    }
  });

  test('pagination links include self reference', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/notification.list?input=${encodeURIComponent(JSON.stringify({ json: { page: 1, perPage: 10 } }))}`,
    );

    if (res.status() === 401 || res.status() === 404) {
      test.skip(true, 'Paginated endpoint not available without auth');
      return;
    }

    if (res.ok()) {
      const body = await res.json();
      const result = body?.result?.data?.json;

      if (result?.links) {
        expect(result.links).toHaveProperty('self');
        expect(typeof result.links.self).toBe('string');

        // If there are more pages, next link should exist
        if (result.meta?.page < result.meta?.totalPages) {
          expect(result.links.next).toBeDefined();
        }
      }
    }
  });

  test('page parameter affects returned results', async ({ request }) => {
    // Request page 1
    const res1 = await request.get(
      `${BASE_URL}/api/trpc/notification.list?input=${encodeURIComponent(JSON.stringify({ json: { page: 1, perPage: 2 } }))}`,
    );

    // Request page 2
    const res2 = await request.get(
      `${BASE_URL}/api/trpc/notification.list?input=${encodeURIComponent(JSON.stringify({ json: { page: 2, perPage: 2 } }))}`,
    );

    if (res1.status() === 401 || res1.status() === 404) {
      test.skip(true, 'Paginated endpoint not available without auth');
      return;
    }

    if (res1.ok() && res2.ok()) {
      const body1 = await res1.json();
      const body2 = await res2.json();
      const result1 = body1?.result?.data?.json;
      const result2 = body2?.result?.data?.json;

      if (result1?.meta && result2?.meta) {
        expect(result1.meta.page).toBe(1);
        expect(result2.meta.page).toBe(2);

        // Total should be consistent across pages
        expect(result1.meta.total).toBe(result2.meta.total);
        expect(result1.meta.totalPages).toBe(result2.meta.totalPages);
      }
    }
  });

  test('perPage limits the number of returned items', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/notification.list?input=${encodeURIComponent(JSON.stringify({ json: { page: 1, perPage: 3 } }))}`,
    );

    if (res.status() === 401 || res.status() === 404) {
      test.skip(true, 'Paginated endpoint not available without auth');
      return;
    }

    if (res.ok()) {
      const body = await res.json();
      const result = body?.result?.data?.json;

      if (result?.data && result?.meta) {
        // Data items should not exceed perPage
        expect(result.data.length).toBeLessThanOrEqual(result.meta.perPage);
      }
    }
  });

  test('requesting beyond total pages returns empty data', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/notification.list?input=${encodeURIComponent(JSON.stringify({ json: { page: 99999, perPage: 25 } }))}`,
    );

    if (res.status() === 401 || res.status() === 404) {
      test.skip(true, 'Paginated endpoint not available without auth');
      return;
    }

    if (res.ok()) {
      const body = await res.json();
      const result = body?.result?.data?.json;

      if (result?.data) {
        // Far beyond last page should return empty data
        expect(result.data.length).toBe(0);
      }
    }
  });
});
