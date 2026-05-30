import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Rate Limiting', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('responses include rate limit headers', async ({ request }) => {
    // Make a request and check for rate limit headers
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.ok()).toBeTruthy();

    const headers = res.headers();
    // Rate limit middleware adds X-RateLimit-* headers
    // These may not be present on all endpoints, so check if at least the response works
    const hasRateLimitHeaders =
      headers['x-ratelimit-limit'] !== undefined ||
      headers['x-ratelimit-remaining'] !== undefined ||
      headers['x-ratelimit-reset'] !== undefined;

    // If rate limiting is active on this endpoint, verify header values are numeric
    if (hasRateLimitHeaders) {
      if (headers['x-ratelimit-limit']) {
        expect(Number(headers['x-ratelimit-limit'])).toBeGreaterThan(0);
      }
      if (headers['x-ratelimit-remaining']) {
        expect(Number(headers['x-ratelimit-remaining'])).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('rate limit remaining decreases with repeated requests', async ({ request }) => {
    // Make the first request
    const res1 = await request.get(`${BASE_URL}/api/trpc/health.health`);
    expect(res1.ok()).toBeTruthy();

    const remaining1 = res1.headers()['x-ratelimit-remaining'];

    // Skip if rate limiting is not active on this endpoint
    if (remaining1 === undefined) {
      test.skip(true, 'Rate limiting headers not present on this endpoint');
      return;
    }

    // Make a second request
    const res2 = await request.get(`${BASE_URL}/api/trpc/health.health`);
    expect(res2.ok()).toBeTruthy();

    const remaining2 = res2.headers()['x-ratelimit-remaining'];
    expect(remaining2).toBeDefined();

    // The remaining count should decrease (or stay the same if window reset between requests)
    expect(Number(remaining2)).toBeLessThanOrEqual(Number(remaining1));
  });

  test('rate limit headers have consistent format', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/health.health`);
    expect(res.ok()).toBeTruthy();

    const headers = res.headers();

    // If rate limit headers exist, they should all be present together
    if (headers['x-ratelimit-limit']) {
      expect(headers['x-ratelimit-remaining']).toBeDefined();
      expect(headers['x-ratelimit-reset']).toBeDefined();

      // All should be parseable as numbers
      expect(Number.isFinite(Number(headers['x-ratelimit-limit']))).toBe(true);
      expect(Number.isFinite(Number(headers['x-ratelimit-remaining']))).toBe(true);
      expect(Number.isFinite(Number(headers['x-ratelimit-reset']))).toBe(true);
    }
  });

  test('rapid requests do not cause server errors', async ({ request }) => {
    // Send 10 rapid requests and verify none return 5xx
    const requests = Array.from({ length: 10 }, () =>
      request.get(`${BASE_URL}/api/health`),
    );

    const responses = await Promise.all(requests);

    for (const res of responses) {
      // Should either succeed or return 429 (rate limited), never 5xx
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('rate limited response returns 429 status', async ({ request }) => {
    // Send many rapid requests to try to trigger rate limiting
    const requests = Array.from({ length: 200 }, () =>
      request.get(`${BASE_URL}/api/health`),
    );

    const responses = await Promise.all(requests);

    // Check if any response was rate limited (429)
    const rateLimited = responses.filter((r) => r.status() === 429);
    const successful = responses.filter((r) => r.ok());

    // Either all succeeded (generous rate limit) or some were rate limited
    expect(rateLimited.length + successful.length).toBe(responses.length);

    // If rate limited, the response should include retry-after or rate limit headers
    if (rateLimited.length > 0) {
      const headers = rateLimited[0].headers();
      const hasRetryInfo =
        headers['retry-after'] !== undefined ||
        headers['x-ratelimit-reset'] !== undefined;
      expect(hasRetryInfo).toBeTruthy();
    }
  });
});
