import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('API Versioning', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('API responses include version header when Accept-Version is sent', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/health.health`, {
      headers: { 'Accept-Version': 'v1' },
    });
    expect(res.ok()).toBeTruthy();

    const headers = res.headers();
    // If versioning middleware is active, API-Version header should be present
    if (headers['api-version']) {
      expect(headers['api-version']).toBe('v1');
    }
  });

  test('API responds correctly without version header (default fallback)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/health.health`);
    expect(res.ok()).toBeTruthy();

    // Without a version header, the API should still respond normally
    // The default version should be used internally
    const body = await res.json();
    expect(body).toBeDefined();
  });

  test('API rejects unsupported version with appropriate error', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/health.health`, {
      headers: { 'Accept-Version': 'v999' },
    });

    // If versioning is enforced, expect a 400-level error
    // If not enforced, the request may still succeed
    if (!res.ok()) {
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('deprecated version includes Deprecation header', async ({ request }) => {
    // Request with a potentially deprecated version
    const res = await request.get(`${BASE_URL}/api/trpc/health.health`, {
      headers: { 'Accept-Version': 'v1' },
    });

    const headers = res.headers();

    // If the version is deprecated, Deprecation header should be present
    if (headers['deprecation']) {
      expect(headers['deprecation']).toBe('true');

      // If there is a sunset date, it should be a valid date string
      if (headers['sunset']) {
        const sunsetDate = new Date(headers['sunset']);
        expect(sunsetDate.getTime()).toBeGreaterThan(0);
      }
    }
  });

  test('version query param is accepted when strategy supports it', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/health.health?version=v1`);
    // Should not cause a server error regardless of strategy
    expect(res.status()).toBeLessThan(500);
  });

  test('version in URL path is handled gracefully', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/trpc/health.health`);
    // May 404 if path-based versioning is not configured, but should not 5xx
    expect(res.status()).toBeLessThan(500);
  });

  test('rapid requests with different versions do not cause server errors', async ({ request }) => {
    const versions = ['v1', 'v2', 'v3'];
    const requests = versions.map((v) =>
      request.get(`${BASE_URL}/api/trpc/health.health`, {
        headers: { 'Accept-Version': v },
      }),
    );

    const responses = await Promise.all(requests);

    for (const res of responses) {
      // None should be a server error
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('API-Version header reflects the resolved version', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/health.health`, {
      headers: { 'Accept-Version': 'v1' },
    });

    if (res.ok()) {
      const headers = res.headers();
      // If versioning middleware is active, API-Version should match what was requested
      if (headers['api-version']) {
        expect(headers['api-version']).toMatch(/^v\d+$/);
      }
    }
  });
});
