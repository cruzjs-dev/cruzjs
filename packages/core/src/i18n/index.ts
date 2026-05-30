/**
 * i18n — Internationalization & Localization
 *
 * Server-side exports: I18nService, I18nFormatter, I18nModule, middleware, loader, pluralizer
 * Client-side exports: I18nProvider, I18nContext, useTranslation
 */

// Types (shared)
export type {
  Locale,
  TranslationMap,
  I18nConfig,
  FormatOptions,
  ScopedTranslator,
  I18nContextValue,
} from './i18n.types';

// Server-side
export { I18nService } from './i18n.service';
export { I18nFormatter } from './i18n.formatter';
export { I18nModule } from './i18n.module';
export { TranslationLoader } from './i18n.loader';
export { detectLocaleFromRequest } from './i18n.middleware';
export { interpolate, pluralize } from './i18n.pluralizer';

// Client-side
export { I18nContext, I18nProvider } from './i18n-context';
export type { I18nProviderProps } from './i18n-context';
export { useTranslation } from './use-translation';
export type { UseTranslationReturn } from './use-translation';
