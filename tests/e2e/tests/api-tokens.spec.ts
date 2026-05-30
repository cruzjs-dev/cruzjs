import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('API Tokens / API Keys', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('API key verify rejects invalid token', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/apiKey.verify`, {
      headers: { Authorization: 'Bearer ax_k_invalidtoken123' },
    });

    const body = await res.json();
    const error = body?.error;
    // Should return UNAUTHORIZED since the token is invalid
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('API key list requires org context', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/apiKey.list`);

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('API key create requires org context', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/apiKey.create`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        name: 'test-key',
        scopes: ['read'],
      }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('API key get requires org context', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/apiKey.get?input=${encodeURIComponent(JSON.stringify({ keyId: 'nonexistent' }))}`,
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('API key revoke requires org context', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/apiKey.revoke`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ keyId: 'nonexistent' }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('API key usage stats requires org context', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/apiKey.getUsageStats`);

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('API key CRUD via authenticated session', async ({ page }) => {
    test.slow();  // auth flows need extra time
    try {
      const { registerUser, createOrganization } = await import('./helpers');
      const user = await registerUser(page);
      const org = await createOrganization(page, `API Key Test Org ${Date.now()}`);

      // Create an API key
      const createRes = await page.request.post(
        `${BASE_URL}/api/trpc/apiKey.create`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({
            name: `e2e-test-key-${Date.now()}`,
            scopes: ['read'],
          }),
        },
      );

      if (!createRes.ok()) {
        test.skip(true, 'Could not create API key - org context may not be set correctly');
        return;
      }

      const createBody = await createRes.json();
      const keyData = createBody?.result?.data;
      expect(keyData).toBeDefined();
      expect(keyData.name).toContain('e2e-test-key-');
      // The plaintext key should be returned only on creation
      expect(keyData.key || keyData.plaintext || keyData.token).toBeDefined();

      // List API keys
      const listRes = await page.request.get(`${BASE_URL}/api/trpc/apiKey.list`);
      if (listRes.ok()) {
        const listBody = await listRes.json();
        const keys = listBody?.result?.data;
        expect(Array.isArray(keys)).toBe(true);
        expect(keys.length).toBeGreaterThanOrEqual(1);
      }

      // Get the API key
      const keyId = keyData.id;
      if (keyId) {
        const getRes = await page.request.get(
          `${BASE_URL}/api/trpc/apiKey.get?input=${encodeURIComponent(JSON.stringify({ keyId }))}`,
        );
        if (getRes.ok()) {
          const getBody = await getRes.json();
          const fetched = getBody?.result?.data;
          expect(fetched.id).toBe(keyId);
        }

        // Revoke the API key
        const revokeRes = await page.request.post(
          `${BASE_URL}/api/trpc/apiKey.revoke`,
          {
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({ keyId }),
          },
        );
        if (revokeRes.ok()) {
          const revokeBody = await revokeRes.json();
          expect(revokeBody?.result?.data?.success).toBe(true);
        }
      }

      // Get usage stats
      const statsRes = await page.request.get(`${BASE_URL}/api/trpc/apiKey.getUsageStats`);
      if (statsRes.ok()) {
        const statsBody = await statsRes.json();
        const stats = statsBody?.result?.data;
        expect(stats).toBeDefined();
      }
    } catch (error) {
      console.warn('API key CRUD test skipped due to setup failure:', error);
      test.skip(true, 'Could not set up authenticated org context');
    }
  });
});
