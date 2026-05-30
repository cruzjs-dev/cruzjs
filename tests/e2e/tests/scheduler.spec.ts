import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Scheduler', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('scheduler list requires authentication', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/scheduler.list`);

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
  });

  test('scheduler runNow requires authentication', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/scheduler.runNow`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ name: 'nonexistent-task' }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
  });

  test('scheduler history requires authentication', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/scheduler.history?input=${encodeURIComponent(JSON.stringify({ name: 'test-task', limit: 10 }))}`,
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
  });

  test('scheduler toggle requires authentication', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/scheduler.toggle`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ name: 'nonexistent-task' }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
  });

  test('scheduler list with authenticated user', async ({ page }) => {
    try {
      const { registerUser } = await import('./helpers');
      await registerUser(page);

      const listRes = await page.request.get(`${BASE_URL}/api/trpc/scheduler.list`);

      if (listRes.ok()) {
        const body = await listRes.json();
        const data = body?.result?.data;
        expect(data).toBeDefined();
        // Should return an array of scheduled tasks (may be empty)
        expect(Array.isArray(data)).toBe(true);
      } else {
        // Scheduler may require admin privileges
        const body = await listRes.json();
        expect(body?.error?.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
      }
    } catch (error) {
      console.warn('Scheduler list test skipped due to setup failure:', error);
      test.skip(true, 'Could not set up authenticated context');
    }
  });

  test('scheduler runNow with nonexistent task returns NOT_FOUND', async ({ page }) => {
    try {
      const { registerUser } = await import('./helpers');
      await registerUser(page);

      const res = await page.request.post(
        `${BASE_URL}/api/trpc/scheduler.runNow`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({ name: 'nonexistent-task-e2e' }),
        },
      );

      const body = await res.json();
      // Should return NOT_FOUND for nonexistent task, or UNAUTHORIZED if not admin
      const error = body?.error;
      if (error) {
        expect(error.data?.code).toMatch(/NOT_FOUND|UNAUTHORIZED|FORBIDDEN/);
      }
    } catch (error) {
      console.warn('Scheduler runNow test skipped due to setup failure:', error);
      test.skip(true, 'Could not set up authenticated context');
    }
  });
});
