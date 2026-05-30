/**
 * @cruzjs/core Rate Limiting
 *
 * Enhanced rate limiting with adapter pattern, named limiters,
 * sliding/fixed window algorithms, and tRPC middleware.
 */

// Types
export type { RateLimitResult, RateLimitConfig, NamedLimiter } from './rate-limit.types';

// Adapter interface
export type { RateLimitAdapter } from './rate-limit.adapter';

// Service
export { RateLimitService, RATE_LIMIT_ADAPTER } from './rate-limit.service';

// Algorithms
export { SlidingWindowRateLimitAdapter } from './algorithms/sliding-window';
export { FixedWindowRateLimitAdapter } from './algorithms/fixed-window';

// Middleware
export { rateLimitMiddleware, rateLimitHeaders } from './rate-limit.middleware';
export type { RateLimitKeyExtractor } from './rate-limit.middleware';

// Decorator
export { RateLimit, getRateLimitMetadata } from './rate-limit.decorator';
export type { RateLimitDecoratorConfig } from './rate-limit.decorator';

// Module
export { RateLimitModule } from './rate-limit.module';
