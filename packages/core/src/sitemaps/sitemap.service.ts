/**
 * Sitemap Service
 *
 * Manages static and dynamic sitemap entries, generates XML sitemaps
 * and sitemap indexes, and produces robots.txt content.
 */

import { injectable, inject } from 'inversify';
import { getToken } from '../di/tokens/token-registry';
import { ConfigService } from '../shared/config/config.service';
import { SitemapBuilder } from './sitemap.builder';
import type {
  SitemapEntry,
  SitemapConfig,
  DynamicSitemapProvider,
} from './sitemap.types';
import { DEFAULT_SITEMAP_CONFIG } from './sitemap.types';

@injectable()
export class SitemapService {
  private readonly staticEntries: SitemapEntry[] = [];
  private readonly dynamicProviders: Map<string, DynamicSitemapProvider> =
    new Map();
  private readonly config: SitemapConfig;

  constructor(
    @inject(getToken(ConfigService)!) private readonly configService: ConfigService,
  ) {
    const baseUrl = this.configService.get<string>('APP_URL', '') ?? '';
    this.config = {
      ...DEFAULT_SITEMAP_CONFIG,
      baseUrl: baseUrl.replace(/\/+$/, ''),
    };
  }

  /**
   * Add static URL entries.
   */
  addStatic(...entries: SitemapEntry[]): this {
    this.staticEntries.push(...entries);
    return this;
  }

  /**
   * Register a dynamic sitemap provider.
   */
  addDynamic(provider: DynamicSitemapProvider): this {
    this.dynamicProviders.set(provider.type, provider);
    return this;
  }

  /**
   * Generate the main sitemap XML (or sitemap index if entries exceed maxUrlsPerSitemap).
   */
  async generate(): Promise<string> {
    const allEntries = await this.collectAllEntries();
    const maxUrls = this.config.maxUrlsPerSitemap ?? 50000;

    // If total entries fit in a single sitemap, return it directly
    if (allEntries.length <= maxUrls && this.dynamicProviders.size === 0) {
      return SitemapBuilder.buildSitemap(
        this.applyDefaults(allEntries),
      );
    }

    // If we have dynamic providers or too many entries, return an index
    return this.generateIndex(this.config.baseUrl);
  }

  /**
   * Generate a specific dynamic sitemap by type.
   */
  async generateForType(type: string): Promise<string> {
    if (type === 'static') {
      return SitemapBuilder.buildSitemap(
        this.applyDefaults(this.staticEntries),
      );
    }

    const provider = this.dynamicProviders.get(type);
    if (!provider) {
      return SitemapBuilder.buildSitemap([]);
    }

    const entries = await provider.generate();
    return SitemapBuilder.buildSitemap(this.applyDefaults(entries));
  }

  /**
   * Generate a sitemap index referencing all sub-sitemaps.
   */
  async generateIndex(baseUrl: string): Promise<string> {
    const sitemaps: Array<{ url: string; lastmod?: Date }> = [];

    // Static sitemap
    if (this.staticEntries.length > 0) {
      sitemaps.push({
        url: `${baseUrl}/sitemap-static.xml`,
        lastmod: new Date(),
      });
    }

    // Dynamic sitemaps
    for (const [type] of this.dynamicProviders) {
      sitemaps.push({
        url: `${baseUrl}/sitemap-${type}.xml`,
        lastmod: new Date(),
      });
    }

    return SitemapBuilder.buildSitemapIndex(sitemaps);
  }

  /**
   * Generate robots.txt content.
   */
  generateRobotsTxt(
    baseUrl: string,
    options?: {
      disallowed?: string[];
      allowed?: string[];
      crawlDelay?: number;
    },
  ): string {
    return SitemapBuilder.buildRobotsTxt({
      sitemapUrl: `${baseUrl}/sitemap.xml`,
      disallowed: options?.disallowed,
      allowed: options?.allowed,
      crawlDelay: options?.crawlDelay,
    });
  }

  /**
   * Submit sitemap to search engines via ping URLs.
   */
  async submitToSearchEngines(sitemapUrl: string): Promise<{
    google: boolean;
    bing: boolean;
  }> {
    const results = { google: false, bing: false };

    try {
      const googleResponse = await fetch(
        `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      );
      results.google = googleResponse.ok;
    } catch {
      results.google = false;
    }

    try {
      const bingResponse = await fetch(
        `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      );
      results.bing = bingResponse.ok;
    } catch {
      results.bing = false;
    }

    return results;
  }

  /**
   * Get all URLs across static and dynamic providers (for validation/debugging).
   */
  async getAllUrls(): Promise<string[]> {
    const allEntries = await this.collectAllEntries();
    return allEntries.map((e) => e.url);
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private async collectAllEntries(): Promise<SitemapEntry[]> {
    const entries = [...this.staticEntries];

    for (const [, provider] of this.dynamicProviders) {
      const dynamicEntries = await provider.generate();
      entries.push(...dynamicEntries);
    }

    return entries;
  }

  private applyDefaults(entries: SitemapEntry[]): SitemapEntry[] {
    return entries.map((entry) => ({
      ...entry,
      changefreq: entry.changefreq ?? this.config.defaultChangefreq,
      priority: entry.priority ?? this.config.defaultPriority,
    }));
  }
}
