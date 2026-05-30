/**
 * i18n Formatter
 *
 * Intl-based formatters for dates, numbers, currencies, relative time, and lists.
 * Uses the V8/CF Workers built-in Intl APIs — no external dependencies.
 */

import { injectable } from 'inversify';
import type { Locale } from './i18n.types';

@injectable()
export class I18nFormatter {
  /**
   * Format a date using Intl.DateTimeFormat.
   *
   * @param date - Date object or ISO string
   * @param locale - Target locale (e.g., 'en-US', 'de-DE')
   * @param options - Intl.DateTimeFormatOptions
   */
  formatDate(
    date: Date | string,
    locale: Locale,
    options?: Intl.DateTimeFormatOptions,
  ): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const effectiveOptions: Intl.DateTimeFormatOptions = options ?? {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Intl.DateTimeFormat(locale, effectiveOptions).format(d);
  }

  /**
   * Format a number using Intl.NumberFormat.
   */
  formatNumber(
    value: number,
    locale: Locale,
    options?: Intl.NumberFormatOptions,
  ): string {
    return new Intl.NumberFormat(locale, options).format(value);
  }

  /**
   * Format a currency amount.
   *
   * @param amount - Numeric amount
   * @param currency - ISO 4217 currency code (e.g., 'USD', 'EUR')
   * @param locale - Target locale
   */
  formatCurrency(amount: number, currency: string, locale: Locale): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Format a date as a relative time string (e.g., "2 hours ago", "in 3 days").
   *
   * Uses Intl.RelativeTimeFormat to pick the most appropriate unit.
   */
  formatRelativeTime(date: Date, locale: Locale): string {
    const now = Date.now();
    const diffMs = date.getTime() - now;
    const absDiffMs = Math.abs(diffMs);

    const { value, unit } = selectRelativeTimeUnit(absDiffMs);
    const signedValue = diffMs < 0 ? -value : value;

    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
      signedValue,
      unit,
    );
  }

  /**
   * Format a list of items using Intl.ListFormat.
   *
   * @param items - Array of strings
   * @param locale - Target locale
   * @param type - 'conjunction' (a, b, and c) or 'disjunction' (a, b, or c)
   */
  formatList(
    items: string[],
    locale: Locale,
    type: 'conjunction' | 'disjunction' = 'conjunction',
  ): string {
    return new Intl.ListFormat(locale, { style: 'long', type }).format(items);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

type RelativeTimeUnitSelection = {
  value: number;
  unit: Intl.RelativeTimeFormatUnit;
};

function selectRelativeTimeUnit(absDiffMs: number): RelativeTimeUnitSelection {
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
