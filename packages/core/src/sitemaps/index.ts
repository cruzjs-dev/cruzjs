/**
 * Sitemaps — barrel exports
 */

// Types
export type {
  SitemapEntry,
  SitemapImage,
  SitemapConfig,
  DynamicSitemapProvider,
} from './sitemap.types';
export { ChangeFrequency, DEFAULT_SITEMAP_CONFIG } from './sitemap.types';

// Builder
export { SitemapBuilder } from './sitemap.builder';

// Service
export { SitemapService } from './sitemap.service';

// Decorator
export {
  SitemapRoute,
  getSitemapRouteMetadata,
} from './sitemap.decorator';
export type { SitemapRouteMetadata } from './sitemap.decorator';

// HTTP Handlers
export { handleSitemapRequest } from './sitemap.handlers';

// Module
export { SitemapModule } from './sitemap.module';
