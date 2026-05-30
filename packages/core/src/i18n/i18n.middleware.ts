/**
 * i18n Middleware
 *
 * Locale detection from incoming requests.
 * Detection chain: ?lang= query param -> x-locale header -> Accept-Language header -> defaultLocale
 */

/**
 * Detect the preferred locale from a Request object.
 *
 * Priority:
 * 1. `?lang=` query parameter
 * 2. `x-locale` request header
 * 3. `Accept-Language` header (best match against supported locales)
 * 4. defaultLocale fallback
 *
 * @param request - The incoming Request
 * @param supportedLocales - Array of supported locale codes (e.g., ['en', 'es', 'fr'])
 * @param defaultLocale - Fallback locale if no match found
 */
export function detectLocaleFromRequest(
  request: Request,
  supportedLocales: string[],
  defaultLocale: string,
): string {
  // 1. Query parameter: ?lang=es
  const url = new URL(request.url);
  const langParam = url.searchParams.get('lang');
  if (langParam && isSupported(langParam, supportedLocales)) {
    return normalizeLocale(langParam, supportedLocales);
  }

  // 2. x-locale header
  const localeHeader = request.headers.get('x-locale');
  if (localeHeader && isSupported(localeHeader, supportedLocales)) {
    return normalizeLocale(localeHeader, supportedLocales);
  }

  // 3. Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const match = matchAcceptLanguage(acceptLanguage, supportedLocales);
    if (match) {
      return match;
    }
  }

  // 4. Default
  return defaultLocale;
}

/**
 * Parse the Accept-Language header and find the best matching supported locale.
 *
 * Handles formats like:
 * - "en-US,en;q=0.9,es;q=0.8"
 * - "fr"
 * - "*"
 */
function matchAcceptLanguage(
  header: string,
  supportedLocales: string[],
): string | null {
  const entries = header
    .split(',')
    .map((entry) => {
      const parts = entry.trim().split(';');
      const locale = parts[0].trim();
      const qMatch = parts[1]?.match(/q=([\d.]+)/);
      const quality = qMatch ? parseFloat(qMatch[1]) : 1.0;
      return { locale, quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { locale } of entries) {
    if (locale === '*') {
      continue;
    }

    // Try exact match first
    if (isSupported(locale, supportedLocales)) {
      return normalizeLocale(locale, supportedLocales);
    }

    // Try language-only match (e.g., "en-US" -> "en")
    const lang = locale.split('-')[0];
    if (isSupported(lang, supportedLocales)) {
      return normalizeLocale(lang, supportedLocales);
    }
  }

  return null;
}

/**
 * Check if a locale (case-insensitive) matches any supported locale.
 */
function isSupported(locale: string, supportedLocales: string[]): boolean {
  const lower = locale.toLowerCase();
  return supportedLocales.some((s) => s.toLowerCase() === lower);
}

/**
 * Return the canonical form of a supported locale (preserving original casing).
 */
function normalizeLocale(locale: string, supportedLocales: string[]): string {
  const lower = locale.toLowerCase();
  return supportedLocales.find((s) => s.toLowerCase() === lower) ?? locale;
}
