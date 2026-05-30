/**
 * Rate Limiting Unit Tests
 *
 * Tests for sliding window, fixed window, named limiters,
 * key extraction, and tRPC middleware behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SlidingWindowRateLimitAdapter } from '../algorithms/sliding-window';
import { FixedWindowRateLimitAdapter } from '../algorithms/fixed-window';
import { RateLimitService } from '../rate-limit.service';
import { rateLimitMiddleware, rateLimitHeaders } from '../rate-limit.middleware';
import { TRPCError } from '@trpc/server';

// ─── Sliding Window ──────────────────────────────────────────────────────────

describe('SlidingWindowRateLimitAdapter', () => {
  let adapter: SlidingWindowRateLimitAdapter;

  beforeEach(() => {
    adapter = new SlidingWindowRateLimitAdapter();
  });

  it('should allow requests within limit', async () => {
    const result1 = await adapter.hit('test-key', 3, 60);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);
    expect(result1.limit).toBe(3);

    const result2 = await adapter.hit('test-key', 3, 60);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = await adapter.hit('test-key', 3, 60);
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it('should block after limit is exceeded', async () => {
    await adapter.hit('test-key', 2, 60);
    await adapter.hit('test-key', 2, 60);

    const result = await adapter.hit('test-key', 2, 60);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should track separate keys independently', async () => {
    await adapter.hit('key-a', 1, 60);
    const resultA = await adapter.hit('key-a', 1, 60);
    expect(resultA.allowed).toBe(false);

    const resultB = await adapter.hit('key-b', 1, 60);
    expect(resultB.allowed).toBe(true);
  });

  it('should reset a key', async () => {
    await adapter.hit('test-key', 1, 60);
    const blocked = await adapter.hit('test-key', 1, 60);
    expect(blocked.allowed).toBe(false);

    await adapter.reset('test-key');
    const afterReset = await adapter.hit('test-key', 1, 60);
    expect(afterReset.allowed).toBe(true);
  });

  it('should report correct remaining count without hit', async () => {
    const remaining1 = await adapter.getRemaining('test-key', 5, 60);
    expect(remaining1).toBe(5);

    await adapter.hit('test-key', 5, 60);
    await adapter.hit('test-key', 5, 60);

    const remaining2 = await adapter.getRemaining('test-key', 5, 60);
    expect(remaining2).toBe(3);
  });

  it('should allow requests after window expires', async () => {
    // Use a very short window (1ms effectively)
    await adapter.hit('test-key', 1, 0);
    // With a 0-second window, timestamps are immediately stale
    const result = await adapter.hit('test-key', 1, 0);
    // The 0-second window means all timestamps are outside the window
    expect(result.allowed).toBe(true);
  });
});

// ─── Fixed Window ────────────────────────────────────────────────────────────

describe('FixedWindowRateLimitAdapter', () => {
  let adapter: FixedWindowRateLimitAdapter;

  beforeEach(() => {
    adapter = new FixedWindowRateLimitAdapter();
  });

  it('should allow requests within limit', async () => {
    const result = await adapter.hit('test-key', 5, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
  });

  it('should block after limit is exceeded', async () => {
    await adapter.hit('test-key', 2, 60);
    await adapter.hit('test-key', 2, 60);

    const result = await adapter.hit('test-key', 2, 60);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should reset after window expires', async () => {
    // Hit with a 0-second window (window expires immediately)
    await adapter.hit('test-key', 1, 0);
    // Wait a tick for the window to expire
    await new Promise((r) => setTimeout(r, 5));
    const result = await adapter.hit('test-key', 1, 0);
    expect(result.allowed).toBe(true);
  });

  it('should report correct remaining count', async () => {
    const remaining1 = await adapter.getRemaining('test-key', 3, 60);
    expect(remaining1).toBe(3);

    await adapter.hit('test-key', 3, 60);
    const remaining2 = await adapter.getRemaining('test-key', 3, 60);
    expect(remaining2).toBe(2);
  });

  it('should reset a key', async () => {
    await adapter.hit('test-key', 1, 60);
    await adapter.reset('test-key');

    const result = await adapter.hit('test-key', 1, 60);
    expect(result.allowed).toBe(true);
  });
});

// ─── RateLimitService ────────────────────────────────────────────────────────

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeEach(() => {
    // Construct without DI — uses default in-memory sliding window
    service = new RateLimitService();
  });

  it('should define and use named limiters', async () => {
    service.defineLimiter('api', { limit: 2, windowSeconds: 60 });

    const result1 = await service.hit('api', 'user:123');
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(1);

    const result2 = await service.hit('api', 'user:123');
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(0);

    const result3 = await service.hit('api', 'user:123');
    expect(result3.allowed).toBe(false);
  });

  it('should throw for undefined limiter', async () => {
    await expect(service.hit('nonexistent', 'key')).rejects.toThrow(
      'Rate limiter "nonexistent" is not defined',
    );
  });

  it('should define multiple limiters at once', async () => {
    service.defineLimiters([
      { name: 'auth', config: { limit: 5, windowSeconds: 900 } },
      { name: 'upload', config: { limit: 10, windowSeconds: 60 } },
    ]);

    const authResult = await service.hit('auth', 'ip:1.2.3.4');
    expect(authResult.allowed).toBe(true);
    expect(authResult.limit).toBe(5);

    const uploadResult = await service.hit('upload', 'ip:1.2.3.4');
    expect(uploadResult.allowed).toBe(true);
    expect(uploadResult.limit).toBe(10);
  });

  it('should check without recording a hit', async () => {
    service.defineLimiter('api', { limit: 1, windowSeconds: 60 });

    const check1 = await service.check('api', 'user:456');
    expect(check1.allowed).toBe(true);
    expect(check1.remaining).toBe(1);

    // check should not consume a request
    const check2 = await service.check('api', 'user:456');
    expect(check2.allowed).toBe(true);
    expect(check2.remaining).toBe(1);
  });

  it('should reset a limiter for a key', async () => {
    service.defineLimiter('api', { limit: 1, windowSeconds: 60 });

    await service.hit('api', 'user:789');
    const blocked = await service.hit('api', 'user:789');
    expect(blocked.allowed).toBe(false);

    await service.reset('api', 'user:789');
    const afterReset = await service.hit('api', 'user:789');
    expect(afterReset.allowed).toBe(true);
  });

  it('should use keyPrefix from config', async () => {
    service.defineLimiter('custom', {
      limit: 1,
      windowSeconds: 60,
      keyPrefix: 'myapp',
    });

    // These should use different full keys due to prefix
    const result = await service.hit('custom', 'user:1');
    expect(result.allowed).toBe(true);
  });
});

// ─── Key Extraction ──────────────────────────────────────────────────────────

describe('RateLimitService key helpers', () => {
  it('should extract IP from request', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
    });
    const key = RateLimitService.keyFromIp(request);
    expect(key).toBe('ip:192.168.1.1');
  });

  it('should handle missing IP gracefully', () => {
    const request = new Request('https://example.com');
    const key = RateLimitService.keyFromIp(request);
    expect(key).toBe('ip:unknown');
  });

  it('should build user key', () => {
    expect(RateLimitService.keyFromUser('user-abc')).toBe('user:user-abc');
  });

  it('should build org key', () => {
    expect(RateLimitService.keyFromOrg('org-xyz')).toBe('org:org-xyz');
  });

  it('should build token key', () => {
    expect(RateLimitService.keyFromToken('tok-123')).toBe('token:tok-123');
  });
});

// ─── Middleware ───────────────────────────────────────────────────────────────

describe('rateLimitMiddleware', () => {
  let service: RateLimitService;

  beforeEach(() => {
    service = new RateLimitService();
    service.defineLimiter('api', { limit: 2, windowSeconds: 60 });
  });

  it('should allow requests within limit and add rateLimit to context', async () => {
    const middleware = rateLimitMiddleware(service, 'api');
    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = { request: new Request('https://example.com') };

    await middleware({ ctx, next });

    expect(next).toHaveBeenCalledTimes(1);
    const passedCtx = next.mock.calls[0][0].ctx;
    expect(passedCtx.rateLimit).toBeDefined();
    expect(passedCtx.rateLimit.limit).toBe(2);
    expect(passedCtx.rateLimit.remaining).toBe(1);
  });

  it('should throw TRPCError with TOO_MANY_REQUESTS when limit exceeded', async () => {
    const middleware = rateLimitMiddleware(service, 'api');
    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = { request: new Request('https://example.com') };

    await middleware({ ctx, next });
    await middleware({ ctx, next });

    await expect(middleware({ ctx, next })).rejects.toThrow(TRPCError);
    try {
      await middleware({ ctx, next });
    } catch (err) {
      expect((err as TRPCError).code).toBe('TOO_MANY_REQUESTS');
    }
  });

  it('should use custom key extractor', async () => {
    const customExtractor = (ctx: any) => `custom:${ctx.userId}`;
    const middleware = rateLimitMiddleware(service, 'api', customExtractor);
    const next = vi.fn().mockResolvedValue({ data: 'ok' });

    // Two different users should each get their own limit
    const ctx1 = { userId: 'user-1', request: new Request('https://example.com') };
    const ctx2 = { userId: 'user-2', request: new Request('https://example.com') };

    await middleware({ ctx: ctx1, next });
    await middleware({ ctx: ctx1, next });
    // user-1 is now at limit

    // user-2 should still be allowed
    await middleware({ ctx: ctx2, next });
    expect(next).toHaveBeenCalledTimes(3);
  });
});

// ─── Header Helpers ──────────────────────────────────────────────────────────

describe('rateLimitHeaders', () => {
  it('should return correct headers', () => {
    const headers = rateLimitHeaders({
      limit: 100,
      remaining: 42,
      retryAfter: 58,
    });

    expect(headers['X-RateLimit-Limit']).toBe('100');
    expect(headers['X-RateLimit-Remaining']).toBe('42');
    expect(headers['X-RateLimit-Reset']).toBe('58');
  });
});
