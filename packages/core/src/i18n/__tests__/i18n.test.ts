/**
 * i18n — Unit Tests
 *
 * Covers: translation resolution, interpolation, pluralization,
 * namespace scoping, locale detection, formatting, and the
 * translation loader.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nService } from '../i18n.service';
import { I18nFormatter } from '../i18n.formatter';
import { TranslationLoader } from '../i18n.loader';
import { interpolate, pluralize } from '../i18n.pluralizer';
import { detectLocaleFromRequest } from '../i18n.middleware';

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockConfigService(overrides: Record<string, unknown> = {}) {
  return {
    get: vi.fn((key: string, defaultValue?: unknown) => {
      const values: Record<string, unknown> = {
        DEFAULT_LOCALE: 'en',
        FALLBACK_LOCALE: 'en',
        SUPPORTED_LOCALES: 'en,es,fr,de',
        ...overrides,
      };
      return values[key] ?? defaultValue;
    }),
    getOrThrow: vi.fn(),
    getEnv: vi.fn(),
    getRaw: vi.fn(),
  } as any;
}

function createService(
  overrides: Record<string, unknown> = {},
): I18nService {
  const config = createMockConfigService(overrides);
  return new I18nService(config);
}

function createRequest(
  url: string = 'http://localhost/',
  headers: Record<string, string> = {},
): Request {
  return new Request(url, { headers });
}

// ── I18nService Tests ────────────────────────────────────────────────────────

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    service = createService();
    service.addTranslations('en', {
      greeting: 'Hello, {{name}}!',
      farewell: 'Goodbye',
      auth: {
        login: 'Log In',
        logout: 'Log Out',
        welcome: 'Welcome, {{name}}',
      },
      items: '{count, plural, one {# item} other {# items}}',
      messages: 'message|messages',
      simple_count: 'You have {{count}} new notifications',
    });
    service.addTranslations('es', {
      greeting: 'Hola, {{name}}!',
      farewell: 'Adios',
      auth: {
        login: 'Iniciar sesion',
        logout: 'Cerrar sesion',
        welcome: 'Bienvenido, {{name}}',
      },
    });
  });

  describe('t() — basic translation', () => {
    it('should return correct translation for a key', () => {
      expect(service.t('farewell')).toBe('Goodbye');
    });

    it('should return the key when translation is missing', () => {
      expect(service.t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('should interpolate params correctly using {{param}} syntax', () => {
      expect(service.t('greeting', { name: 'World' })).toBe('Hello, World!');
    });

    it('should leave placeholders intact when params are not provided', () => {
      expect(service.t('greeting')).toBe('Hello, {{name}}!');
    });

    it('should resolve nested keys with dot notation', () => {
      expect(service.t('auth.login')).toBe('Log In');
    });

    it('should interpolate nested keys with params', () => {
      expect(service.t('auth.welcome', { name: 'Alice' })).toBe('Welcome, Alice');
    });
  });

  describe('t() — fallback locale', () => {
    it('should fall back to default locale when key missing in current locale', () => {
      service.setLocale('es');
      // 'items' only exists in 'en'
      expect(service.t('items')).toBe('{count, plural, one {# item} other {# items}}');
    });

    it('should use current locale translation when available', () => {
      service.setLocale('es');
      expect(service.t('farewell')).toBe('Adios');
    });
  });

  describe('tc() — pluralization', () => {
    it('should pluralize correctly for count === 1 (ICU format)', () => {
      expect(service.tc('items', 1)).toBe('1 item');
    });

    it('should pluralize correctly for count > 1 (ICU format)', () => {
      expect(service.tc('items', 5)).toBe('5 items');
    });

    it('should pluralize correctly for count === 0 (ICU format)', () => {
      expect(service.tc('items', 0)).toBe('0 items');
    });

    it('should handle pipe-delimited pluralization for count === 1', () => {
      expect(service.tc('messages', 1)).toBe('message');
    });

    it('should handle pipe-delimited pluralization for count > 1', () => {
      expect(service.tc('messages', 3)).toBe('messages');
    });

    it('should pass count as automatic param for {{count}} interpolation', () => {
      expect(service.tc('simple_count', 7)).toBe('You have 7 new notifications');
    });
  });

  describe('ns() — namespace scoping', () => {
    it('should scope translations to a namespace', () => {
      const auth = service.ns('auth');
      expect(auth.t('login')).toBe('Log In');
      expect(auth.t('logout')).toBe('Log Out');
    });

    it('should interpolate params in namespace-scoped translations', () => {
      const auth = service.ns('auth');
      expect(auth.t('welcome', { name: 'Bob' })).toBe('Welcome, Bob');
    });

    it('should return namespaced key on miss', () => {
      const auth = service.ns('auth');
      expect(auth.t('nonexistent')).toBe('auth.nonexistent');
    });
  });

  describe('setLocale / getLocale', () => {
    it('should change the active locale', () => {
      service.setLocale('es');
      expect(service.getLocale()).toBe('es');
    });

    it('should silently ignore unsupported locales', () => {
      service.setLocale('xx');
      expect(service.getLocale()).toBe('en');
    });

    it('should translate using the new locale after setLocale', () => {
      service.setLocale('es');
      expect(service.t('greeting', { name: 'Mundo' })).toBe('Hola, Mundo!');
    });
  });

  describe('detectLocale()', () => {
    it('should prefer user preference when supported', () => {
      const request = createRequest();
      const locale = service.detectLocale(request, 'fr');
      expect(locale).toBe('fr');
    });

    it('should prefer org preference over request headers', () => {
      const request = createRequest('http://localhost/', {
        'accept-language': 'de',
      });
      const locale = service.detectLocale(request, undefined, 'es');
      expect(locale).toBe('es');
    });

    it('should fall back to Accept-Language when no preferences set', () => {
      const request = createRequest('http://localhost/', {
        'accept-language': 'de-DE,de;q=0.9,en;q=0.8',
      });
      const locale = service.detectLocale(request);
      expect(locale).toBe('de');
    });

    it('should fall back to default locale when nothing matches', () => {
      const request = createRequest('http://localhost/', {
        'accept-language': 'ja',
      });
      const locale = service.detectLocale(request);
      expect(locale).toBe('en');
    });
  });

  describe('loadTranslations()', () => {
    it('should load translations via dynamic loader', async () => {
      service.configure({
        defaultLocale: 'en',
        supportedLocales: ['en', 'ja'],
        loadTranslations: async (locale, _namespace): Promise<Record<string, string>> => {
          if (locale === 'ja') {
            return { greeting: 'こんにちは、{{name}}！' };
          }
          return {};
        },
      });

      await service.loadTranslations('ja');
      service.setLocale('ja');
      expect(service.t('greeting', { name: 'World' })).toBe('こんにちは、World！');
    });
  });

  describe('configure()', () => {
    it('should update locale settings', () => {
      service.configure({
        defaultLocale: 'fr',
        supportedLocales: ['fr', 'de'],
      });
      expect(service.getLocale()).toBe('fr');
      expect(service.getSupportedLocales()).toEqual(['fr', 'de']);
    });
  });
});

// ── Interpolation Tests ──────────────────────────────────────────────────────

describe('interpolate()', () => {
  it('should replace {{param}} placeholders', () => {
    expect(interpolate('Hello, {{name}}!', { name: 'World' })).toBe('Hello, World!');
  });

  it('should handle multiple placeholders', () => {
    expect(
      interpolate('{{first}} {{last}}', { first: 'John', last: 'Doe' }),
    ).toBe('John Doe');
  });

  it('should leave unknown placeholders intact', () => {
    expect(interpolate('Hello, {{name}}!', {})).toBe('Hello, {{name}}!');
  });

  it('should return template as-is when no params', () => {
    expect(interpolate('Hello, World!')).toBe('Hello, World!');
  });

  it('should handle numeric values', () => {
    expect(interpolate('Count: {{n}}', { n: 42 })).toBe('Count: 42');
  });

  it('should handle null/undefined param values by keeping placeholder', () => {
    expect(interpolate('{{a}} and {{b}}', { a: null, b: undefined })).toBe(
      '{{a}} and {{b}}',
    );
  });
});

// ── Pluralization Tests ──────────────────────────────────────────────────────

describe('pluralize()', () => {
  it('should handle ICU plural format — one', () => {
    expect(pluralize('{count, plural, one {# item} other {# items}}', 1)).toBe('1 item');
  });

  it('should handle ICU plural format — other', () => {
    expect(pluralize('{count, plural, one {# item} other {# items}}', 5)).toBe('5 items');
  });

  it('should handle ICU plural format — zero with =0', () => {
    expect(
      pluralize('{count, plural, =0 {no items} one {# item} other {# items}}', 0),
    ).toBe('no items');
  });

  it('should handle pipe-delimited — singular', () => {
    expect(pluralize('cat|cats', 1)).toBe('cat');
  });

  it('should handle pipe-delimited — plural', () => {
    expect(pluralize('cat|cats', 3)).toBe('cats');
  });

  it('should return interpolated plain string', () => {
    expect(pluralize('You have {{count}} items', 7)).toBe('You have 7 items');
  });

  it('should pass additional params through', () => {
    expect(
      pluralize('{{name}} has {{count}} items', 3, { name: 'Alice' }),
    ).toBe('Alice has 3 items');
  });
});

// ── TranslationLoader Tests ─────────────────────────────────────────────────

describe('TranslationLoader', () => {
  let loader: TranslationLoader;

  beforeEach(() => {
    loader = new TranslationLoader();
  });

  it('should store and retrieve static translations', () => {
    loader.addStaticTranslations('en', { hello: 'Hello' });
    expect(loader.getTranslations('en')).toEqual({ hello: 'Hello' });
  });

  it('should merge static translations for the same locale', () => {
    loader.addStaticTranslations('en', { hello: 'Hello' });
    loader.addStaticTranslations('en', { bye: 'Goodbye' });
    expect(loader.getTranslations('en')).toEqual({ hello: 'Hello', bye: 'Goodbye' });
  });

  it('should resolve flat keys', () => {
    const result = loader.resolveKey({ greeting: 'Hi' }, 'greeting');
    expect(result).toBe('Hi');
  });

  it('should resolve dotted keys', () => {
    const result = loader.resolveKey(
      { auth: { login: 'Log In' } },
      'auth.login',
    );
    expect(result).toBe('Log In');
  });

  it('should return undefined for missing keys', () => {
    expect(loader.resolveKey({ a: 'b' }, 'c')).toBeUndefined();
  });

  it('should return undefined for partially matching dotted keys', () => {
    expect(
      loader.resolveKey({ auth: { login: 'Log In' } }, 'auth.signup'),
    ).toBeUndefined();
  });

  it('should load translations via dynamic loader', async () => {
    loader.setDynamicLoader(async (locale): Promise<Record<string, string>> => {
      if (locale === 'ja') {
        return { hello: 'こんにちは' };
      }
      return {};
    });

    const translations = await loader.load('ja');
    expect(translations).toEqual({ hello: 'こんにちは' });
  });

  it('should cache dynamically loaded translations', async () => {
    const loaderFn = vi.fn(async () => ({ hello: 'Hi' }));
    loader.setDynamicLoader(loaderFn);

    await loader.load('en');
    await loader.load('en');

    expect(loaderFn).toHaveBeenCalledTimes(1);
  });

  it('should clear cache', () => {
    loader.addStaticTranslations('en', { hello: 'Hello' });
    loader.clearCache();
    // Static translations are still in staticTranslations, but cache is cleared
    // getTranslations falls back to staticTranslations
    expect(loader.getTranslations('en')).toEqual({ hello: 'Hello' });
  });
});

// ── detectLocaleFromRequest Tests ────────────────────────────────────────────

describe('detectLocaleFromRequest()', () => {
  const supported = ['en', 'es', 'fr', 'de'];
  const defaultLocale = 'en';

  it('should detect locale from ?lang= query parameter', () => {
    const request = createRequest('http://localhost/?lang=es');
    expect(detectLocaleFromRequest(request, supported, defaultLocale)).toBe('es');
  });

  it('should detect locale from x-locale header', () => {
    const request = createRequest('http://localhost/', {
      'x-locale': 'fr',
    });
    expect(detectLocaleFromRequest(request, supported, defaultLocale)).toBe('fr');
  });

  it('should detect locale from Accept-Language header', () => {
    const request = createRequest('http://localhost/', {
      'accept-language': 'de-DE,de;q=0.9,en;q=0.8',
    });
    expect(detectLocaleFromRequest(request, supported, defaultLocale)).toBe('de');
  });

  it('should fall back to default locale when no match', () => {
    const request = createRequest('http://localhost/', {
      'accept-language': 'ja,zh;q=0.9',
    });
    expect(detectLocaleFromRequest(request, supported, defaultLocale)).toBe('en');
  });

  it('should prefer query param over headers', () => {
    const request = createRequest('http://localhost/?lang=fr', {
      'x-locale': 'de',
      'accept-language': 'es',
    });
    expect(detectLocaleFromRequest(request, supported, defaultLocale)).toBe('fr');
  });

  it('should prefer x-locale header over Accept-Language', () => {
    const request = createRequest('http://localhost/', {
      'x-locale': 'de',
      'accept-language': 'es',
    });
    expect(detectLocaleFromRequest(request, supported, defaultLocale)).toBe('de');
  });

  it('should handle case-insensitive locale matching', () => {
    const request = createRequest('http://localhost/?lang=ES');
    expect(detectLocaleFromRequest(request, supported, defaultLocale)).toBe('es');
  });

  it('should match language prefix from Accept-Language (e.g., en-US -> en)', () => {
    const request = createRequest('http://localhost/', {
      'accept-language': 'en-US',
    });
    expect(detectLocaleFromRequest(request, supported, defaultLocale)).toBe('en');
  });

  it('should ignore unsupported locales in query param', () => {
    const request = createRequest('http://localhost/?lang=ja');
    expect(detectLocaleFromRequest(request, supported, defaultLocale)).toBe('en');
  });
});

// ── I18nFormatter Tests ──────────────────────────────────────────────────────

describe('I18nFormatter', () => {
  const formatter = new I18nFormatter();

  describe('formatDate()', () => {
    it('should produce a localized date string', () => {
      const date = new Date('2026-03-15T12:00:00Z');
      const result = formatter.formatDate(date, 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });
      expect(result).toContain('March');
      expect(result).toContain('15');
      expect(result).toContain('2026');
    });

    it('should accept an ISO string', () => {
      const result = formatter.formatDate('2026-03-15T00:00:00Z', 'en-US');
      expect(result).toContain('March');
    });

    it('should accept custom options', () => {
      const date = new Date('2026-03-15T00:00:00Z');
      const result = formatter.formatDate(date, 'en-US', {
        year: 'numeric',
        month: 'short',
      });
      expect(result).toContain('Mar');
    });
  });

  describe('formatNumber()', () => {
    it('should format numbers according to locale', () => {
      const result = formatter.formatNumber(1234567.89, 'en-US');
      expect(result).toBe('1,234,567.89');
    });

    it('should format with custom options', () => {
      const result = formatter.formatNumber(0.75, 'en-US', {
        style: 'percent',
      });
      expect(result).toBe('75%');
    });
  });

  describe('formatCurrency()', () => {
    it('should format currency correctly for USD', () => {
      const result = formatter.formatCurrency(42.5, 'USD', 'en-US');
      expect(result).toBe('$42.50');
    });

    it('should format currency for EUR in German locale', () => {
      const result = formatter.formatCurrency(42.5, 'EUR', 'de-DE');
      // German formatting: "42,50 €" (with non-breaking space variants)
      expect(result).toContain('42,50');
      expect(result).toContain('€');
    });
  });

  describe('formatRelativeTime()', () => {
    it('should format a past date as relative time', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = formatter.formatRelativeTime(twoHoursAgo, 'en');
      expect(result).toContain('2');
      expect(result).toContain('hour');
    });

    it('should format a future date as relative time', () => {
      const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const result = formatter.formatRelativeTime(inThreeDays, 'en');
      expect(result).toContain('3');
      expect(result).toContain('day');
    });
  });

  describe('formatList()', () => {
    it('should format a conjunction list', () => {
      const result = formatter.formatList(['apples', 'oranges', 'bananas'], 'en');
      expect(result).toBe('apples, oranges, and bananas');
    });

    it('should format a disjunction list', () => {
      const result = formatter.formatList(['red', 'blue', 'green'], 'en', 'disjunction');
      expect(result).toBe('red, blue, or green');
    });

    it('should handle single item', () => {
      const result = formatter.formatList(['apples'], 'en');
      expect(result).toBe('apples');
    });

    it('should handle two items', () => {
      const result = formatter.formatList(['apples', 'oranges'], 'en');
      expect(result).toBe('apples and oranges');
    });
  });
});
