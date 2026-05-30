import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Maintenance Mode', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('maintenance status returns not active by default', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/maintenance.status`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const data = body?.result?.data;
    expect(data).toBeDefined();
    // Default state: maintenance mode is not active
    // The status shape may vary, but it should indicate inactive
    expect(data.active).toBeFalsy();
  });

  test('maintenance status endpoint is public (no auth required)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/maintenance.status`, {
      headers: {},
    });
    expect(res.ok()).toBeTruthy();
  });

  test('maintenance enable requires authentication', async ({ request }) => {
    // Attempt to enable maintenance without auth
    const res = await request.post(`${BASE_URL}/api/trpc/maintenance.enable`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        message: 'Test maintenance',
      }),
    });

    // Should fail with 401 UNAUTHORIZED
    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
  });

  test('maintenance disable requires authentication', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/maintenance.disable`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({}),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
  });

  test('maintenance status returns expected shape', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/maintenance.status`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const data = body?.result?.data;
    expect(data).toBeDefined();
    // Verify the response has a known shape
    expect(typeof data.active).toBe('boolean');
  });
});
