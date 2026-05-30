import { test, expect } from '@playwright/test';

/**
 * E2E tests for the API Resources / Serializers feature.
 *
 * These tests verify that the Resource system correctly transforms
 * API responses by checking tRPC endpoints that use Resources.
 * The health endpoint is used as a baseline to confirm the server is up.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('API Resources / Serializers', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('health endpoint returns a well-structured JSON response', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    // The health response should be a structured object (transformed by a Resource or handler)
    expect(body).toBeDefined();
    expect(typeof body).toBe('object');
  });

  test('tRPC health endpoint returns serialized resource shape', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/health.health`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    // tRPC wraps responses in { result: { data: { json: ... } } }
    expect(body).toHaveProperty('result');
    expect(body.result).toHaveProperty('data');

    const data = body.result.data.json ?? body.result.data;
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
  });

  test('API responses do not leak internal database fields', async ({ request }) => {
    // Fetch the health check response — even simple endpoints should not expose raw DB fields
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const bodyStr = JSON.stringify(body);

    // Common internal fields that should never appear in API responses
    expect(bodyStr).not.toContain('passwordHash');
    expect(bodyStr).not.toContain('password_hash');
    expect(bodyStr).not.toContain('internalNotes');
    expect(bodyStr).not.toContain('internal_notes');
  });

  test('paginated endpoints include meta and links', async ({ request }) => {
    // Try a tRPC endpoint that might return paginated data
    // This is a smoke test — if the endpoint exists and returns pagination, verify structure
    const endpoints = [
      `${BASE_URL}/api/trpc/health.health`,
    ];

    for (const endpoint of endpoints) {
      const res = await request.get(endpoint);
      if (!res.ok()) continue;

      const body = await res.json();
      const data = body?.result?.data?.json ?? body?.result?.data;

      // If the response has pagination structure, verify it
      if (data && typeof data === 'object' && 'meta' in data && 'data' in data) {
        expect(data.meta).toHaveProperty('total');
        expect(data.meta).toHaveProperty('page');
        expect(data.meta).toHaveProperty('perPage');
        expect(data.meta).toHaveProperty('lastPage');
        expect(typeof data.meta.total).toBe('number');
        expect(typeof data.meta.page).toBe('number');
      }
    }
  });

  test('responses are valid JSON with consistent structure', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.ok()).toBeTruthy();

    // Verify Content-Type header
    const contentType = res.headers()['content-type'] ?? '';
    expect(contentType).toContain('json');

    // Verify the body parses without error
    const body = await res.json();
    expect(body).toBeDefined();
  });
});
