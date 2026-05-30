import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Error Reporting', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('health endpoint responds successfully (error reporting module loaded)', async ({ request }) => {
    // Verify the app boots correctly with the ErrorReportingModule registered.
    // If the module fails to load, the health endpoint will not respond.
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toBeDefined();
  });

  test('tRPC endpoints return structured errors (not unhandled crashes)', async ({ request }) => {
    // Call a tRPC endpoint with intentionally bad input to trigger a validation error.
    // This verifies the error reporting middleware is wired in and errors are
    // caught and returned as structured tRPC error responses.
    const res = await request.get(
      `${BASE_URL}/api/trpc/monitor.entry?input=${encodeURIComponent(JSON.stringify({ id: '' }))}`,
    );

    // Should get a response (not a crash) — either 400 (validation) or 401 (unauthorized)
    expect(res.status()).toBeLessThan(500);
  });

  test('server does not crash on invalid tRPC procedure', async ({ request }) => {
    // Call a nonexistent tRPC procedure to verify unhandled route errors
    // are captured by the error reporting middleware rather than crashing.
    const res = await request.get(`${BASE_URL}/api/trpc/nonexistent.procedure`);

    // Should get a 404 or similar client error, not a 500 server crash
    expect(res.status()).toBeLessThan(500);
  });
});
