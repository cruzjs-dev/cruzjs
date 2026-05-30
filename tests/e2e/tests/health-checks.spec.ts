import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Health Checks', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('GET /api/health returns 200 with status alive', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    // The health endpoint returns { status: 'healthy' | 'unhealthy' | 'degraded', ... }
    // or the liveness probe returns { status: 'alive' }
    expect(body).toHaveProperty('status');
    expect(['alive', 'healthy', 'degraded', 'unhealthy']).toContain(body.status);
    expect(body).toHaveProperty('timestamp');
  });

  test('GET /api/health returns proper cache headers', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.ok()).toBeTruthy();

    const cacheControl = res.headers()['cache-control'];
    expect(cacheControl).toBeDefined();
    expect(cacheControl).toContain('no-cache');
  });

  test('GET /api/trpc/health.health returns liveness probe', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/health.health`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    // tRPC wraps the result in { result: { data: ... } }
    const data = body?.result?.data;
    expect(data).toBeDefined();
    expect(data.status).toBe('alive');
    expect(data).toHaveProperty('timestamp');
  });

  test('GET /api/trpc/health.detailed returns all checks', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/health.detailed`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const data = body?.result?.data;
    expect(data).toBeDefined();
    expect(data).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime');
    expect(typeof data.uptime).toBe('number');
    expect(data).toHaveProperty('checks');
    expect(typeof data.checks).toBe('object');
  });

  test('GET /api/trpc/health.readiness returns readiness status', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/health.readiness`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const data = body?.result?.data;
    expect(data).toBeDefined();
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('checks');
  });

  test('health endpoint is accessible without authentication', async ({ request }) => {
    // Explicitly send no auth headers
    const res = await request.get(`${BASE_URL}/api/health`, {
      headers: {},
    });
    expect(res.ok()).toBeTruthy();
  });

  test('health tRPC endpoints are public (no auth required)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/health.health`, {
      headers: {},
    });
    expect(res.ok()).toBeTruthy();
  });
});
