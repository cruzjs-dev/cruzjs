/**
 * Sitemap HTTP Request Handlers
 *
 * Handles sitemap-related HTTP requests. Integrates into the framework's
 * fetch handler to serve sitemap XML and robots.txt responses.
 *
 * Handles:
 * - GET /sitemap.xml       -> main sitemap or sitemap index
 * - GET /sitemap-{type}.xml -> specific dynamic sitemap
 * - GET /robots.txt        -> robots.txt with sitemap reference
 */

import type { SitemapService } from './sitemap.service';

/** Regex to match /sitemap-{type}.xml paths */
const TYPED_SITEMAP_REGEX = /^\/sitemap-([a-z0-9-]+)\.xml$/;

/**
 * Handle a sitemap-related HTTP request.
 *
 * Returns a Response for sitemap URLs, or null if the URL is not sitemap-related.
 * Intended to be called early in the fetch handler pipeline.
 *
 * @param request - The incoming HTTP request
 * @param sitemapService - The SitemapService instance from DI
 * @param baseUrl - The base URL for the site (e.g. https://example.com)
 * @returns A Response for sitemap URLs, or null for non-sitemap URLs
 */
export async function handleSitemapRequest(
  request: Request,
  sitemapService: SitemapService,
  baseUrl: string,
): Promise<Response | null> {
  const url = new URL(request.url);
  const { pathname } = url;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return null;
  }

  // GET /sitemap.xml
  if (pathname === '/sitemap.xml') {
    const xml = await sitemapService.generate();
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  }

  // GET /sitemap-{type}.xml
  const typedMatch = pathname.match(TYPED_SITEMAP_REGEX);
  if (typedMatch) {
    const type = typedMatch[1];
    const xml = await sitemapService.generateForType(type);
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  }

  // GET /robots.txt
  if (pathname === '/robots.txt') {
    const robotsTxt = sitemapService.generateRobotsTxt(baseUrl);
    return new Response(robotsTxt, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  }

  return null;
}
