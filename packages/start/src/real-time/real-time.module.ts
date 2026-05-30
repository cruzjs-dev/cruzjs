import { Module } from '@cruzjs/core/di';
import { RealTimeService } from './real-time.service';
import { realTimeTrpc } from './real-time.trpc';

/**
 * Real-Time Module
 *
 * Registers RealTimeService and the realTime tRPC router for
 * unified event feed access.
 */
@Module({
  providers: [RealTimeService],
  trpcRouters: {
    realTime: realTimeTrpc,
  },
})
export class RealTimeModule {}
