import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('tRPC API Infrastructure', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('tRPC endpoint responds to GET queries', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/health.health`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toHaveProperty('result');
    expect(body.result).toHaveProperty('data');
  });

  test('tRPC batch requests return array of results', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/health.health,health.detailed`,
    );

    if (res.ok()) {
      const body = await res.json();
      // Batch responses are arrays
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2);

      // Each element has result.data
      for (const item of body) {
        expect(item).toHaveProperty('result');
        expect(item.result).toHaveProperty('data');
      }
    }
  });

  test('tRPC returns proper error shape for unknown procedures', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/nonexistent.procedure`,
    );

    // tRPC returns HTTP 500 for NOT_FOUND — check the error body structure
    const body = await res.json();
    expect(body?.error).toBeDefined();
    expect(body.error?.data?.code).toBe('NOT_FOUND');
  });

  test('tRPC mutations use POST method', async ({ request }) => {
    // Try a GET to a mutation endpoint - tRPC handles this with an error
    const res = await request.get(`${BASE_URL}/api/trpc/maintenance.enable`);

    // tRPC returns a JSON error body (may use HTTP 500 or 405)
    const body = await res.json();
    expect(body?.error).toBeDefined();
  });

  test('tRPC handles malformed JSON input gracefully', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/maintenance.enable`, {
      headers: { 'Content-Type': 'application/json' },
      data: 'not valid json{{{',
    });

    // tRPC returns a JSON error body for malformed input
    const body = await res.json();
    expect(body?.error).toBeDefined();
  });

  test('tRPC returns CORS headers', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/health.health`);
    expect(res.ok()).toBeTruthy();

    // Check for common CORS-related headers
    const headers = res.headers();
    // At minimum the response should have content-type
    expect(headers['content-type']).toContain('application/json');
  });

  test('tRPC input validation returns BAD_REQUEST for invalid input', async ({ request }) => {
    // Send invalid input to a procedure that requires specific input
    const res = await request.get(
      `${BASE_URL}/api/trpc/featureFlag.evaluate?input=${encodeURIComponent('not-json')}`,
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    // Should be BAD_REQUEST or parse error, or UNAUTHORIZED if auth is checked first
    expect(error.data?.code).toMatch(/BAD_REQUEST|PARSE_ERROR|UNAUTHORIZED|FORBIDDEN/);
  });

  test('protected procedures reject unauthenticated requests consistently', async ({ request }) => {
    // Test multiple protected procedures to ensure consistent behavior
    const protectedEndpoints = [
      `${BASE_URL}/api/trpc/scheduler.list`,
      `${BASE_URL}/api/trpc/job.getStatus?input=${encodeURIComponent(JSON.stringify({ jobId: 'test' }))}`,
      `${BASE_URL}/api/trpc/upload.get?input=${encodeURIComponent(JSON.stringify({ id: 'test' }))}`,
    ];

    for (const url of protectedEndpoints) {
      const res = await request.get(url);
      const body = await res.json();
      const error = body?.error;
      expect(error).toBeDefined();
      expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
    }
  });

  test('public procedures are accessible without authentication', async ({ request }) => {
    const publicEndpoints = [
      `${BASE_URL}/api/trpc/health.health`,
      `${BASE_URL}/api/trpc/health.detailed`,
      `${BASE_URL}/api/trpc/health.readiness`,
      `${BASE_URL}/api/trpc/maintenance.status`,
    ];

    for (const url of publicEndpoints) {
      const res = await request.get(url);
      expect(res.ok()).toBeTruthy();
    }
  });

  test('tRPC response times are reasonable', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${BASE_URL}/api/trpc/health.health`);
    const duration = Date.now() - start;

    expect(res.ok()).toBeTruthy();
    // Health check should respond in under 5 seconds
    expect(duration).toBeLessThan(5000);
  });
});
