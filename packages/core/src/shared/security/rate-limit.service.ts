import { config } from '../config';

/**
 * Rate limiting service
 * Simple in-memory rate limiter (use Redis in production)
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter((time) => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return true;
  }

  /**
   * Get remaining requests
   */
  getRemaining(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter((time) => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  /**
   * Get time until rate limit resets (in seconds)
   */
  getResetTime(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];

    if (requests.length === 0) {
      return 0;
    }

    // Find the oldest request timestamp
    const oldestRequest = Math.min(...requests);
    const windowEnd = oldestRequest + this.windowMs;
    const secondsUntilReset = Math.ceil((windowEnd - now) / 1000);

    return Math.max(0, secondsUntilReset);
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// Default rate limit settings (used when config not yet initialized)
const defaultRateLimits = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  api: { windowMs: 60 * 1000, maxRequests: 100 },
  upload: { windowMs: 60 * 1000, maxRequests: 10 },
  general: { windowMs: 60 * 60 * 1000, maxRequests: 1000 },
};

const getRateLimitConfig = (type: 'auth' | 'api' | 'upload' | 'general') => {
  return config.rateLimit?.[type] ?? defaultRateLimits[type];
};

/**
 * Rate limiting service
 */
export class RateLimitService {
  private _limiters: Record<string, RateLimiter> | null = null;

  private get limiters() {
    if (!this._limiters) {
      this._limiters = {
        auth: new RateLimiter(getRateLimitConfig('auth').windowMs, getRateLimitConfig('auth').maxRequests),
        api: new RateLimiter(getRateLimitConfig('api').windowMs, getRateLimitConfig('api').maxRequests),
        upload: new RateLimiter(getRateLimitConfig('upload').windowMs, getRateLimitConfig('upload').maxRequests),
        general: new RateLimiter(getRateLimitConfig('general').windowMs, getRateLimitConfig('general').maxRequests),
      };
    }
    return this._limiters;
  }

  /**
   * Get rate limiter for endpoint type
   */
  getLimiter(type: 'auth' | 'api' | 'upload' | 'general'): RateLimiter {
    return this.limiters[type];
  }

  /**
   * Get rate limiter identifier from request
   */
  getIdentifier(request: Request): string {
    // Use IP address or user ID if authenticated
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

    // In production, also check for authenticated user ID
    return ip;
  }
}

