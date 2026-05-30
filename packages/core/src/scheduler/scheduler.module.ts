/**
 * Scheduler Module
 *
 * Registers the SchedulerService, tRPC router, and default adapter.
 * The SCHEDULER_ADAPTER token defaults to null (no locking).
 * Platform-specific adapters override this when a RuntimeAdapter provides one.
 */

import { Module } from '../di';
import { SchedulerService, SCHEDULER_ADAPTER } from './scheduler.service';
import { SchedulerTrpc } from './scheduler.trpc';

@Module({
  providers: [
    SchedulerService,
    SchedulerTrpc,
    {
      provide: SCHEDULER_ADAPTER,
      useValue: undefined,
    },
  ],
  trpcRouters: {
    scheduler: SchedulerTrpc,
  },
})
export class SchedulerModule {}
