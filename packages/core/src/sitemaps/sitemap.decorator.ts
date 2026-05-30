/**
 * Sitemap Route Decorator
 *
 * Mark route components with sitemap metadata for automatic inclusion
 * or exclusion from generated sitemaps.
 */

import type { ChangeFrequency } from './sitemap.types';

const SITEMAP_ROUTE_METADATA_KEY = Symbol.for('cruz:sitemap:route');

export interface SitemapRouteMetadata {
  changefreq?: ChangeFrequency;
  priority?: number;
  dynamic?: boolean; // if true, route is excluded (needs dynamic provider)
}

/**
 * Mark a route component with sitemap metadata.
 *
 * @example
 * ```typescript
 * @SitemapRoute({ changefreq: 'daily', priority: 0.8 })
 * export default function BlogIndex() { ... }
 *
 * @SitemapRoute({ dynamic: true }) // excluded — needs dynamic provider
 * export default function BlogPost() { ... }
 * ```
 */
export function SitemapRoute(options: SitemapRouteMetadata): (target: any) => void {
  return (target: any) => {
    Reflect.defineMetadata(SITEMAP_ROUTE_METADATA_KEY, options, target);
  };
}

/**
 * Retrieve sitemap metadata from a decorated route component.
 */
export function getSitemapRouteMetadata(
  target: any,
): SitemapRouteMetadata | undefined {
  return Reflect.getMetadata(SITEMAP_ROUTE_METADATA_KEY, target);
}
