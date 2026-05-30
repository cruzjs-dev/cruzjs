import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Magic Link / Passwordless Auth', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('request magic link returns success for any email (no enumeration)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/magicLink.request`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        email: 'nonexistent@example.com',
      }),
    });

    // Should always appear successful (prevents email enumeration)
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body?.result?.data?.success).toBe(true);
  });

  test('request magic link validates email format', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/magicLink.request`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        email: 'not-an-email',
      }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    // Zod validation error
    expect(error.data?.code).toMatch(/BAD_REQUEST|PARSE_ERROR/);
  });

  test('verify magic link rejects invalid token', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/magicLink.verify`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        token: 'this-is-not-a-valid-token',
      }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toBe('BAD_REQUEST');
    expect(error.message).toContain('Invalid');
  });

  test('verify magic link rejects empty token', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/magicLink.verify`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        token: '',
      }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
  });

  test('request magic link is a public endpoint (no auth required)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/magicLink.request`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        email: 'test@example.com',
      }),
    });

    // Public endpoint should not return UNAUTHORIZED
    expect(res.ok()).toBeTruthy();
  });

  test('verify magic link is a public endpoint (no auth required)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/magicLink.verify`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        token: 'some-token',
      }),
    });

    // Should not return UNAUTHORIZED even though it may return BAD_REQUEST
    const body = await res.json();
    const error = body?.error;
    if (error) {
      expect(error.data?.code).not.toBe('UNAUTHORIZED');
    }
  });
});
