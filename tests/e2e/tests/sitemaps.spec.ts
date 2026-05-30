import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test.describe('Sitemaps', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${BASE_URL}/api/health`);
      test.skip(!res.ok(), 'Dev server not running');
    } catch {
      test.skip(true, 'Dev server not running');
    }
  });

  test('GET /sitemap.xml returns 200 with XML content-type', async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/sitemap.xml`);
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type']).toContain('application/xml');

    const body = await res.text();
    expect(body).toContain('<?xml version="1.0"');
  });

  test('GET /robots.txt returns 200 with correct sitemap reference', async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/robots.txt`);
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type']).toContain('text/plain');

    const body = await res.text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Sitemap:');
    expect(body).toContain('/sitemap.xml');
  });

  test('Sitemap XML is valid and parseable', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/sitemap.xml`);
    expect(res.ok()).toBeTruthy();

    const body = await res.text();

    // Must start with XML declaration
    expect(body).toMatch(/^<\?xml version="1\.0"/);

    // Must contain either urlset (single sitemap) or sitemapindex (index)
    const isUrlset = body.includes('<urlset');
    const isSitemapIndex = body.includes('<sitemapindex');
    expect(isUrlset || isSitemapIndex).toBeTruthy();

    // Must be well-formed (proper closing tags)
    if (isUrlset) {
      expect(body).toContain('</urlset>');
    }
    if (isSitemapIndex) {
      expect(body).toContain('</sitemapindex>');
    }
  });
});
