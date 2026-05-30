import { orgProcedure, router } from '@cruzjs/core/trpc/context';
import { RealTimeService } from './real-time.service';
import { GetEventsInputSchema, GetEventsSinceInputSchema } from './real-time.types';

/**
 * Real-Time Router
 *
 * Provides UI-facing endpoints for querying unified stream events
 * (run lifecycle, SCM, and state transition events) with polling support.
 */
export const realTimeTrpc = router({
  /**
   * Get events with optional filters and cursor pagination.
   * Supports filtering by runId, eventTypes array, and after cursor.
   */
  getEvents: orgProcedure
    .input(GetEventsInputSchema)
    .query(async ({ ctx, input }) => {
      const service = ctx.container.get<RealTimeService>(RealTimeService);
      return service.getEvents(ctx.org.org.orgId, input);
    }),

  /**
   * Get events since a timestamp. Optimized for polling clients.
   */
  getEventsSince: orgProcedure
    .input(GetEventsSinceInputSchema)
    .query(async ({ ctx, input }) => {
      const service = ctx.container.get<RealTimeService>(RealTimeService);
      return service.getEventsSince(ctx.org.org.orgId, input.since);
    }),
});
