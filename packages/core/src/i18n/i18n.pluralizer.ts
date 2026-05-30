/**
 * i18n Pluralizer
 *
 * Provides ICU-style pluralization support and parameter interpolation.
 * Uses {{name}} syntax for interpolation.
 *
 * Supported patterns:
 * - Simple: "You have {{count}} message" / "You have {{count}} messages"
 * - ICU-like: "{count, plural, one {# message} other {# messages}}"
 * - Pipe-delimited: "message|messages" (picks by count === 1)
 */

/**
 * Interpolate {{param}} placeholders in a string with provided values.
 */
export function interpolate(template: string, params?: Record<string, unknown>): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = params[key];
    if (value === undefined || value === null) {
      return `{{${key}}}`;
    }
    return String(value);
  });
}

/**
 * Parse and resolve an ICU-style plural expression.
 *
 * Format: "{count, plural, zero {no messages} one {# message} other {# messages}}"
 *
 * Supported categories: zero, one, two, few, many, other
 * The '#' symbol is replaced with the count value.
 */
function resolveIcuPlural(template: string, count: number): string | null {
  // Match: {varName, plural, ...rules}
  const icuMatch = template.match(/^\{(\w+),\s*plural,\s*(.+)\}$/s);
  if (!icuMatch) {
    return null;
  }

  const rulesStr = icuMatch[2];
  const category = getPluralCategory(count);

  // Parse rules: "one {# message} other {# messages}"
  const rules = parseIcuRules(rulesStr);

  // Try exact match first (e.g., "=0", "=1")
  const exactKey = `=${count}`;
  if (rules.has(exactKey)) {
    return rules.get(exactKey)!.replace(/#/g, String(count));
  }

  // Try category match
  if (rules.has(category)) {
    return rules.get(category)!.replace(/#/g, String(count));
  }

  // Fall back to "other"
  if (rules.has('other')) {
    return rules.get('other')!.replace(/#/g, String(count));
  }

  return null;
}

/**
 * Parse ICU plural rules string into a map of category -> template.
 */
function parseIcuRules(rulesStr: string): Map<string, string> {
  const rules = new Map<string, string>();
  // Match patterns like: one {# message} other {# messages} =0 {no messages}
  const ruleRegex = /(\w+|=\d+)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = ruleRegex.exec(rulesStr)) !== null) {
    rules.set(match[1], match[2]);
  }

  return rules;
}

/**
 * Get the CLDR plural category for a count using the Intl.PluralRules API.
 * Falls back to a simple English rule (one vs other) if Intl is unavailable.
 */
function getPluralCategory(count: number): string {
  if (typeof Intl !== 'undefined' && Intl.PluralRules) {
    const rules = new Intl.PluralRules('en');
    return rules.select(count);
  }

  // Simple fallback
  return count === 1 ? 'one' : 'other';
}

/**
 * Pluralize a template string based on a count.
 *
 * Supports three formats:
 * 1. ICU: "{count, plural, one {# item} other {# items}}"
 * 2. Pipe-delimited: "item|items" — picks first for count===1, second otherwise
 * 3. Plain string: returned as-is after interpolation
 *
 * After pluralization, {{param}} placeholders are interpolated.
 * The {{count}} param is automatically available.
 */
export function pluralize(
  template: string,
  count: number,
  params?: Record<string, unknown>,
): string {
  const mergedParams = { count, ...params };

  // Try ICU format first
  const icuResult = resolveIcuPlural(template, count);
  if (icuResult !== null) {
    return interpolate(icuResult, mergedParams);
  }

  // Try pipe-delimited format: "item|items"
  if (template.includes('|') && !template.includes('{{')) {
    const parts = template.split('|');
    if (parts.length === 2) {
      const selected = count === 1 ? parts[0] : parts[1];
      return interpolate(selected, mergedParams);
    }
  }

  // Plain string — just interpolate
  return interpolate(template, mergedParams);
}
