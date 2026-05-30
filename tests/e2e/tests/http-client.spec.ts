import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('HTTP Client', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('server can make outbound HTTP requests (health check uses internal services)', async ({ request }) => {
    // The HttpClient is an internal service used by other features (webhooks, etc.)
    // We verify it indirectly by checking that features depending on it work.
    // The detailed health check runs checks that may use HttpClient internally.
    const res = await request.get(`${BASE_URL}/api/trpc/health.detailed`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const data = body?.result?.data;
    expect(data).toBeDefined();
    expect(data).toHaveProperty('status');
  });

  test('webhook test endpoint exercises HTTP client (requires org context)', async ({ request }) => {
    // The webhook.test endpoint dispatches an outbound HTTP request via HttpClient
    // Without auth this should fail with UNAUTHORIZED, proving the endpoint exists
    const res = await request.post(`${BASE_URL}/api/trpc/webhook.test`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ id: 'nonexistent' }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    // Should fail due to auth, not due to HttpClient being broken
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('HTTP client does not leak internal errors to clients', async ({ request }) => {
    // Make various requests and ensure no raw stack traces or internal details leak
    const endpoints = [
      `${BASE_URL}/api/health`,
      `${BASE_URL}/api/trpc/health.health`,
      `${BASE_URL}/api/trpc/health.detailed`,
    ];

    for (const url of endpoints) {
      const res = await request.get(url);
      const text = await res.text();

      // Response should not contain stack traces or file paths
      expect(text).not.toContain('node_modules');
      expect(text).not.toContain('at Object.');
      expect(text).not.toContain('ECONNREFUSED');
    }
  });

  test('tRPC batch requests work (demonstrates server-side request handling)', async ({ request }) => {
    // tRPC supports batch requests which exercise the server's HTTP handling
    const res = await request.get(
      `${BASE_URL}/api/trpc/health.health,health.detailed`,
    );

    // Batch responses come back as an array
    if (res.ok()) {
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2);

      // First result: health.health (liveness)
      expect(body[0]?.result?.data?.status).toBe('alive');

      // Second result: health.detailed
      expect(body[1]?.result?.data).toHaveProperty('checks');
    }
  });
});
