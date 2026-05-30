/**
 * Rate Limit Adapter Interface
 *
 * Provider-agnostic interface for rate limiting backends.
 * Implementations may use KV, Redis, in-memory stores, etc.
 */

import type { RateLimitResult } from './rate-limit.types';

export interface RateLimitAdapter {
  /** Record a hit and return the current rate limit state */
  hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;

  /** Reset the rate limit counter for a given key */
  reset(key: string): Promise<void>;

  /** Get remaining requests without recording a hit */
  getRemaining(key: string, limit: number, windowSeconds: number): Promise<number>;
}
