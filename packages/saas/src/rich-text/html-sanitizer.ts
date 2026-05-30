/**
 * HTML Sanitizer
 *
 * Pure string-based HTML sanitizer for Cloudflare Workers (no DOM APIs).
 * Uses regex-based tag/attribute allowlisting to strip dangerous content.
 */

import { ALLOWED_HTML_TAGS } from './rich-text.types';

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedSchemes?: string[]; // for href/src: ['http', 'https', 'mailto']
}

/**
 * Default allowed attributes per tag.
 * Only these attributes survive sanitization.
 */
const DEFAULT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height', 'title'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
  span: ['class', 'data-mention-id', 'data-mention-type'],
  div: ['class'],
  pre: ['class'],
  code: ['class'],
  figure: ['class'],
  blockquote: ['class'],
};

const DEFAULT_ALLOWED_SCHEMES = ['http', 'https', 'mailto'];

// Regex to match HTML tags (opening, closing, self-closing)
const TAG_REGEX = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)\/?\s*>/g;

// Regex to match individual attributes within a tag
const ATTR_REGEX = /([a-zA-Z][a-zA-Z0-9\-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g;

// Regex to match HTML comments
const COMMENT_REGEX = /<!--[\s\S]*?-->/g;

// Regex to match CDATA sections
const CDATA_REGEX = /<!\[CDATA\[[\s\S]*?\]\]>/g;

// Regex to match processing instructions
const PI_REGEX = /<\?[\s\S]*?\?>/g;

// Regex to match DOCTYPE
const DOCTYPE_REGEX = /<!DOCTYPE[^>]*>/gi;

export class HtmlSanitizer {
  /**
   * Strip disallowed tags and attributes from HTML.
   * Removes script tags, event handlers, and javascript: URIs.
   */
  static sanitize(html: string, options?: SanitizeOptions): string {
    const allowedTags = new Set(options?.allowedTags ?? (ALLOWED_HTML_TAGS as unknown as string[]));
    const allowedAttributes = options?.allowedAttributes ?? DEFAULT_ALLOWED_ATTRIBUTES;
    const allowedSchemes = options?.allowedSchemes ?? DEFAULT_ALLOWED_SCHEMES;

    let result = html;

    // Remove comments, CDATA, processing instructions, and DOCTYPE
    result = result.replace(COMMENT_REGEX, '');
    result = result.replace(CDATA_REGEX, '');
    result = result.replace(PI_REGEX, '');
    result = result.replace(DOCTYPE_REGEX, '');

    // Remove script and style tags and their content entirely
    result = result.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
    result = result.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '');

    // Process remaining tags
    result = result.replace(TAG_REGEX, (match, tagName: string, attrsStr: string) => {
      const tag = tagName.toLowerCase();
      const isClosing = match.startsWith('</');
      const isSelfClosing = match.endsWith('/>') || ['br', 'hr', 'img'].includes(tag);

      // Strip disallowed tags entirely
      if (!allowedTags.has(tag)) {
        return '';
      }

      // For closing tags, return clean closing tag
      if (isClosing) {
        return `</${tag}>`;
      }

      // Parse and filter attributes
      const tagAllowedAttrs = new Set(allowedAttributes[tag] ?? []);
      const cleanAttrs: string[] = [];

      let attrMatch: RegExpExecArray | null;
      ATTR_REGEX.lastIndex = 0;
      while ((attrMatch = ATTR_REGEX.exec(attrsStr)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

        // Skip event handlers (on*)
        if (attrName.startsWith('on')) {
          continue;
        }

        // Skip style attribute (potential XSS vector)
        if (attrName === 'style') {
          continue;
        }

        // Only allow whitelisted attributes for this tag
        if (!tagAllowedAttrs.has(attrName)) {
          continue;
        }

        // Validate URL attributes
        if (attrName === 'href' || attrName === 'src') {
          if (!HtmlSanitizer.isAllowedUrl(attrValue, allowedSchemes)) {
            continue;
          }
        }

        cleanAttrs.push(`${attrName}="${HtmlSanitizer.escapeAttrValue(attrValue)}"`);
      }

      const attrsString = cleanAttrs.length > 0 ? ' ' + cleanAttrs.join(' ') : '';

      if (isSelfClosing) {
        return `<${tag}${attrsString} />`;
      }

      return `<${tag}${attrsString}>`;
    });

    return result;
  }

  /**
   * Extract plain text from HTML by stripping all tags.
   */
  static extractText(html: string): string {
    let text = html;

    // Replace block-level elements with newlines
    text = text.replace(/<\/?(p|div|h[1-6]|li|br|tr|blockquote|hr|pre)\b[^>]*\/?>/gi, '\n');

    // Strip all remaining tags
    text = text.replace(/<[^>]+>/g, '');

    // Decode common HTML entities
    text = HtmlSanitizer.decodeEntities(text);

    // Normalize whitespace
    text = text.replace(/[ \t]+/g, ' ');
    text = text.replace(/\n\s*\n/g, '\n');
    text = text.trim();

    return text;
  }

  /**
   * Check if HTML is empty (only whitespace/empty tags).
   */
  static isEmpty(html: string): boolean {
    if (!html) return true;

    const text = HtmlSanitizer.extractText(html);
    return text.trim().length === 0;
  }

  /** Default allowed attributes per tag. */
  static readonly DEFAULT_ALLOWED_ATTRIBUTES = DEFAULT_ALLOWED_ATTRIBUTES;

  // ── Private Helpers ─────────────────────────────────────────────────

  private static isAllowedUrl(url: string, allowedSchemes: string[]): boolean {
    const trimmed = url.trim().toLowerCase();

    // Block javascript:, data:, vbscript: URIs
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('vbscript:') || trimmed.startsWith('data:')) {
      return false;
    }

    // Allow relative URLs
    if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('?')) {
      return true;
    }

    // Check scheme
    const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+\-.]*?):/);
    if (schemeMatch) {
      return allowedSchemes.includes(schemeMatch[1].toLowerCase());
    }

    // No scheme = relative URL, allow it
    return true;
  }

  private static escapeAttrValue(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private static decodeEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(parseInt(code, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => String.fromCharCode(parseInt(code, 16)));
  }
}
