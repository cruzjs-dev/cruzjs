/**
 * Redis Rate Limit Adapter (AWS ElastiCache)
 *
 * Uses Redis for distributed rate limiting via ElastiCache.
 * Falls back to in-memory when Redis is not configured.
 *
 * Redis commands used for atomic fixed-window counting:
 *   MULTI
 *     INCR key
 *     EXPIRE key windowSeconds (only if TTL not set)
 *   EXEC
 *
 * For production, connect via REDIS_URL environment variable.
 * This is a placeholder that documents the interface contract;
 * actual Redis client (ioredis) integration should be added
 * when the adapter is deployed with ElastiCache.
 */

import type { RateLimitAdapter } from '@cruzjs/core/rate-limiting';
import type { RateLimitResult } from '@cruzjs/core/rate-limiting';
import { SlidingWindowRateLimitAdapter } from '@cruzjs/core/rate-limiting';

export class RedisRateLimitAdapter implements RateLimitAdapter {
  private fallback = new SlidingWindowRateLimitAdapter();

  constructor(private readonly redisUrl: string | null) {
    // When redisUrl is provided, initialize ioredis client here:
    // this.client = new Redis(redisUrl);
  }

  async hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    if (!this.redisUrl) {
      return this.fallback.hit(key, limit, windowSeconds);
    }

    // TODO: Replace with real Redis MULTI/EXEC when ioredis is available
    // const results = await this.client.multi()
    //   .incr(key)
    //   .expire(key, windowSeconds)
    //   .exec();
    // const count = results[0][1] as number;
    return this.fallback.hit(key, limit, windowSeconds);
  }

  async reset(key: string): Promise<void> {
    if (!this.redisUrl) {
      return this.fallback.reset(key);
    }
    // TODO: await this.client.del(key);
    return this.fallback.reset(key);
  }

  async getRemaining(key: string, limit: number, windowSeconds: number): Promise<number> {
    if (!this.redisUrl) {
      return this.fallback.getRemaining(key, limit, windowSeconds);
    }
    // TODO: const count = await this.client.get(key);
    return this.fallback.getRemaining(key, limit, windowSeconds);
  }
}
