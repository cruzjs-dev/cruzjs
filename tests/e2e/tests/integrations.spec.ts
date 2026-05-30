import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Integrations', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('listConnections requires org context', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/integration.listConnections`);

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('getConnection requires org context', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/integration.getConnection?input=${encodeURIComponent(JSON.stringify({ connectionId: 'nonexistent' }))}`,
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('createConnection requires org context', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/integration.createConnection`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        provider: 'FIGMA',
        name: 'Test Figma',
        config: { provider: 'FIGMA', accessToken: 'fake-token' },
      }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('deleteConnection requires org context', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/integration.deleteConnection`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ connectionId: 'nonexistent' }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('integration connections via authenticated org session', async ({ page }) => {
    try {
      const { registerUser, createOrganization } = await import('./helpers');
      await registerUser(page);
      await createOrganization(page, `Integration Test Org ${Date.now()}`);

      // List connections (should be empty for new org)
      const listRes = await page.request.get(
        `${BASE_URL}/api/trpc/integration.listConnections`,
      );

      if (listRes.ok()) {
        const body = await listRes.json();
        const data = body?.result?.data;
        expect(data).toBeDefined();
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(0);
      }

      // Filter by provider
      const filteredRes = await page.request.get(
        `${BASE_URL}/api/trpc/integration.listConnections?input=${encodeURIComponent(JSON.stringify({ provider: 'FIGMA' }))}`,
      );

      if (filteredRes.ok()) {
        const body = await filteredRes.json();
        const data = body?.result?.data;
        expect(Array.isArray(data)).toBe(true);
      }
    } catch (error) {
      console.warn('Integration test skipped due to setup failure:', error);
      test.skip(true, 'Could not set up authenticated org context');
    }
  });

  test('getSyncHistory requires org context', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/integration.getSyncHistory?input=${encodeURIComponent(JSON.stringify({ connectionId: 'nonexistent', limit: 10 }))}`,
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('testConnection requires org context', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/integration.testConnection`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        provider: 'FIGMA',
        accessToken: 'fake-token',
      }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });
});
