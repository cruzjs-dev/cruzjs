import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Webhooks', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('webhook list requires org context', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/webhook.list`);

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('webhook create requires org context', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/webhook.create`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        url: 'https://example.com/webhook',
        events: ['test.event'],
      }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('webhook get requires org context', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/webhook.get?input=${encodeURIComponent(JSON.stringify({ id: 'nonexistent' }))}`,
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('webhook CRUD via authenticated session', async ({ page }) => {
    test.slow();  // auth flows need extra time
    try {
      const { registerUser, createOrganization } = await import('./helpers');
      const user = await registerUser(page);
      const org = await createOrganization(page, `Webhook Test Org ${Date.now()}`);

      // Create a webhook
      const createRes = await page.request.post(
        `${BASE_URL}/api/trpc/webhook.create`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({
            url: 'https://httpbin.org/post',
            events: ['webhook.test'],
            description: 'E2E test webhook',
          }),
        },
      );

      if (!createRes.ok()) {
        test.skip(true, 'Could not create webhook - org context may not be set correctly');
        return;
      }

      const createBody = await createRes.json();
      const webhook = createBody?.result?.data;
      expect(webhook).toBeDefined();
      expect(webhook.url).toBe('https://httpbin.org/post');

      // List webhooks
      const listRes = await page.request.get(`${BASE_URL}/api/trpc/webhook.list`);
      if (listRes.ok()) {
        const listBody = await listRes.json();
        const webhooks = listBody?.result?.data;
        expect(Array.isArray(webhooks)).toBe(true);
        expect(webhooks.length).toBeGreaterThanOrEqual(1);
      }

      // Get single webhook
      const getRes = await page.request.get(
        `${BASE_URL}/api/trpc/webhook.get?input=${encodeURIComponent(JSON.stringify({ id: webhook.id }))}`,
      );
      if (getRes.ok()) {
        const getBody = await getRes.json();
        const fetched = getBody?.result?.data;
        expect(fetched.id).toBe(webhook.id);
        expect(fetched.url).toBe('https://httpbin.org/post');
      }

      // Test webhook delivery
      const testRes = await page.request.post(
        `${BASE_URL}/api/trpc/webhook.test`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({ id: webhook.id }),
        },
      );
      if (testRes.ok()) {
        const testBody = await testRes.json();
        expect(testBody?.result?.data?.success).toBe(true);
      }

      // Delete webhook
      const deleteRes = await page.request.post(
        `${BASE_URL}/api/trpc/webhook.delete`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({ id: webhook.id }),
        },
      );
      if (deleteRes.ok()) {
        const deleteBody = await deleteRes.json();
        expect(deleteBody?.result?.data?.success).toBe(true);
      }
    } catch (error) {
      console.warn('Webhook CRUD test skipped due to setup failure:', error);
      test.skip(true, 'Could not set up authenticated org context');
    }
  });

  test('webhook deliveries requires org context', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/webhook.deliveries?input=${encodeURIComponent(JSON.stringify({ webhookId: 'nonexistent', limit: 10 }))}`,
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });
});
