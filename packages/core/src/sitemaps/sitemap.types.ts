/**
 * Sitemap Types
 *
 * Defines all types for sitemap generation including entries,
 * dynamic providers, and configuration.
 */

export const ChangeFrequency = {
  ALWAYS: 'always',
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  NEVER: 'never',
} as const;
export type ChangeFrequency = (typeof ChangeFrequency)[keyof typeof ChangeFrequency];

export interface SitemapImage {
  url: string;
  caption?: string;
  title?: string;
  license?: string;
}

export interface SitemapEntry {
  url: string;
  lastmod?: Date | string;
  changefreq?: ChangeFrequency;
  priority?: number; // 0.0 to 1.0
  images?: SitemapImage[];
  alternates?: Array<{ hreflang: string; href: string }>; // i18n alternates
}

export interface DynamicSitemapProvider {
  type: string; // used as sitemap-{type}.xml filename
  generate(): Promise<SitemapEntry[]>;
}

export interface SitemapConfig {
  baseUrl: string;
  staticRoutes?: SitemapEntry[];
  maxUrlsPerSitemap?: number; // default: 50000
  trailingSlash?: boolean;
  defaultPriority?: number;
  defaultChangefreq?: ChangeFrequency;
}

export const DEFAULT_SITEMAP_CONFIG: SitemapConfig = {
  baseUrl: '',
  maxUrlsPerSitemap: 50000,
  trailingSlash: false,
  defaultPriority: 0.5,
  defaultChangefreq: ChangeFrequency.WEEKLY,
} satisfies SitemapConfig;
