/**
 * useTranslation React Hook
 *
 * Provides translation, pluralization, and formatting capabilities
 * from the I18nContext. Client-side only — no server-only imports.
 *
 * Uses {{param}} syntax for interpolation.
 */

import { useContext, useCallback, useMemo } from 'react';
import { I18nContext } from './i18n-context';
import { interpolate, pluralize } from './i18n.pluralizer';
import type { TranslationMap } from './i18n.types';

/**
 * Resolve a dotted key against a TranslationMap.
 */
function resolveKey(translations: TranslationMap, key: string): string | undefined {
  // Try flat key
  const flat = translations[key];
  if (typeof flat === 'string') {
    return flat;
  }

  // Try dotted path
  const parts = key.split('.');
  let current: string | TranslationMap | undefined = translations;

  for (const part of parts) {
    if (current === undefined || typeof current === 'string') {
      return undefined;
    }
    current = current[part];
  }

  return typeof current === 'string' ? current : undefined;
}

export type UseTranslationReturn = {
  /** Translate a key with optional interpolation */
  t: (key: string, params?: Record<string, unknown>) => string;
  /** Translate with pluralization */
  tc: (key: string, count: number, params?: Record<string, unknown>) => string;
  /** Current locale */
  locale: string;
  /** Update the active locale */
  setLocale: (locale: string) => void;
  /** Formatting utilities */
  format: {
    date: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
    number: (value: number, options?: Intl.NumberFormatOptions) => string;
    currency: (amount: number, currency: string) => string;
    relativeTime: (date: Date) => string;
  };
};

/**
 * React hook for i18n translation and formatting.
 *
 * @param namespace - Optional namespace prefix for all key lookups
 *
 * @example
 * ```tsx
 * const { t, tc, locale, format } = useTranslation('auth');
 * return <h1>{t('login_title')}</h1>;
 * ```
 */
export function useTranslation(namespace?: string): UseTranslationReturn {
  const { locale, setLocale, translations } = useContext(I18nContext);

  const t = useCallback(
    (key: string, params?: Record<string, unknown>): string => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      const resolved = resolveKey(translations, fullKey);
      const template = resolved ?? fullKey;
      return interpolate(template, params);
    },
    [translations, namespace],
  );

  const tc = useCallback(
    (key: string, count: number, params?: Record<string, unknown>): string => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      const resolved = resolveKey(translations, fullKey);
      const template = resolved ?? fullKey;
      return pluralize(template, count, params);
    },
    [translations, namespace],
  );

  const format = useMemo(
    () => ({
      date: (date: Date, options?: Intl.DateTimeFormatOptions): string => {
        const effectiveOptions: Intl.DateTimeFormatOptions = options ?? {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        };
        return new Intl.DateTimeFormat(locale, effectiveOptions).format(date);
      },
      number: (value: number, options?: Intl.NumberFormatOptions): string => {
        return new Intl.NumberFormat(locale, options).format(value);
      },
      currency: (amount: number, currency: string): string => {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
        }).format(amount);
      },
      relativeTime: (date: Date): string => {
        const now = Date.now();
        const diffMs = date.getTime() - now;
        const absDiffMs = Math.abs(diffMs);

        const { value, unit } = selectRelativeTimeUnit(absDiffMs);
        const signedValue = diffMs < 0 ? -value : value;

        return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
          signedValue,
          unit,
        );
      },
    }),
    [locale],
  );

  return { t, tc, locale, setLocale, format };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

function selectRelativeTimeUnit(absDiffMs: number): {
  value: number;
  unit: Intl.RelativeTimeFormatUnit;
} {
  if (absDiffMs < MINUTE) {
    return { value: Math.round(absDiffMs / SECOND), unit: 'second' };
  }
  if (absDiffMs < HOUR) {
    return { value: Math.round(absDiffMs / MINUTE), unit: 'minute' };
  }
  if (absDiffMs < DAY) {
    return { value: Math.round(absDiffMs / HOUR), unit: 'hour' };
  }
  if (absDiffMs < WEEK) {
    return { value: Math.round(absDiffMs / DAY), unit: 'day' };
  }
  if (absDiffMs < MONTH) {
    return { value: Math.round(absDiffMs / WEEK), unit: 'week' };
  }
  if (absDiffMs < YEAR) {
    return { value: Math.round(absDiffMs / MONTH), unit: 'month' };
  }
  return { value: Math.round(absDiffMs / YEAR), unit: 'year' };
}
