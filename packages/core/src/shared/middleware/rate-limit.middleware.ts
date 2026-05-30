import { RateLimitService } from '../security/rate-limit.service';

export type RateLimitType = 'auth' | 'api' | 'upload' | 'general';

/**
 * Rate limiting middleware
 */
export async function requireRateLimit(
  request: Request,
  type: RateLimitType = 'api'
): Promise<void> {
  const rateLimitService = new RateLimitService();
  const limiter = rateLimitService.getLimiter(type);
  const identifier = rateLimitService.getIdentifier(request);

  if (!limiter.isAllowed(identifier)) {
    const resetTime = limiter.getResetTime(identifier);
    throw new Error(`Rate limit exceeded. Try again in ${resetTime} seconds.`);
  }
}

