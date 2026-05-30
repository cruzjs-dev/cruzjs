/**
 * Sitemap XML Builder
 *
 * Pure string-based XML generation — no DOM/JSDOM dependencies.
 * Safe for Cloudflare Workers and all edge runtimes.
 */

import type { SitemapEntry, SitemapImage } from './sitemap.types';

export class SitemapBuilder {
  /**
   * Build a single sitemap XML string from a list of entries.
   */
  static buildSitemap(entries: SitemapEntry[]): string {
    const hasImages = entries.some((e) => e.images && e.images.length > 0);
    const hasAlternates = entries.some(
      (e) => e.alternates && e.alternates.length > 0,
    );

    const namespaces = [
      'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      ...(hasImages
        ? ['xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"']
        : []),
      ...(hasAlternates
        ? ['xmlns:xhtml="http://www.w3.org/1999/xhtml"']
        : []),
    ];

    const urls = entries.map((entry) => SitemapBuilder.buildUrlEntry(entry));

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<urlset ${namespaces.join(' ')}>`,
      ...urls,
      '</urlset>',
    ].join('\n');
  }

  /**
   * Build a sitemap index XML string referencing multiple sitemaps.
   */
  static buildSitemapIndex(
    sitemaps: Array<{ url: string; lastmod?: Date }>,
  ): string {
    const entries = sitemaps.map((s) => {
      const lastmod = s.lastmod
        ? `\n    <lastmod>${SitemapBuilder.formatDate(s.lastmod)}</lastmod>`
        : '';
      return `  <sitemap>\n    <loc>${SitemapBuilder.escapeXml(s.url)}</loc>${lastmod}\n  </sitemap>`;
    });

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...entries,
      '</sitemapindex>',
    ].join('\n');
  }

  /**
   * Build robots.txt content.
   */
  static buildRobotsTxt(options: {
    sitemapUrl: string;
    disallowed?: string[];
    allowed?: string[];
    crawlDelay?: number;
  }): string {
    const lines: string[] = ['User-agent: *'];

    if (options.allowed) {
      for (const path of options.allowed) {
        lines.push(`Allow: ${path}`);
      }
    }

    if (options.disallowed) {
      for (const path of options.disallowed) {
        lines.push(`Disallow: ${path}`);
      }
    }

    if (options.crawlDelay !== undefined) {
      lines.push(`Crawl-delay: ${options.crawlDelay}`);
    }

    lines.push('');
    lines.push(`Sitemap: ${options.sitemapUrl}`);

    return lines.join('\n');
  }

  /**
   * Escape XML special characters.
   */
  static escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private static buildUrlEntry(entry: SitemapEntry): string {
    const parts: string[] = [
      '  <url>',
      `    <loc>${SitemapBuilder.escapeXml(entry.url)}</loc>`,
    ];

    if (entry.lastmod !== undefined) {
      const dateStr =
        entry.lastmod instanceof Date
          ? SitemapBuilder.formatDate(entry.lastmod)
          : entry.lastmod;
      parts.push(`    <lastmod>${SitemapBuilder.escapeXml(dateStr)}</lastmod>`);
    }

    if (entry.changefreq !== undefined) {
      parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    }

    if (entry.priority !== undefined) {
      parts.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
    }

    if (entry.images) {
      for (const image of entry.images) {
        parts.push(SitemapBuilder.buildImageEntry(image));
      }
    }

    if (entry.alternates) {
      for (const alt of entry.alternates) {
        parts.push(
          `    <xhtml:link rel="alternate" hreflang="${SitemapBuilder.escapeXml(alt.hreflang)}" href="${SitemapBuilder.escapeXml(alt.href)}" />`,
        );
      }
    }

    parts.push('  </url>');
    return parts.join('\n');
  }

  private static buildImageEntry(image: SitemapImage): string {
    const parts: string[] = [
      '    <image:image>',
      `      <image:loc>${SitemapBuilder.escapeXml(image.url)}</image:loc>`,
    ];

    if (image.caption) {
      parts.push(
        `      <image:caption>${SitemapBuilder.escapeXml(image.caption)}</image:caption>`,
      );
    }

    if (image.title) {
      parts.push(
        `      <image:title>${SitemapBuilder.escapeXml(image.title)}</image:title>`,
      );
    }

    if (image.license) {
      parts.push(
        `      <image:license>${SitemapBuilder.escapeXml(image.license)}</image:license>`,
      );
    }

    parts.push('    </image:image>');
    return parts.join('\n');
  }

  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
