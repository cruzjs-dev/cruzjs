/**
 * Sliding Window Rate Limit Adapter (In-Memory)
 *
 * Tracks individual request timestamps and uses a sliding window
 * to calculate rate limits. This provides more accurate rate limiting
 * than fixed windows but uses more memory per key.
 *
 * Default adapter for local development and testing.
 */

import type { RateLimitAdapter } from '../rate-limit.adapter';
import type { RateLimitResult } from '../rate-limit.types';

type WindowEntry = {
  timestamps: number[];
};

export class SlidingWindowRateLimitAdapter implements RateLimitAdapter {
  private windows = new Map<string, WindowEntry>();

  async hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const entry = this.getOrCreate(key);

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

    if (entry.timestamps.length >= limit) {
      const oldestInWindow = Math.min(...entry.timestamps);
      const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        limit,
        retryAfter: Math.max(0, retryAfter),
      };
    }

    // Record the hit
    entry.timestamps.push(now);

    const remaining = limit - entry.timestamps.length;
    const oldestInWindow = entry.timestamps.length > 0
      ? Math.min(...entry.timestamps)
      : now;
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);

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

    const validTimestamps = entry.timestamps.filter((ts) => now - ts < windowMs);
    return Math.max(0, limit - validTimestamps.length);
  }

  private getOrCreate(key: string): WindowEntry {
    let entry = this.windows.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.windows.set(key, entry);
    }
    return entry;
  }
}
