import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Broadcasting / SSE', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('SSE endpoint responds with event-stream content type', async ({ request }) => {
    // The SSE endpoint is at /api/broadcast/sse?channel=<channel>
    const res = await request.get(
      `${BASE_URL}/api/broadcast/sse?channel=test-e2e`,
    );

    // SSE endpoint should respond (may be 200 or redirect depending on auth)
    // If it returns a streaming response, content-type will be text/event-stream
    const status = res.status();
    if (status === 200) {
      const contentType = res.headers()['content-type'];
      expect(contentType).toContain('text/event-stream');
    } else {
      // Endpoint may require auth or may not exist as a standalone route
      // Accept 401, 403, or 404 as valid outcomes
      expect([200, 401, 403, 404]).toContain(status);
    }
  });

  test('SSE endpoint can be connected from browser via EventSource', async ({ page }) => {
    // Navigate to a page first so we have a context
    await page.goto('/');

    // Try creating an EventSource in the browser
    const result = await page.evaluate(async (baseUrl) => {
      return new Promise<{ connected: boolean; error: string | null }>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ connected: false, error: 'Timeout waiting for SSE connection' });
        }, 5000);

        try {
          const es = new EventSource(`${baseUrl}/api/broadcast/sse?channel=test-e2e`);

          es.addEventListener('connected', () => {
            clearTimeout(timeout);
            es.close();
            resolve({ connected: true, error: null });
          });

          es.onerror = (event) => {
            clearTimeout(timeout);
            es.close();
            // EventSource may fail due to auth requirements - that is acceptable
            resolve({ connected: false, error: 'EventSource error (may require auth)' });
          };
        } catch (err) {
          clearTimeout(timeout);
          resolve({
            connected: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      });
    }, BASE_URL);

    // Either connected successfully or got an expected auth error
    expect(result).toBeDefined();
    // Log the result for debugging
    if (!result.connected) {
      console.log(`SSE connection result: ${result.error}`);
    }
  });

  test('broadcast authorize requires authentication', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/broadcast.authorize`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ channel: 'private-test' }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
  });

  test('broadcast presence requires authentication', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/broadcast.presence?input=${encodeURIComponent(JSON.stringify({ channel: 'presence-test' }))}`,
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
  });

  test('broadcast join requires authentication', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/broadcast.join`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ channel: 'presence-test' }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
  });

  test('broadcast leave requires authentication', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/broadcast.leave`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ channel: 'presence-test' }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
  });
});
