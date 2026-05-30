/**
 * i18n Types
 *
 * Core type definitions for the internationalization system.
 */

/** A locale identifier (e.g., 'en', 'es', 'fr', 'de', 'ja', 'zh') */
export type Locale = string;

/** Nested translation map — values are either translated strings or nested maps */
export interface TranslationMap {
  [key: string]: string | TranslationMap;
}

/** Configuration for the i18n system */
export type I18nConfig = {
  defaultLocale: Locale;
  supportedLocales: Locale[];
  fallbackLocale?: Locale;
  loadTranslations?: (locale: Locale, namespace?: string) => Promise<TranslationMap>;
};

/** Options for number/currency formatting */
export type FormatOptions = {
  locale?: Locale;
  currency?: string;
  style?: 'decimal' | 'currency' | 'percent';
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

/** A scoped translator bound to a specific namespace */
export type ScopedTranslator = {
  t: (key: string, params?: Record<string, unknown>) => string;
  tc: (key: string, count: number, params?: Record<string, unknown>) => string;
};

/** Context value provided by I18nProvider to React consumers */
export type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  translations: TranslationMap;
};
