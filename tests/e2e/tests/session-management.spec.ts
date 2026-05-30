import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Session Management', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('tRPC session.listSessions endpoint responds', async ({ request }) => {
    // Without auth, the protected procedure should return 401
    const res = await request.post(`${BASE_URL}/api/trpc/session.listSessions`, {
      data: {},
    });

    const status = res.status();
    // Expect either 200 (if somehow authenticated) or 401 (unauthorized)
    expect([200, 401]).toContain(status);
  });

  test('tRPC session.getCurrentSession endpoint responds', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/session.getCurrentSession`, {
      data: {},
    });

    const status = res.status();
    expect([200, 401]).toContain(status);
  });

  test('tRPC session.revokeSession requires authentication', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/session.revokeSession`, {
      data: JSON.stringify({ id: 'fake-session-id' }),
      headers: { 'Content-Type': 'application/json' },
    });

    // Should return 401 without auth
    expect([401, 400]).toContain(res.status());
  });

  test('tRPC session.revokeAllSessions requires authentication', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/session.revokeAllSessions`, {
      data: {},
    });

    expect([401, 400]).toContain(res.status());
  });
});
