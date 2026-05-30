/**
 * Flash Service
 *
 * Cookie-based flash message system. Flash messages survive exactly
 * one redirect cycle: set in an action/loader, read in the next loader,
 * then automatically cleared.
 *
 * Usage in actions:
 * ```typescript
 * const flash = container.resolve(FlashService);
 * flash.init(request);
 * flash.success('Item created successfully');
 * return redirect('/items', { headers: flash.headers() });
 * ```
 *
 * Usage in loaders:
 * ```typescript
 * const flash = container.resolve(FlashService);
 * flash.init(request);
 * const messages = flash.consume();
 * return { items, flash: messages };
 * ```
 */

import { Injectable } from '../di';
import type { FlashLevel, FlashMessage } from './flash.types';
import { FLASH_COOKIE_NAME } from './flash.types';

@Injectable()
export class FlashService {
  private pending: FlashMessage[] = [];
  private consumed = false;
  private incoming: FlashMessage[] = [];

  /**
   * Initialize the service with the current request.
   * Must be called before any other method.
   */
  init(request: Request): void {
    this.pending = [];
    this.consumed = false;
    this.incoming = this.readCookie(request);
  }

  // ── Set Methods ──────────────────────────────────────────────────────

  /** Queue a flash message at a given level. */
  flash(level: FlashLevel, message: string, title?: string): void {
    this.pending.push({ level, message, ...(title ? { title } : {}) });
  }

  /** Queue a success flash message. */
  success(message: string, title?: string): void {
    this.flash('success', message, title);
  }

  /** Queue an error flash message. */
  error(message: string, title?: string): void {
    this.flash('error', message, title);
  }

  /** Queue a warning flash message. */
  warning(message: string, title?: string): void {
    this.flash('warning', message, title);
  }

  /** Queue an info flash message. */
  info(message: string, title?: string): void {
    this.flash('info', message, title);
  }

  // ── Read Methods ─────────────────────────────────────────────────────

  /**
   * Consume all flash messages from the incoming request.
   * Returns the messages and marks them for clearing on the next response.
   * Subsequent calls return an empty array.
   */
  consume(): FlashMessage[] {
    if (this.consumed) {
      return [];
    }
    this.consumed = true;
    return this.incoming;
  }

  /**
   * Peek at flash messages without consuming them.
   * They will still be available on the next request if not consumed.
   */
  peek(): FlashMessage[] {
    return [...this.incoming];
  }

  // ── Response Headers ─────────────────────────────────────────────────

  /**
   * Build a `Headers` object containing the `Set-Cookie` header(s)
   * needed to persist pending flash messages or clear consumed ones.
   *
   * Call this and merge into any `Response` or `redirect()`:
   * ```typescript
   * return redirect('/next', { headers: flash.headers() });
   * ```
   */
  headers(): Headers {
    const headers = new Headers();

    if (this.pending.length > 0) {
      // Write new flash messages into cookie
      const encoded = this.encodeCookie(this.pending);
      headers.append(
        'Set-Cookie',
        `${FLASH_COOKIE_NAME}=${encoded}; Path=/; HttpOnly; SameSite=Lax; Max-Age=120`,
      );
    } else if (this.consumed && this.incoming.length > 0) {
      // Clear the cookie after consuming
      headers.append(
        'Set-Cookie',
        `${FLASH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      );
    }

    return headers;
  }

  /**
   * Return a plain `Record<string, string>` for use with `redirect()` or
   * `Response` constructors that don't accept a `Headers` instance.
   */
  headerRecord(): Record<string, string> {
    const h = this.headers();
    const cookie = h.get('Set-Cookie');
    if (cookie) {
      return { 'Set-Cookie': cookie };
    }
    return {};
  }

  // ── Private Helpers ──────────────────────────────────────────────────

  private readCookie(request: Request): FlashMessage[] {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      return [];
    }

    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const flashCookie = cookies.find((c) =>
      c.startsWith(`${FLASH_COOKIE_NAME}=`),
    );

    if (!flashCookie) {
      return [];
    }

    const value = flashCookie.substring(FLASH_COOKIE_NAME.length + 1);
    return this.decodeCookie(value);
  }

  private encodeCookie(messages: FlashMessage[]): string {
    try {
      const json = JSON.stringify(messages);
      return encodeURIComponent(btoa(json));
    } catch {
      return '';
    }
  }

  private decodeCookie(value: string): FlashMessage[] {
    try {
      const json = atob(decodeURIComponent(value));
      const parsed = JSON.parse(json);

      if (!Array.isArray(parsed)) {
        return [];
      }

      // Validate each message has the required shape
      return parsed.filter(
        (m: unknown): m is FlashMessage =>
          typeof m === 'object' &&
          m !== null &&
          'level' in m &&
          'message' in m &&
          typeof (m as FlashMessage).level === 'string' &&
          typeof (m as FlashMessage).message === 'string' &&
          ['success', 'error', 'warning', 'info'].includes(
            (m as FlashMessage).level,
          ),
      );
    } catch {
      return [];
    }
  }
}
