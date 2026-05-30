/**
 * Cloudflare KV Rate Limit Adapter
 *
 * Uses Cloudflare KV for distributed rate limiting across edge locations.
 * Falls back to in-memory when KV is not available (local dev).
 *
 * KV operations used:
 * - get(key) to read current count
 * - put(key, value, { expirationTtl }) to write with automatic expiry
 *
 * Note: KV does not support atomic increment natively, so this uses
 * a read-modify-write pattern. This is acceptable for rate limiting
 * where exact precision is not critical (eventual consistency).
 */

import type { RateLimitAdapter } from '@cruzjs/core/rate-limiting';
import type { RateLimitResult } from '@cruzjs/core/rate-limiting';

type StoredRateLimit = {
  count: number;
  windowStart: number;
};

export class CloudflareKVRateLimitAdapter implements RateLimitAdapter {
  private readonly kv: KVNamespace | null;

  constructor(kvNamespace: KVNamespace | null) {
    this.kv = kvNamespace;
  }

  async hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    if (!this.kv) {
      // Should not reach here in production; fallback handled by service
      return { allowed: true, remaining: limit - 1, limit, retryAfter: windowSeconds };
    }

    const now = Date.now();
    const existing = await this.kv.get<StoredRateLimit>(key, 'json');

    let entry: StoredRateLimit;
    if (!existing || now - existing.windowStart >= windowSeconds * 1000) {
      // New window
      entry = { count: 1, windowStart: now };
    } else {
      entry = { count: existing.count + 1, windowStart: existing.windowStart };
    }

    // Write back with TTL matching the window
    await this.kv.put(key, JSON.stringify(entry), { expirationTtl: windowSeconds });

    const allowed = entry.count <= limit;
    const remaining = Math.max(0, limit - entry.count);
    const windowEnd = entry.windowStart + windowSeconds * 1000;
    const retryAfter = Math.ceil((windowEnd - now) / 1000);

    return {
      allowed,
      remaining,
      limit,
      retryAfter: Math.max(0, retryAfter),
    };
  }

  async reset(key: string): Promise<void> {
    if (this.kv) {
      await this.kv.delete(key);
    }
  }

  async getRemaining(key: string, limit: number, windowSeconds: number): Promise<number> {
    if (!this.kv) {
      return limit;
    }

    const now = Date.now();
    const existing = await this.kv.get<StoredRateLimit>(key, 'json');

    if (!existing || now - existing.windowStart >= windowSeconds * 1000) {
      return limit;
    }

    return Math.max(0, limit - existing.count);
  }
}
