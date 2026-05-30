/**
 * i18n Translation Loader
 *
 * Loads and caches translations from static JSON maps or dynamic loader functions.
 * Supports namespace-based organization.
 */

import type { Locale, TranslationMap } from './i18n.types';

export class TranslationLoader {
  /** Cache: locale -> namespace -> TranslationMap */
  private cache = new Map<string, TranslationMap>();

  /** Static translations provided at init time: locale -> TranslationMap */
  private staticTranslations = new Map<string, TranslationMap>();

  /** Optional dynamic loader function */
  private dynamicLoader?: (locale: Locale, namespace?: string) => Promise<TranslationMap>;

  /**
   * Register static translations for a locale.
   * Merges with any existing translations for that locale.
   */
  addStaticTranslations(locale: Locale, translations: TranslationMap): void {
    const existing = this.staticTranslations.get(locale) ?? {};
    this.staticTranslations.set(locale, { ...existing, ...translations });
    // Update cache as well
    const cached = this.cache.get(locale) ?? {};
    this.cache.set(locale, { ...cached, ...translations });
  }

  /**
   * Register a dynamic loader function for lazy-loading translations.
   */
  setDynamicLoader(loader: (locale: Locale, namespace?: string) => Promise<TranslationMap>): void {
    this.dynamicLoader = loader;
  }

  /**
   * Load translations for a locale and optional namespace.
   * Uses cache if available, otherwise falls back to dynamic loader.
   */
  async load(locale: Locale, namespace?: string): Promise<TranslationMap> {
    const cacheKey = namespace ? `${locale}:${namespace}` : locale;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Try dynamic loader
    if (this.dynamicLoader) {
      const loaded = await this.dynamicLoader(locale, namespace);
      this.cache.set(cacheKey, loaded);

      // Also merge into the base locale cache for key resolution
      if (namespace) {
        const baseCache = this.cache.get(locale) ?? {};
        this.cache.set(locale, { ...baseCache, [namespace]: loaded });
      }

      return loaded;
    }

    return {};
  }

  /**
   * Get cached translations for a locale (synchronous).
   * Returns whatever has been loaded so far.
   */
  getTranslations(locale: Locale): TranslationMap {
    return this.cache.get(locale) ?? this.staticTranslations.get(locale) ?? {};
  }

  /**
   * Resolve a dotted key against a translation map.
   * Supports namespace lookups: "auth.login_title" looks for
   * translations.auth.login_title (nested) or translations["auth.login_title"] (flat).
   */
  resolveKey(translations: TranslationMap, key: string): string | undefined {
    // Try flat key first
    const flat = translations[key];
    if (typeof flat === 'string') {
      return flat;
    }

    // Try dotted path resolution
    const parts = key.split('.');
    let current: string | TranslationMap | undefined = translations;

    for (const part of parts) {
      if (current === undefined || typeof current === 'string') {
        return undefined;
      }
      current = current[part];
    }

    if (typeof current === 'string') {
      return current;
    }

    return undefined;
  }

  /**
   * Clear all cached translations.
   */
  clearCache(): void {
    this.cache.clear();
  }
}
