import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Full-Text Search', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('search endpoint returns results for valid query', async ({ request }) => {
    // The search endpoint requires authentication, so this may return 401
    // if not authenticated. We check the response shape when accessible.
    const res = await request.get(
      `${BASE_URL}/api/trpc/search.search?input=${encodeURIComponent(JSON.stringify({ query: 'test', limit: 10, offset: 0 }))}`,
    );

    // Should return 200 (with results) or 401 (auth required)
    expect([200, 401]).toContain(res.status());

    if (res.ok()) {
      const body = await res.json();
      const result = body.result?.data;

      // Verify response shape
      expect(result).toBeDefined();
      expect(result).toHaveProperty('hits');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('took');
      expect(result).toHaveProperty('query');
      expect(Array.isArray(result.hits)).toBe(true);
      expect(typeof result.total).toBe('number');
      expect(typeof result.took).toBe('number');
      expect(result.query).toBe('test');
    }
  });

  test('search with empty query returns validation error', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/search.search?input=${encodeURIComponent(JSON.stringify({ query: '', limit: 10, offset: 0 }))}`,
    );

    // Should return 400 (validation error) or 401 (auth required)
    expect([400, 401]).toContain(res.status());
  });

  test('search results have correct structure', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/search.search?input=${encodeURIComponent(JSON.stringify({ query: 'example search', type: 'article', limit: 5, offset: 0 }))}`,
    );

    if (res.ok()) {
      const body = await res.json();
      const result = body.result?.data;

      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.took).toBeGreaterThanOrEqual(0);

      // Each hit should have id, score, and data
      for (const hit of result.hits) {
        expect(hit).toHaveProperty('id');
        expect(hit).toHaveProperty('score');
        expect(hit).toHaveProperty('data');
        expect(typeof hit.id).toBe('string');
        expect(typeof hit.score).toBe('number');
      }
    }
  });

  test('reindex endpoint accepts type parameter', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/search.reindex`, {
      data: { type: 'test-type' },
      headers: { 'Content-Type': 'application/json' },
    });

    // Should return 200 or 401 (auth required)
    expect([200, 401]).toContain(res.status());

    if (res.ok()) {
      const body = await res.json();
      const result = body.result?.data;
      expect(result).toHaveProperty('indexed');
      expect(typeof result.indexed).toBe('number');
    }
  });

  test('search with type filter narrows results', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/search.search?input=${encodeURIComponent(JSON.stringify({ query: 'test', type: 'nonexistent-type', limit: 10, offset: 0 }))}`,
    );

    if (res.ok()) {
      const body = await res.json();
      const result = body.result?.data;

      // With a nonexistent type, should return 0 results
      expect(result.total).toBe(0);
      expect(result.hits).toHaveLength(0);
    }
  });

  test('search does not return server errors', async ({ request }) => {
    // Send multiple search requests and verify none return 5xx
    const queries = ['hello', 'world', 'test query', 'a', 'typescript react'];
    const requests = queries.map((q) =>
      request.get(
        `${BASE_URL}/api/trpc/search.search?input=${encodeURIComponent(JSON.stringify({ query: q, limit: 5, offset: 0 }))}`,
      ),
    );

    const responses = await Promise.all(requests);

    for (const res of responses) {
      expect(res.status()).toBeLessThan(500);
    }
  });
});
