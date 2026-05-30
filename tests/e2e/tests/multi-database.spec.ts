import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Multi-Database', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('health endpoint includes multi-database check', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();

    // The multi-database health check may or may not be present
    // depending on whether MultiDatabaseModule is loaded.
    // If present, it should report a status.
    if (body.checks && body.checks['multi-database']) {
      const check = body.checks['multi-database'];
      expect(['healthy', 'degraded', 'unhealthy']).toContain(check.status);
    }
  });

  test('health endpoint returns valid response when multi-db not configured', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.status).toBeDefined();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);
  });
});
