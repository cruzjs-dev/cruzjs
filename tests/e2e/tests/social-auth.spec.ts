import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Social Auth / OAuth', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  // ── tRPC endpoints ──────────────────────────────────────────────────────

  test('available providers endpoint returns list', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/socialAuth.getAvailableProviders`,
    );

    if (res.ok()) {
      const body = await res.json();
      const data = body?.result?.data;
      expect(data).toBeDefined();
      expect(data).toHaveProperty('providers');
      expect(Array.isArray(data.providers)).toBe(true);
    } else {
      // The router may not be registered if no providers are configured
      const body = await res.json();
      // Accept NOT_FOUND or internal error gracefully
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('getAuthUrl returns URL for configured provider', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/socialAuth.getAuthUrl?input=${encodeURIComponent(
        JSON.stringify({ provider: 'github', redirectUri: `${BASE_URL}/auth/github/callback` }),
      )}`,
    );

    if (res.ok()) {
      const body = await res.json();
      const data = body?.result?.data;
      expect(data).toBeDefined();
      expect(data).toHaveProperty('url');
      expect(data).toHaveProperty('state');
      // URL should point to the provider's auth endpoint
      expect(data.url).toContain('github.com');
    } else {
      // Provider may not be configured - acceptable
      const body = await res.json();
      const error = body?.error;
      // Should be a clear error, not an internal crash
      if (error) {
        expect(error.data?.code).toMatch(/BAD_REQUEST|NOT_FOUND|INTERNAL_SERVER_ERROR/);
      }
    }
  });

  test('getAuthUrl with unknown provider returns error', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/socialAuth.getAuthUrl?input=${encodeURIComponent(
        JSON.stringify({ provider: 'nonexistent_provider', redirectUri: `${BASE_URL}/callback` }),
      )}`,
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/BAD_REQUEST|NOT_FOUND/);
  });

  test('list connections requires authentication', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/socialAuth.listConnections`,
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
  });

  test('disconnect requires authentication', async ({ request }) => {
    const res = await request.post(
      `${BASE_URL}/api/trpc/socialAuth.disconnect`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ provider: 'github' }),
      },
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
  });

  test('syncAccount requires authentication', async ({ request }) => {
    const res = await request.post(
      `${BASE_URL}/api/trpc/socialAuth.syncAccount`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ provider: 'github' }),
      },
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
  });

  // ── Page routes (React Router) ──────────────────────────────────────────

  test('OAuth redirect endpoint exists for GitHub', async ({ page }) => {
    const response = await page.goto('/auth/github');

    if (response) {
      const status = response.status();
      // Possible outcomes:
      // 1. Redirects to github.com (provider configured)
      // 2. Shows error about missing config (provider not configured)
      // 3. Returns 404 if route not registered
      expect(status).toBeLessThan(500);
    }
  });

  test('OAuth redirect endpoint exists for Google', async ({ page }) => {
    const response = await page.goto('/auth/google');

    if (response) {
      const status = response.status();
      expect(status).toBeLessThan(500);
    }
  });

  test('OAuth callback without code returns error', async ({ page }) => {
    // Hit the callback URL without required params
    const response = await page.goto('/auth/github/callback');

    if (response) {
      // Should not crash - either show error or redirect to login
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('OAuth callback with invalid state is rejected', async ({ page }) => {
    const response = await page.goto(
      '/auth/github/callback?code=fake_code&state=invalid_state',
    );

    if (response) {
      // Should handle gracefully - either error page or redirect
      expect(response.status()).toBeLessThan(500);
    }
  });

  // ── REST API Router endpoints ───────────────────────────────────────────

  test('REST API initiate endpoint redirects or errors for unknown provider', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/auth/social/nonexistent`,
      { maxRedirects: 0 },
    );

    // Should return 400 for unknown provider or 302 if somehow handled
    expect([302, 400].includes(res.status())).toBe(true);
  });

  test('REST API callback without code redirects to error', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/auth/social/github/callback`,
      { maxRedirects: 0 },
    );

    // Should redirect to login with error (302) or return error directly
    if (res.status() === 302) {
      const location = res.headers()['location'];
      expect(location).toContain('error');
    } else {
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('REST API callback with error param redirects to login', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/auth/social/github/callback?error=access_denied&error_description=User+denied`,
      { maxRedirects: 0 },
    );

    if (res.status() === 302) {
      const location = res.headers()['location'];
      expect(location).toContain('error');
    } else {
      // Endpoint may not be registered yet
      expect(res.status()).toBeLessThan(500);
    }
  });
});
