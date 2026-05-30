/**
 * Rate Limit Module
 *
 * Registers the RateLimitService and default adapter into the DI container.
 * Platform-specific adapters override the RATE_LIMIT_ADAPTER token
 * when a RuntimeAdapter provides one.
 */

import { Module } from '../di';
import { RateLimitService, RATE_LIMIT_ADAPTER } from './rate-limit.service';
import { SlidingWindowRateLimitAdapter } from './algorithms/sliding-window';

@Module({
  providers: [
    RateLimitService,
    {
      provide: RATE_LIMIT_ADAPTER,
      useFactory: () => new SlidingWindowRateLimitAdapter(),
    },
  ],
})
export class RateLimitModule {}
