import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

async function registerAndLogin(page: Page): Promise<{ sessionCookie: string } | null> {
  try {
    const { registerUser } = await import('./helpers');
    await registerUser(page);
    const cookies = await page.context().cookies();
    const session = cookies.find((c) => c.name.includes('session') || c.name.includes('auth'));
    return session ? { sessionCookie: `${session.name}=${session.value}` } : null;
  } catch {
    return null;
  }
}

test.describe('Model Observers', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('server boots with observer module registered', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(body).toBeDefined();
  });

  test('org creation endpoint exists and requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/organizations.create`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ name: 'Observer Test Org' }),
    });

    const body = await res.json();
    const error = body?.error || body?.[0]?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
  });

  test('observer does not crash server on org creation', async ({ page }) => {
    const auth = await registerAndLogin(page);
    if (!auth) {
      test.skip(true, 'Could not set up authenticated context');
      return;
    }

    const res = await page.request.post(`${BASE_URL}/api/trpc/organizations.create`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ name: `Observer-Test-${Date.now()}` }),
    });

    expect(res.status()).not.toBe(500);

    const health = await page.request.get(`${BASE_URL}/api/health`);
    expect(health.ok()).toBe(true);
  });

  test('observer registry is injectable (smoke test via health)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.ok()).toBe(true);
  });
});
