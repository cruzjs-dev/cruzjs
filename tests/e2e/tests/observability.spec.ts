import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Observability / Distributed Tracing', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('health endpoint responds successfully (tracing is transparent)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.ok()).toBeTruthy();
  });

  test('tRPC endpoint responds when traceparent header is provided', async ({ request }) => {
    // Send a W3C traceparent header to verify the server handles propagation gracefully
    const res = await request.get(`${BASE_URL}/api/trpc/health.health`, {
      headers: {
        traceparent: '00-aaaa0000aaaa0000aaaa0000aaaa0000-bbbb0000bbbb0000-01',
      },
    });

    // The server should process the request normally even with trace context
    expect(res.status()).toBeLessThan(500);
  });

  test('tRPC endpoint responds when malformed traceparent header is provided', async ({
    request,
  }) => {
    // Ensure the server gracefully handles a malformed traceparent
    const res = await request.get(`${BASE_URL}/api/trpc/health.health`, {
      headers: {
        traceparent: 'not-a-valid-traceparent',
      },
    });

    // Should not cause a server error
    expect(res.status()).toBeLessThan(500);
  });

  test('multiple rapid requests do not cause server errors', async ({ request }) => {
    // Verify that tracing instrumentation does not introduce instability
    const requests = Array.from({ length: 10 }, () =>
      request.get(`${BASE_URL}/api/health`),
    );

    const responses = await Promise.all(requests);

    for (const res of responses) {
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('response does not leak internal trace IDs in body', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.ok()).toBeTruthy();

    const body = await res.text();

    // Trace IDs should not be leaked to the client in response bodies
    // (they may appear in response headers, which is fine)
    expect(body).not.toContain('traceId');
    expect(body).not.toContain('spanId');
  });
});
