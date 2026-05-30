/**
 * Sitemap Tests
 *
 * Verifies XML generation, service behavior, handler routing,
 * and robots.txt output.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SitemapBuilder } from '../sitemap.builder';
import type { SitemapEntry, DynamicSitemapProvider } from '../sitemap.types';
import { ChangeFrequency } from '../sitemap.types';

// Mock server-only to be a no-op in tests
vi.mock('server-only', () => ({}));

// Mock the DI token resolution
vi.mock('@cruzjs/core/di/tokens/token-registry', () => ({
  getToken: vi.fn(() => Symbol.for('ConfigService')),
  setToken: vi.fn(),
  hasToken: vi.fn(() => true),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockConfigService(appUrl = 'https://example.com') {
  return {
    get: vi.fn((key: string, defaultValue?: unknown) => {
      if (key === 'APP_URL') return appUrl;
      return defaultValue;
    }),
    getOrThrow: vi.fn((key: string) => {
      if (key === 'APP_URL') return appUrl;
      throw new Error(`Key ${key} not found`);
    }),
    getEnv: vi.fn(),
    getRaw: vi.fn(),
    getRawByPrefix: vi.fn(),
    getAllRaw: vi.fn(),
  };
}

async function createService(appUrl = 'https://example.com') {
  const { SitemapService } = await import('../sitemap.service');
  const configService = createMockConfigService(appUrl);
  return new (SitemapService as any)(configService) as InstanceType<
    typeof SitemapService
  >;
}

function createDynamicProvider(
  type: string,
  entries: SitemapEntry[],
): DynamicSitemapProvider {
  return {
    type,
    generate: vi.fn(async () => entries),
  };
}

// ---------------------------------------------------------------------------
// Tests: SitemapBuilder
// ---------------------------------------------------------------------------

describe('SitemapBuilder', () => {
  describe('buildSitemap()', () => {
    it('should generate valid XML with urlset root element', () => {
      const entries: SitemapEntry[] = [
        { url: 'https://example.com/' },
      ];

      const xml = SitemapBuilder.buildSitemap(entries);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('</urlset>');
    });

    it('should include all entry fields (url, lastmod, changefreq, priority)', () => {
      const entries: SitemapEntry[] = [
        {
          url: 'https://example.com/about',
          lastmod: '2026-01-15',
          changefreq: ChangeFrequency.MONTHLY,
          priority: 0.8,
        },
      ];

      const xml = SitemapBuilder.buildSitemap(entries);

      expect(xml).toContain('<loc>https://example.com/about</loc>');
      expect(xml).toContain('<lastmod>2026-01-15</lastmod>');
      expect(xml).toContain('<changefreq>monthly</changefreq>');
      expect(xml).toContain('<priority>0.8</priority>');
    });

    it('should handle Date objects for lastmod', () => {
      const entries: SitemapEntry[] = [
        {
          url: 'https://example.com/',
          lastmod: new Date('2026-03-15T12:00:00Z'),
        },
      ];

      const xml = SitemapBuilder.buildSitemap(entries);

      expect(xml).toContain('<lastmod>2026-03-15</lastmod>');
    });

    it('should include image extensions', () => {
      const entries: SitemapEntry[] = [
        {
          url: 'https://example.com/gallery',
          images: [
            {
              url: 'https://example.com/photo1.jpg',
              caption: 'A nice photo',
              title: 'Photo One',
              license: 'https://creativecommons.org/licenses/by/4.0/',
            },
          ],
        },
      ];

      const xml = SitemapBuilder.buildSitemap(entries);

      expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
      expect(xml).toContain('<image:image>');
      expect(xml).toContain('<image:loc>https://example.com/photo1.jpg</image:loc>');
      expect(xml).toContain('<image:caption>A nice photo</image:caption>');
      expect(xml).toContain('<image:title>Photo One</image:title>');
      expect(xml).toContain('<image:license>https://creativecommons.org/licenses/by/4.0/</image:license>');
      expect(xml).toContain('</image:image>');
    });

    it('should include alternate language links', () => {
      const entries: SitemapEntry[] = [
        {
          url: 'https://example.com/',
          alternates: [
            { hreflang: 'en', href: 'https://example.com/en/' },
            { hreflang: 'es', href: 'https://example.com/es/' },
          ],
        },
      ];

      const xml = SitemapBuilder.buildSitemap(entries);

      expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
      expect(xml).toContain('hreflang="en"');
      expect(xml).toContain('href="https://example.com/en/"');
      expect(xml).toContain('hreflang="es"');
      expect(xml).toContain('href="https://example.com/es/"');
    });

    it('should handle empty entries array', () => {
      const xml = SitemapBuilder.buildSitemap([]);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset');
      expect(xml).toContain('</urlset>');
      expect(xml).not.toContain('<url>');
    });

    it('should generate multiple url entries', () => {
      const entries: SitemapEntry[] = [
        { url: 'https://example.com/' },
        { url: 'https://example.com/about' },
        { url: 'https://example.com/blog' },
      ];

      const xml = SitemapBuilder.buildSitemap(entries);

      const urlCount = (xml.match(/<url>/g) || []).length;
      expect(urlCount).toBe(3);
    });
  });

  describe('buildSitemapIndex()', () => {
    it('should generate valid sitemap index XML', () => {
      const sitemaps = [
        { url: 'https://example.com/sitemap-static.xml' },
        { url: 'https://example.com/sitemap-blog.xml', lastmod: new Date('2026-03-15') },
      ];

      const xml = SitemapBuilder.buildSitemapIndex(sitemaps);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('<loc>https://example.com/sitemap-static.xml</loc>');
      expect(xml).toContain('<loc>https://example.com/sitemap-blog.xml</loc>');
      expect(xml).toContain('<lastmod>2026-03-15</lastmod>');
      expect(xml).toContain('</sitemapindex>');
    });

    it('should omit lastmod when not provided', () => {
      const sitemaps = [{ url: 'https://example.com/sitemap.xml' }];

      const xml = SitemapBuilder.buildSitemapIndex(sitemaps);

      expect(xml).not.toContain('<lastmod>');
    });
  });

  describe('buildRobotsTxt()', () => {
    it('should include sitemap URL', () => {
      const txt = SitemapBuilder.buildRobotsTxt({
        sitemapUrl: 'https://example.com/sitemap.xml',
      });

      expect(txt).toContain('Sitemap: https://example.com/sitemap.xml');
    });

    it('should include User-agent wildcard', () => {
      const txt = SitemapBuilder.buildRobotsTxt({
        sitemapUrl: 'https://example.com/sitemap.xml',
      });

      expect(txt).toContain('User-agent: *');
    });

    it('should include disallowed paths', () => {
      const txt = SitemapBuilder.buildRobotsTxt({
        sitemapUrl: 'https://example.com/sitemap.xml',
        disallowed: ['/admin/', '/private/'],
      });

      expect(txt).toContain('Disallow: /admin/');
      expect(txt).toContain('Disallow: /private/');
    });

    it('should include allowed paths', () => {
      const txt = SitemapBuilder.buildRobotsTxt({
        sitemapUrl: 'https://example.com/sitemap.xml',
        allowed: ['/public/'],
      });

      expect(txt).toContain('Allow: /public/');
    });

    it('should include crawl delay', () => {
      const txt = SitemapBuilder.buildRobotsTxt({
        sitemapUrl: 'https://example.com/sitemap.xml',
        crawlDelay: 10,
      });

      expect(txt).toContain('Crawl-delay: 10');
    });
  });

  describe('escapeXml()', () => {
    it('should escape & character', () => {
      expect(SitemapBuilder.escapeXml('a&b')).toBe('a&amp;b');
    });

    it('should escape < character', () => {
      expect(SitemapBuilder.escapeXml('a<b')).toBe('a&lt;b');
    });

    it('should escape > character', () => {
      expect(SitemapBuilder.escapeXml('a>b')).toBe('a&gt;b');
    });

    it('should escape " character', () => {
      expect(SitemapBuilder.escapeXml('a"b')).toBe('a&quot;b');
    });

    it("should escape ' character", () => {
      expect(SitemapBuilder.escapeXml("a'b")).toBe('a&apos;b');
    });

    it('should escape all special characters together', () => {
      expect(SitemapBuilder.escapeXml('a&b<c>d"e\'f')).toBe(
        'a&amp;b&lt;c&gt;d&quot;e&apos;f',
      );
    });

    it('should leave safe strings unchanged', () => {
      expect(SitemapBuilder.escapeXml('https://example.com/path')).toBe(
        'https://example.com/path',
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: SitemapService
// ---------------------------------------------------------------------------

describe('SitemapService', () => {
  describe('addStatic()', () => {
    it('should accumulate static entries', async () => {
      const service = await createService();

      service.addStatic(
        { url: 'https://example.com/' },
        { url: 'https://example.com/about' },
      );
      service.addStatic({ url: 'https://example.com/contact' });

      const urls = await service.getAllUrls();
      expect(urls).toHaveLength(3);
      expect(urls).toContain('https://example.com/');
      expect(urls).toContain('https://example.com/about');
      expect(urls).toContain('https://example.com/contact');
    });

    it('should return this for chaining', async () => {
      const service = await createService();
      const result = service.addStatic({ url: 'https://example.com/' });
      expect(result).toBe(service);
    });
  });

  describe('generate()', () => {
    it('should return XML with static entries when no dynamic providers', async () => {
      const service = await createService();
      service.addStatic(
        { url: 'https://example.com/' },
        { url: 'https://example.com/about' },
      );

      const xml = await service.generate();

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset');
      expect(xml).toContain('<loc>https://example.com/</loc>');
      expect(xml).toContain('<loc>https://example.com/about</loc>');
    });

    it('should apply default changefreq and priority', async () => {
      const service = await createService();
      service.addStatic({ url: 'https://example.com/' });

      const xml = await service.generate();

      expect(xml).toContain('<changefreq>weekly</changefreq>');
      expect(xml).toContain('<priority>0.5</priority>');
    });

    it('should not override explicit changefreq and priority', async () => {
      const service = await createService();
      service.addStatic({
        url: 'https://example.com/',
        changefreq: ChangeFrequency.DAILY,
        priority: 1.0,
      });

      const xml = await service.generate();

      expect(xml).toContain('<changefreq>daily</changefreq>');
      expect(xml).toContain('<priority>1.0</priority>');
    });

    it('should create sitemap index when dynamic providers are registered', async () => {
      const service = await createService();
      service.addStatic({ url: 'https://example.com/' });
      service.addDynamic(
        createDynamicProvider('blog', [
          { url: 'https://example.com/blog/post-1' },
        ]),
      );

      const xml = await service.generate();

      expect(xml).toContain('<sitemapindex');
      expect(xml).toContain('sitemap-static.xml');
      expect(xml).toContain('sitemap-blog.xml');
    });
  });

  describe('generateForType()', () => {
    it('should call dynamic provider and return XML', async () => {
      const service = await createService();
      const provider = createDynamicProvider('blog', [
        { url: 'https://example.com/blog/post-1' },
        { url: 'https://example.com/blog/post-2' },
      ]);
      service.addDynamic(provider);

      const xml = await service.generateForType('blog');

      expect(provider.generate).toHaveBeenCalledOnce();
      expect(xml).toContain('<loc>https://example.com/blog/post-1</loc>');
      expect(xml).toContain('<loc>https://example.com/blog/post-2</loc>');
    });

    it('should return static entries for type "static"', async () => {
      const service = await createService();
      service.addStatic({ url: 'https://example.com/' });

      const xml = await service.generateForType('static');

      expect(xml).toContain('<loc>https://example.com/</loc>');
    });

    it('should return empty sitemap for unknown type', async () => {
      const service = await createService();

      const xml = await service.generateForType('nonexistent');

      expect(xml).toContain('<urlset');
      expect(xml).not.toContain('<url>');
    });
  });

  describe('generateRobotsTxt()', () => {
    it('should reference the sitemap URL', async () => {
      const service = await createService();

      const txt = service.generateRobotsTxt('https://example.com');

      expect(txt).toContain('Sitemap: https://example.com/sitemap.xml');
    });

    it('should include disallowed paths when provided', async () => {
      const service = await createService();

      const txt = service.generateRobotsTxt('https://example.com', {
        disallowed: ['/admin/'],
      });

      expect(txt).toContain('Disallow: /admin/');
    });

    it('should include crawl delay when provided', async () => {
      const service = await createService();

      const txt = service.generateRobotsTxt('https://example.com', {
        crawlDelay: 5,
      });

      expect(txt).toContain('Crawl-delay: 5');
    });
  });

  describe('getAllUrls()', () => {
    it('should return all URLs from static and dynamic sources', async () => {
      const service = await createService();
      service.addStatic(
        { url: 'https://example.com/' },
        { url: 'https://example.com/about' },
      );
      service.addDynamic(
        createDynamicProvider('blog', [
          { url: 'https://example.com/blog/post-1' },
        ]),
      );

      const urls = await service.getAllUrls();

      expect(urls).toHaveLength(3);
      expect(urls).toContain('https://example.com/');
      expect(urls).toContain('https://example.com/about');
      expect(urls).toContain('https://example.com/blog/post-1');
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: handleSitemapRequest
// ---------------------------------------------------------------------------

describe('handleSitemapRequest', () => {
  async function importHandler() {
    return import('../sitemap.handlers');
  }

  function createMockSitemapService() {
    return {
      generate: vi.fn(async () => '<?xml version="1.0"?><urlset></urlset>'),
      generateForType: vi.fn(
        async (type: string) =>
          `<?xml version="1.0"?><urlset><!-- ${type} --></urlset>`,
      ),
      generateRobotsTxt: vi.fn(
        (_baseUrl: string) => 'User-agent: *\n\nSitemap: https://example.com/sitemap.xml',
      ),
      generateIndex: vi.fn(async () => '<?xml version="1.0"?><sitemapindex></sitemapindex>'),
      addStatic: vi.fn(),
      addDynamic: vi.fn(),
      submitToSearchEngines: vi.fn(),
      getAllUrls: vi.fn(),
    } as any;
  }

  it('should return sitemap XML for /sitemap.xml', async () => {
    const { handleSitemapRequest } = await importHandler();
    const service = createMockSitemapService();
    const request = new Request('https://example.com/sitemap.xml');

    const response = await handleSitemapRequest(
      request,
      service,
      'https://example.com',
    );

    expect(response).not.toBeNull();
    expect(response!.status).toBe(200);
    expect(response!.headers.get('Content-Type')).toContain('application/xml');
    expect(service.generate).toHaveBeenCalledOnce();
  });

  it('should return typed sitemap for /sitemap-blog.xml', async () => {
    const { handleSitemapRequest } = await importHandler();
    const service = createMockSitemapService();
    const request = new Request('https://example.com/sitemap-blog.xml');

    const response = await handleSitemapRequest(
      request,
      service,
      'https://example.com',
    );

    expect(response).not.toBeNull();
    expect(response!.status).toBe(200);
    expect(service.generateForType).toHaveBeenCalledWith('blog');
  });

  it('should return robots.txt for /robots.txt', async () => {
    const { handleSitemapRequest } = await importHandler();
    const service = createMockSitemapService();
    const request = new Request('https://example.com/robots.txt');

    const response = await handleSitemapRequest(
      request,
      service,
      'https://example.com',
    );

    expect(response).not.toBeNull();
    expect(response!.status).toBe(200);
    expect(response!.headers.get('Content-Type')).toContain('text/plain');

    const body = await response!.text();
    expect(body).toContain('Sitemap:');
  });

  it('should return null for non-sitemap URLs', async () => {
    const { handleSitemapRequest } = await importHandler();
    const service = createMockSitemapService();
    const request = new Request('https://example.com/about');

    const response = await handleSitemapRequest(
      request,
      service,
      'https://example.com',
    );

    expect(response).toBeNull();
  });

  it('should return null for POST requests to /sitemap.xml', async () => {
    const { handleSitemapRequest } = await importHandler();
    const service = createMockSitemapService();
    const request = new Request('https://example.com/sitemap.xml', {
      method: 'POST',
    });

    const response = await handleSitemapRequest(
      request,
      service,
      'https://example.com',
    );

    expect(response).toBeNull();
  });

  it('should include caching headers on sitemap response', async () => {
    const { handleSitemapRequest } = await importHandler();
    const service = createMockSitemapService();
    const request = new Request('https://example.com/sitemap.xml');

    const response = await handleSitemapRequest(
      request,
      service,
      'https://example.com',
    );

    expect(response!.headers.get('Cache-Control')).toContain('public');
  });

  it('should return null for /sitemap.json (non-xml)', async () => {
    const { handleSitemapRequest } = await importHandler();
    const service = createMockSitemapService();
    const request = new Request('https://example.com/sitemap.json');

    const response = await handleSitemapRequest(
      request,
      service,
      'https://example.com',
    );

    expect(response).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: SitemapRoute decorator
// ---------------------------------------------------------------------------

describe('SitemapRoute decorator', () => {
  it('should store and retrieve sitemap metadata', async () => {
    const { SitemapRoute, getSitemapRouteMetadata } = await import(
      '../sitemap.decorator'
    );

    @SitemapRoute({ changefreq: ChangeFrequency.DAILY, priority: 0.9 })
    class TestRoute {}

    const metadata = getSitemapRouteMetadata(TestRoute);

    expect(metadata).toBeDefined();
    expect(metadata!.changefreq).toBe('daily');
    expect(metadata!.priority).toBe(0.9);
  });

  it('should mark dynamic routes', async () => {
    const { SitemapRoute, getSitemapRouteMetadata } = await import(
      '../sitemap.decorator'
    );

    @SitemapRoute({ dynamic: true })
    class DynamicRoute {}

    const metadata = getSitemapRouteMetadata(DynamicRoute);

    expect(metadata).toBeDefined();
    expect(metadata!.dynamic).toBe(true);
  });

  it('should return undefined for undecorated classes', async () => {
    const { getSitemapRouteMetadata } = await import('../sitemap.decorator');

    class PlainRoute {}

    const metadata = getSitemapRouteMetadata(PlainRoute);

    expect(metadata).toBeUndefined();
  });
});
