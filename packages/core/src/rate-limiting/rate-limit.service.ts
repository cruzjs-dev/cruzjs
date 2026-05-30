/**
 * Rate Limit Service
 *
 * Central service for managing named rate limiters.
 * Supports multiple key strategies (IP, user, org, token, custom)
 * and delegates to the underlying RateLimitAdapter for storage.
 */

import { Injectable, Inject, Optional } from '../di';
import { createToken } from '../di/tokens/create-token';
import type { RateLimitAdapter } from './rate-limit.adapter';
import type { RateLimitConfig, RateLimitResult, NamedLimiter } from './rate-limit.types';
import { SlidingWindowRateLimitAdapter } from './algorithms/sliding-window';

/** DI token for injecting a platform-specific RateLimitAdapter */
export const RATE_LIMIT_ADAPTER = createToken<RateLimitAdapter>('RATE_LIMIT_ADAPTER');

@Injectable()
export class RateLimitService {
  private readonly limiters = new Map<string, RateLimitConfig>();
  private readonly adapter: RateLimitAdapter;

  constructor(
    @Inject(RATE_LIMIT_ADAPTER) @Optional() adapter?: RateLimitAdapter,
  ) {
    // Fall back to in-memory sliding window for local dev
    this.adapter = adapter ?? new SlidingWindowRateLimitAdapter();
  }

  /**
   * Register a named limiter with its configuration.
   * Call this at startup to define reusable rate limit profiles.
   */
  defineLimiter(name: string, config: RateLimitConfig): void {
    this.limiters.set(name, config);
  }

  /**
   * Register multiple named limiters at once.
   */
  defineLimiters(limiters: NamedLimiter[]): void {
    for (const { name, config } of limiters) {
      this.limiters.set(name, config);
    }
  }

  /**
   * Check rate limit status without recording a hit.
   */
  async check(name: string, key: string): Promise<RateLimitResult> {
    const config = this.resolveConfig(name);
    const fullKey = this.buildKey(name, key, config);
    const remaining = await this.adapter.getRemaining(fullKey, config.limit, config.windowSeconds);

    return {
      allowed: remaining > 0,
      remaining,
      limit: config.limit,
      retryAfter: remaining > 0 ? 0 : config.windowSeconds,
    };
  }

  /**
   * Record a hit and return the rate limit result.
   */
  async hit(name: string, key: string): Promise<RateLimitResult> {
    const config = this.resolveConfig(name);
    const fullKey = this.buildKey(name, key, config);
    return this.adapter.hit(fullKey, config.limit, config.windowSeconds);
  }

  /**
   * Reset the counter for a named limiter and key.
   */
  async reset(name: string, key: string): Promise<void> {
    const config = this.resolveConfig(name);
    const fullKey = this.buildKey(name, key, config);
    return this.adapter.reset(fullKey);
  }

  /**
   * Get the underlying adapter (for advanced use cases).
   */
  getAdapter(): RateLimitAdapter {
    return this.adapter;
  }

  // ── Key extraction helpers ──────────────────────────────────────────

  /** Extract a rate limit key from the request IP address */
  static keyFromIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    return `ip:${ip}`;
  }

  /** Build a rate limit key from a user ID */
  static keyFromUser(userId: string): string {
    return `user:${userId}`;
  }

  /** Build a rate limit key from an org ID */
  static keyFromOrg(orgId: string): string {
    return `org:${orgId}`;
  }

  /** Build a rate limit key from an API token identifier */
  static keyFromToken(tokenId: string): string {
    return `token:${tokenId}`;
  }

  // ── Private helpers ─────────────────────────────────────────────────

  private resolveConfig(name: string): RateLimitConfig {
    const config = this.limiters.get(name);
    if (!config) {
      throw new Error(`Rate limiter "${name}" is not defined. Call defineLimiter() first.`);
    }
    return config;
  }

  private buildKey(name: string, key: string, config: RateLimitConfig): string {
    const prefix = config.keyPrefix ?? name;
    return `ratelimit:${prefix}:${key}`;
  }
}
