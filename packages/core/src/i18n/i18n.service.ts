/**
 * i18n Service
 *
 * Injectable service for server-side internationalization.
 * Provides translation, pluralization, locale detection, and formatting.
 *
 * Uses {{name}} syntax for interpolation.
 */

import { injectable, inject } from 'inversify';
import { ConfigService } from '../shared/config/config.service';
import { TranslationLoader } from './i18n.loader';
import { interpolate, pluralize } from './i18n.pluralizer';
import { I18nFormatter } from './i18n.formatter';
import { detectLocaleFromRequest } from './i18n.middleware';
import type { Locale, TranslationMap, I18nConfig, ScopedTranslator } from './i18n.types';

@injectable()
export class I18nService {
  private locale: Locale;
  private fallbackLocale: Locale;
  private supportedLocales: Locale[];
  private readonly loader = new TranslationLoader();
  readonly format: I18nFormatter;

  constructor(@inject(ConfigService) private readonly config: ConfigService) {
    this.locale = this.config.get<string>('DEFAULT_LOCALE', 'en') ?? 'en';
    this.fallbackLocale = this.config.get<string>('FALLBACK_LOCALE', this.locale) ?? this.locale;
    this.supportedLocales = parseSupportedLocales(
      this.config.get<string>('SUPPORTED_LOCALES', this.locale),
    );
    this.format = new I18nFormatter();
  }

  // ── Configuration ──────────────────────────────────────────────────────────

  /**
   * Configure the i18n service with full config.
   * Typically called once during app initialization.
   */
  configure(i18nConfig: I18nConfig): void {
    this.locale = i18nConfig.defaultLocale;
    this.supportedLocales = i18nConfig.supportedLocales;
    this.fallbackLocale = i18nConfig.fallbackLocale ?? i18nConfig.defaultLocale;

    if (i18nConfig.loadTranslations) {
      this.loader.setDynamicLoader(i18nConfig.loadTranslations);
    }
  }

  /**
   * Add static translations for a locale.
   */
  addTranslations(locale: Locale, translations: TranslationMap): void {
    this.loader.addStaticTranslations(locale, translations);
  }

  // ── Locale Management ──────────────────────────────────────────────────────

  /**
   * Set the active locale for this service instance.
   */
  setLocale(locale: Locale): void {
    if (this.supportedLocales.length > 0 && !this.supportedLocales.includes(locale)) {
      return; // Silently ignore unsupported locales
    }
    this.locale = locale;
  }

  /**
   * Get the current active locale.
   */
  getLocale(): Locale {
    return this.locale;
  }

  /**
   * Get the list of supported locales.
   */
  getSupportedLocales(): Locale[] {
    return [...this.supportedLocales];
  }

  /**
   * Detect locale from an incoming request, with optional user/org preferences.
   *
   * Priority:
   * 1. userPreference (if provided and supported)
   * 2. orgPreference (if provided and supported)
   * 3. Request detection (query param -> header -> Accept-Language)
   * 4. fallbackLocale
   */
  detectLocale(request: Request, userPreference?: string, orgPreference?: string): Locale {
    // User preference takes highest priority
    if (userPreference && this.supportedLocales.includes(userPreference)) {
      return userPreference;
    }

    // Org preference next
    if (orgPreference && this.supportedLocales.includes(orgPreference)) {
      return orgPreference;
    }

    // Request-based detection
    return detectLocaleFromRequest(request, this.supportedLocales, this.fallbackLocale);
  }

  // ── Translation ────────────────────────────────────────────────────────────

  /**
   * Translate a key with optional parameter interpolation.
   *
   * Uses {{param}} syntax. Returns the key itself if no translation found.
   *
   * @param key - Dotted key path (e.g., "auth.login_title")
   * @param params - Interpolation parameters
   */
  t(key: string, params?: Record<string, unknown>): string {
    const result = this.resolveTranslation(key);
    return interpolate(result, params);
  }

  /**
   * Translate a key with pluralization support.
   *
   * The resolved translation string is passed through the pluralizer.
   * Supports ICU format, pipe-delimited, or plain strings.
   *
   * {{count}} is automatically available as a parameter.
   *
   * @param key - Dotted key path
   * @param count - Count for pluralization
   * @param params - Additional interpolation parameters
   */
  tc(key: string, count: number, params?: Record<string, unknown>): string {
    const template = this.resolveTranslation(key);
    return pluralize(template, count, params);
  }

  /**
   * Create a scoped translator for a namespace.
   *
   * ```typescript
   * const auth = i18n.ns('auth');
   * auth.t('login_title'); // resolves "auth.login_title"
   * ```
   */
  ns(namespace: string): ScopedTranslator {
    return {
      t: (key: string, params?: Record<string, unknown>) =>
        this.t(`${namespace}.${key}`, params),
      tc: (key: string, count: number, params?: Record<string, unknown>) =>
        this.tc(`${namespace}.${key}`, count, params),
    };
  }

  // ── Async Loading ──────────────────────────────────────────────────────────

  /**
   * Load translations for a locale and optional namespace.
   * Uses the dynamic loader if configured, otherwise relies on static translations.
   */
  async loadTranslations(locale: Locale, namespace?: string): Promise<void> {
    await this.loader.load(locale, namespace);
  }

  /**
   * Get the current translations for the active locale (synchronous).
   */
  getTranslations(): TranslationMap {
    return this.loader.getTranslations(this.locale);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /**
   * Resolve a translation key against current locale, falling back to the
   * fallback locale if not found. Returns the key itself as final fallback.
   */
  private resolveTranslation(key: string): string {
    // Try current locale
    const translations = this.loader.getTranslations(this.locale);
    const result = this.loader.resolveKey(translations, key);
    if (result !== undefined) {
      return result;
    }

    // Try fallback locale
    if (this.fallbackLocale !== this.locale) {
      const fallbackTranslations = this.loader.getTranslations(this.fallbackLocale);
      const fallbackResult = this.loader.resolveKey(fallbackTranslations, key);
      if (fallbackResult !== undefined) {
        return fallbackResult;
      }
    }

    // Return key as fallback
    return key;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a comma-separated locale string into an array.
 */
function parseSupportedLocales(value: string | undefined): string[] {
  if (!value) {
    return ['en'];
  }
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
