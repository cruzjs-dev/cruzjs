/**
 * Rate Limiting Types
 *
 * Core types for the rate limiting system.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfter: number; // seconds until reset
};

export type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
  keyStrategy?: 'ip' | 'user' | 'org' | 'token' | 'custom';
  keyPrefix?: string;
};

export type NamedLimiter = {
  name: string;
  config: RateLimitConfig;
};
