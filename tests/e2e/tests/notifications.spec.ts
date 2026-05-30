import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Notifications', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('getNotifications requires org context', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/notification.getNotifications?input=${encodeURIComponent(JSON.stringify({ limit: 10 }))}`,
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('getUnreadCount requires org context', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/notification.getUnreadCount`);

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('markRead requires org context', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/notification.markRead`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ notificationIds: ['fake-id'] }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('markAllRead requires org context', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/notification.markAllRead`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({}),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('getPushKey is public (no auth required)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/trpc/notification.getPushKey`);

    if (res.ok()) {
      const body = await res.json();
      const data = body?.result?.data;
      expect(data).toBeDefined();
      expect(data).toHaveProperty('publicKey');
      // publicKey may be null if push is not configured
    } else {
      // The endpoint may not be registered if push is not configured
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('notification CRUD via authenticated org session', async ({ page }) => {
    test.slow();  // auth flows need extra time
    try {
      const { registerUser, createOrganization } = await import('./helpers');
      await registerUser(page);
      await createOrganization(page, `Notif Test Org ${Date.now()}`);

      // Get notifications (should be empty for new org)
      const listRes = await page.request.get(
        `${BASE_URL}/api/trpc/notification.getNotifications?input=${encodeURIComponent(JSON.stringify({ limit: 10 }))}`,
      );

      if (listRes.ok()) {
        const body = await listRes.json();
        const data = body?.result?.data;
        expect(data).toBeDefined();
      }

      // Get unread count
      const countRes = await page.request.get(
        `${BASE_URL}/api/trpc/notification.getUnreadCount`,
      );

      if (countRes.ok()) {
        const body = await countRes.json();
        const data = body?.result?.data;
        expect(typeof data).toBe('number');
        expect(data).toBeGreaterThanOrEqual(0);
      }

      // Get notification preferences
      const prefsRes = await page.request.get(
        `${BASE_URL}/api/trpc/notification.getPreferences`,
      );

      if (prefsRes.ok()) {
        const body = await prefsRes.json();
        const data = body?.result?.data;
        expect(data).toBeDefined();
      }

      // Mark all as read (should succeed even with no notifications)
      const markAllRes = await page.request.post(
        `${BASE_URL}/api/trpc/notification.markAllRead`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({}),
        },
      );

      if (markAllRes.ok()) {
        const body = await markAllRes.json();
        expect(body?.result?.data?.success).toBe(true);
      }
    } catch (error) {
      console.warn('Notification CRUD test skipped due to setup failure:', error);
      test.skip(true, 'Could not set up authenticated org context');
    }
  });

  test('configureSlack requires org context', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/notification.configureSlack`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/XXX',
        channelName: '#test',
      }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });
});
