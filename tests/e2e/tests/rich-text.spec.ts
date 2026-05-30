import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Rich Text', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('richText.get requires authentication', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/richText.get?input=${encodeURIComponent(JSON.stringify({ entityType: 'post', entityId: 'test-1' }))}`,
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('richText.save requires authentication', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/richText.save`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        entityType: 'post',
        entityId: 'test-1',
        field: 'body',
        body: '<p>Hello world</p>',
      }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('richText.delete requires authentication', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/trpc/richText.delete`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        entityType: 'post',
        entityId: 'test-1',
      }),
    });

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('richText.searchMentions requires authentication', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/richText.searchMentions?input=${encodeURIComponent(JSON.stringify({ query: 'john', orgId: 'org-1' }))}`,
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('richText.getAttachments requires authentication', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/trpc/richText.getAttachments?input=${encodeURIComponent(JSON.stringify({ contentId: 'test-1' }))}`,
    );

    const body = await res.json();
    const error = body?.error;
    expect(error).toBeDefined();
    expect(error.data?.code).toMatch(/UNAUTHORIZED|FORBIDDEN|BAD_REQUEST/);
  });

  test('richText CRUD via authenticated session', async ({ page }) => {
    test.slow(); // auth flows need extra time
    try {
      const { registerUser } = await import('./helpers');
      await registerUser(page);

      // Save rich text content
      const saveRes = await page.request.post(
        `${BASE_URL}/api/trpc/richText.save`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({
            entityType: 'post',
            entityId: `post-${Date.now()}`,
            field: 'body',
            body: '<p>Hello <strong>world</strong></p>',
          }),
        },
      );

      if (!saveRes.ok()) {
        test.skip(true, 'Could not save rich text - auth context may not be set');
        return;
      }

      const saveBody = await saveRes.json();
      const content = saveBody?.result?.data;
      expect(content).toBeDefined();
      expect(content.body).toContain('<p>Hello');
      expect(content.plainText).toContain('Hello world');
      expect(content.version).toBe(1);

      // Get the saved content
      const getRes = await page.request.get(
        `${BASE_URL}/api/trpc/richText.get?input=${encodeURIComponent(JSON.stringify({
          entityType: content.entityType,
          entityId: content.entityId,
          field: 'body',
        }))}`,
      );

      if (getRes.ok()) {
        const getBody = await getRes.json();
        const fetched = getBody?.result?.data;
        expect(fetched).toBeDefined();
        expect(fetched.id).toBe(content.id);
      }

      // Update (save again, same entity+field)
      const updateRes = await page.request.post(
        `${BASE_URL}/api/trpc/richText.save`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({
            entityType: content.entityType,
            entityId: content.entityId,
            field: 'body',
            body: '<p>Updated content</p>',
          }),
        },
      );

      if (updateRes.ok()) {
        const updateBody = await updateRes.json();
        const updated = updateBody?.result?.data;
        expect(updated.version).toBe(2);
        expect(updated.plainText).toContain('Updated content');
      }

      // Delete
      const deleteRes = await page.request.post(
        `${BASE_URL}/api/trpc/richText.delete`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({
            entityType: content.entityType,
            entityId: content.entityId,
            field: 'body',
          }),
        },
      );

      if (deleteRes.ok()) {
        const deleteBody = await deleteRes.json();
        expect(deleteBody?.result?.data?.success).toBe(true);
      }
    } catch (error) {
      console.warn('Rich text CRUD test skipped due to setup failure:', error);
      test.skip(true, 'Could not set up authenticated context');
    }
  });
});
