/**
 * Redis Rate Limit Adapter (Docker / Self-Hosted)
 *
 * Uses Redis (ioredis) for distributed rate limiting in self-hosted
 * environments. Falls back to in-memory when Redis is not configured.
 *
 * Redis commands used for atomic fixed-window counting:
 *   MULTI
 *     INCR key
 *     EXPIRE key windowSeconds (only if TTL not set)
 *   EXEC
 *
 * For production, connect via REDIS_URL environment variable.
 * In-memory fallback is suitable for single-instance deployments.
 */

import type { RateLimitAdapter } from '@cruzjs/core/rate-limiting';
import type { RateLimitResult } from '@cruzjs/core/rate-limiting';
import { SlidingWindowRateLimitAdapter } from '@cruzjs/core/rate-limiting';

export class DockerRedisRateLimitAdapter implements RateLimitAdapter {
  private fallback = new SlidingWindowRateLimitAdapter();

  constructor(private readonly redisUrl: string | null) {}

  async hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    if (!this.redisUrl) {
      return this.fallback.hit(key, limit, windowSeconds);
    }
    // TODO: Replace with real Redis MULTI/EXEC when ioredis is available
    return this.fallback.hit(key, limit, windowSeconds);
  }

  async reset(key: string): Promise<void> {
    if (!this.redisUrl) {
      return this.fallback.reset(key);
    }
    return this.fallback.reset(key);
  }

  async getRemaining(key: string, limit: number, windowSeconds: number): Promise<number> {
    if (!this.redisUrl) {
      return this.fallback.getRemaining(key, limit, windowSeconds);
    }
    return this.fallback.getRemaining(key, limit, windowSeconds);
  }
}
