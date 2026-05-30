/**
 * Fixed Window Rate Limit Adapter (In-Memory)
 *
 * Uses discrete time windows (e.g., 0:00-1:00, 1:00-2:00) to count requests.
 * Simpler and more memory-efficient than sliding window, but less precise
 * at window boundaries (can allow up to 2x burst at boundary).
 *
 * Useful as a lightweight fallback.
 */

import type { RateLimitAdapter } from '../rate-limit.adapter';
import type { RateLimitResult } from '../rate-limit.types';

type FixedWindowEntry = {
  count: number;
  windowStart: number; // epoch ms when window started
};

export class FixedWindowRateLimitAdapter implements RateLimitAdapter {
  private windows = new Map<string, FixedWindowEntry>();

  async hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const entry = this.getOrCreate(key, now, windowMs);

    // Check if we need to reset the window
    if (now - entry.windowStart >= windowMs) {
      entry.count = 0;
      entry.windowStart = now;
    }

    if (entry.count >= limit) {
      const windowEnd = entry.windowStart + windowMs;
      const retryAfter = Math.ceil((windowEnd - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        limit,
        retryAfter: Math.max(0, retryAfter),
      };
    }

    entry.count++;
    const remaining = limit - entry.count;
    const windowEnd = entry.windowStart + windowMs;
    const retryAfter = Math.ceil((windowEnd - now) / 1000);

    return {
      allowed: true,
      remaining,
      limit,
      retryAfter: Math.max(0, retryAfter),
    };
  }

  async reset(key: string): Promise<void> {
    this.windows.delete(key);
  }

  async getRemaining(key: string, limit: number, windowSeconds: number): Promise<number> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const entry = this.windows.get(key);

    if (!entry) {
      return limit;
    }

    // Window expired
    if (now - entry.windowStart >= windowMs) {
      return limit;
    }

    return Math.max(0, limit - entry.count);
  }

  private getOrCreate(key: string, now: number, windowMs: number): FixedWindowEntry {
    let entry = this.windows.get(key);
    if (!entry || now - entry.windowStart >= windowMs) {
      entry = { count: 0, windowStart: now };
      this.windows.set(key, entry);
    }
    return entry;
  }
}
