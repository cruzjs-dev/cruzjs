import { describe, it, expect, beforeEach } from 'vitest';
import { FlashService } from '../flash.service';
import { FLASH_COOKIE_NAME } from '../flash.types';
import type { FlashMessage } from '../flash.types';

function buildRequest(cookies?: string): Request {
  const headers = new Headers();
  if (cookies) {
    headers.set('cookie', cookies);
  }
  return new Request('http://localhost/', { headers });
}

function encodeCookie(messages: FlashMessage[]): string {
  return encodeURIComponent(btoa(JSON.stringify(messages)));
}

describe('FlashService', () => {
  let service: FlashService;

  beforeEach(() => {
    service = new FlashService();
  });

  describe('flash()', () => {
    it('sets a flash message and produces a Set-Cookie header', () => {
      service.init(buildRequest());
      service.flash('success', 'Item created');

      const headers = service.headers();
      const cookie = headers.get('Set-Cookie');

      expect(cookie).toBeTruthy();
      expect(cookie).toContain(FLASH_COOKIE_NAME);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
    });

    it('supports optional title', () => {
      service.init(buildRequest());
      service.flash('info', 'Check your email', 'Verification sent');

      const headers = service.headers();
      const cookie = headers.get('Set-Cookie')!;

      // Decode the cookie value to verify title is included
      const match = cookie.match(new RegExp(`${FLASH_COOKIE_NAME}=([^;]+)`));
      expect(match).toBeTruthy();

      const decoded = JSON.parse(atob(decodeURIComponent(match![1])));
      expect(decoded).toEqual([
        { level: 'info', message: 'Check your email', title: 'Verification sent' },
      ]);
    });
  });

  describe('convenience methods', () => {
    it('success() sets level to success', () => {
      service.init(buildRequest());
      service.success('Done');

      const cookie = service.headers().get('Set-Cookie')!;
      const match = cookie.match(new RegExp(`${FLASH_COOKIE_NAME}=([^;]+)`));
      const decoded = JSON.parse(atob(decodeURIComponent(match![1])));
      expect(decoded[0].level).toBe('success');
    });

    it('error() sets level to error', () => {
      service.init(buildRequest());
      service.error('Failed');

      const cookie = service.headers().get('Set-Cookie')!;
      const match = cookie.match(new RegExp(`${FLASH_COOKIE_NAME}=([^;]+)`));
      const decoded = JSON.parse(atob(decodeURIComponent(match![1])));
      expect(decoded[0].level).toBe('error');
    });

    it('warning() sets level to warning', () => {
      service.init(buildRequest());
      service.warning('Careful');

      const cookie = service.headers().get('Set-Cookie')!;
      const match = cookie.match(new RegExp(`${FLASH_COOKIE_NAME}=([^;]+)`));
      const decoded = JSON.parse(atob(decodeURIComponent(match![1])));
      expect(decoded[0].level).toBe('warning');
    });

    it('info() sets level to info', () => {
      service.init(buildRequest());
      service.info('FYI');

      const cookie = service.headers().get('Set-Cookie')!;
      const match = cookie.match(new RegExp(`${FLASH_COOKIE_NAME}=([^;]+)`));
      const decoded = JSON.parse(atob(decodeURIComponent(match![1])));
      expect(decoded[0].level).toBe('info');
    });
  });

  describe('consume()', () => {
    it('reads flash messages from the request cookie', () => {
      const messages: FlashMessage[] = [
        { level: 'success', message: 'Created' },
        { level: 'error', message: 'Oops' },
      ];
      const cookie = `${FLASH_COOKIE_NAME}=${encodeCookie(messages)}`;

      service.init(buildRequest(cookie));
      const result = service.consume();

      expect(result).toEqual(messages);
    });

    it('returns empty array when no flash cookie exists', () => {
      service.init(buildRequest());
      const result = service.consume();

      expect(result).toEqual([]);
    });

    it('returns empty array on second call (consumed)', () => {
      const messages: FlashMessage[] = [{ level: 'info', message: 'Hello' }];
      const cookie = `${FLASH_COOKIE_NAME}=${encodeCookie(messages)}`;

      service.init(buildRequest(cookie));
      service.consume();
      const second = service.consume();

      expect(second).toEqual([]);
    });

    it('produces a clearing Set-Cookie header after consuming', () => {
      const messages: FlashMessage[] = [{ level: 'info', message: 'Hello' }];
      const cookie = `${FLASH_COOKIE_NAME}=${encodeCookie(messages)}`;

      service.init(buildRequest(cookie));
      service.consume();

      const headers = service.headers();
      const setCookie = headers.get('Set-Cookie');

      expect(setCookie).toContain('Max-Age=0');
    });
  });

  describe('peek()', () => {
    it('reads flash messages without consuming them', () => {
      const messages: FlashMessage[] = [{ level: 'info', message: 'Peeked' }];
      const cookie = `${FLASH_COOKIE_NAME}=${encodeCookie(messages)}`;

      service.init(buildRequest(cookie));

      expect(service.peek()).toEqual(messages);
      // Should still be consumable
      expect(service.consume()).toEqual(messages);
    });

    it('returns a copy, not a reference', () => {
      const messages: FlashMessage[] = [{ level: 'info', message: 'Peeked' }];
      const cookie = `${FLASH_COOKIE_NAME}=${encodeCookie(messages)}`;

      service.init(buildRequest(cookie));

      const peeked = service.peek();
      peeked.push({ level: 'error', message: 'Added' });

      // Original should be unchanged
      expect(service.peek()).toEqual(messages);
    });
  });

  describe('headers()', () => {
    it('returns empty headers when no flash set and nothing consumed', () => {
      service.init(buildRequest());
      const headers = service.headers();

      expect(headers.get('Set-Cookie')).toBeNull();
    });

    it('includes Max-Age=120 when setting flash messages', () => {
      service.init(buildRequest());
      service.success('Done');

      const cookie = service.headers().get('Set-Cookie')!;
      expect(cookie).toContain('Max-Age=120');
    });
  });

  describe('headerRecord()', () => {
    it('returns a plain object with Set-Cookie', () => {
      service.init(buildRequest());
      service.success('Done');

      const record = service.headerRecord();
      expect(record).toHaveProperty('Set-Cookie');
      expect(typeof record['Set-Cookie']).toBe('string');
    });

    it('returns empty object when no headers needed', () => {
      service.init(buildRequest());
      const record = service.headerRecord();

      expect(record).toEqual({});
    });
  });

  describe('multiple flash messages', () => {
    it('accumulates multiple messages in one cookie', () => {
      service.init(buildRequest());
      service.success('Created');
      service.info('Email sent');
      service.warning('Rate limit approaching');

      const cookie = service.headers().get('Set-Cookie')!;
      const match = cookie.match(new RegExp(`${FLASH_COOKIE_NAME}=([^;]+)`));
      const decoded = JSON.parse(atob(decodeURIComponent(match![1])));

      expect(decoded).toHaveLength(3);
      expect(decoded[0].level).toBe('success');
      expect(decoded[1].level).toBe('info');
      expect(decoded[2].level).toBe('warning');
    });
  });

  describe('cookie parsing resilience', () => {
    it('handles malformed cookie values gracefully', () => {
      const cookie = `${FLASH_COOKIE_NAME}=not-valid-base64!!!`;

      service.init(buildRequest(cookie));
      const result = service.consume();

      expect(result).toEqual([]);
    });

    it('handles cookie with other cookies present', () => {
      const messages: FlashMessage[] = [{ level: 'success', message: 'OK' }];
      const cookie = `session=abc123; ${FLASH_COOKIE_NAME}=${encodeCookie(messages)}; theme=dark`;

      service.init(buildRequest(cookie));
      const result = service.consume();

      expect(result).toEqual(messages);
    });

    it('filters out invalid flash message shapes', () => {
      const invalid = [
        { level: 'success', message: 'Valid' },
        { level: 'invalid-level', message: 'Bad level' },
        { noLevel: true },
        'not an object',
      ];
      const cookie = `${FLASH_COOKIE_NAME}=${encodeURIComponent(btoa(JSON.stringify(invalid)))}`;

      service.init(buildRequest(cookie));
      const result = service.consume();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ level: 'success', message: 'Valid' });
    });
  });

  describe('init() resets state', () => {
    it('clears pending messages on re-init', () => {
      service.init(buildRequest());
      service.success('First');

      // Re-init with a new request
      service.init(buildRequest());
      const headers = service.headers();

      expect(headers.get('Set-Cookie')).toBeNull();
    });
  });
});
