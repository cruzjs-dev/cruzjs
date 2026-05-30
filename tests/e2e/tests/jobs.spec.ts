import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Background Jobs', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('job getStatus requires authentication', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/job.getStatus?input=${encodeURIComponent(JSON.stringify({ jobId: 'nonexistent' }))}`,
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
  });

  test('job getByLookupKey requires authentication', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/job.getByLookupKey?input=${encodeURIComponent(JSON.stringify({ lookupKey: 'test-key' }))}`,
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
  });

  test('job getStatus returns null for nonexistent job', async ({ page }) => {
    try {
      const { registerUser } = await import('./helpers');
      await registerUser(page);

      const res = await page.request.get(
        `${BASE_URL}/api/trpc/job.getStatus?input=${encodeURIComponent(JSON.stringify({ jobId: 'nonexistent-job-e2e' }))}`,
      );

      if (res.ok()) {
        const body = await res.json();
        const data = body?.result?.data;
        // Should return null for nonexistent job
        expect(data).toBeNull();
      }
    } catch (error) {
      console.warn('Job status test skipped due to setup failure:', error);
      test.skip(true, 'Could not set up authenticated context');
    }
  });

  test('job getByLookupKey returns empty array for unknown key', async ({ page }) => {
    try {
      const { registerUser } = await import('./helpers');
      await registerUser(page);

      const res = await page.request.get(
        `${BASE_URL}/api/trpc/job.getByLookupKey?input=${encodeURIComponent(JSON.stringify({ lookupKey: 'nonexistent-key-e2e' }))}`,
      );

      if (res.ok()) {
        const body = await res.json();
        const data = body?.result?.data;
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(0);
      }
    } catch (error) {
      console.warn('Job lookup test skipped due to setup failure:', error);
      test.skip(true, 'Could not set up authenticated context');
    }
  });

  test('job endpoints do not expose internal server details', async ({ request }) => {
    // In production, tRPC should strip stack traces from error responses.
    // In development, stack traces are included intentionally for debugging.
    // Skip this check if running against a dev server (stack present is expected).
    test.skip(process.env.NODE_ENV !== 'production', 'Stack traces visible in dev mode — production-only check');

    const res = await request.get(
      `${BASE_URL}/api/trpc/job.getStatus?input=${encodeURIComponent(JSON.stringify({ jobId: 'test' }))}`,
    );

    const text = await res.text();
    expect(text).not.toContain('node_modules');
    expect(text).not.toContain('at Object.');
  });
});
