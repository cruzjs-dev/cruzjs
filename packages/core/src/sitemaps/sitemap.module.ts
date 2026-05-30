/**
 * Sitemap Module
 *
 * Provides sitemap generation, robots.txt, and HTTP handlers
 * for serving sitemap XML files.
 *
 * Register via `createCruzApp({ modules: [SitemapModule] })`.
 */

import { Module } from '../di';
import { SitemapService } from './sitemap.service';

@Module({
  providers: [SitemapService],
})
export class SitemapModule {}
