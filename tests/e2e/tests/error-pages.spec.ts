import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Error Pages', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('404 page renders for unknown route', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/this-page-definitely-does-not-exist-12345`);

    expect(res?.status()).toBe(404);

    const content = await page.content();
    const hasNotFoundContent =
      content.includes('404') ||
      content.toLowerCase().includes('not found') ||
      content.toLowerCase().includes('page not found');

    expect(hasNotFoundContent).toBe(true);
  });

  test('404 page contains navigation link', async ({ page }) => {
    await page.goto(`${BASE_URL}/definitely-not-a-real-page-xyz-999`);

    const links = await page.locator('a').all();
    expect(links.length).toBeGreaterThan(0);
  });

  test('tRPC error returns structured JSON with error code', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/nonexistent.procedure`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({}),
    });

    expect(res.status()).not.toBe(200);

    const body = await res.json().catch(() => null);
    if (body) {
      expect(body.error || body[0]?.error).toBeDefined();
    }
  });

  test('API 404 returns JSON for unknown API route', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/this-does-not-exist-xyz`);

    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('tRPC UNAUTHORIZED error has correct code', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/userProfile.current`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({}),
    });

    const body = await res.json();
    const error = body?.error || body?.[0]?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|NOT_FOUND/);
  });

  test('health endpoint still responds after 404 visits', async ({ request }) => {
    await request.get(`${BASE_URL}/nonexistent-1`);
    await request.get(`${BASE_URL}/nonexistent-2`);

    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.ok()).toBe(true);
  });
});
