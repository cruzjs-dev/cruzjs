/**
 * Monitor tRPC Router
 *
 * Provides API endpoints for the debug dashboard UI.
 * All endpoints require authentication (protectedProcedure).
 */

import { z } from 'zod';
import { Inject } from '@cruzjs/core/di';
import { TrpcRouter, Router, Route } from '@cruzjs/core/trpc/router-class';
import { protectedProcedure } from '@cruzjs/core/trpc/context';
import { MonitorService } from './monitor.service';
import { MonitorEntryTypeValues, MonitorEntryStatusValues } from './monitor.types';

@Router()
export class MonitorTrpc extends TrpcRouter {
  @Inject(MonitorService) private service!: MonitorService;

  @Route() entries = protectedProcedure
    .input(z.object({
      type: z.enum(MonitorEntryTypeValues).optional(),
      status: z.enum(MonitorEntryStatusValues).optional(),
      tag: z.string().optional(),
      limit: z.number().min(1).max(200).default(50),
      before: z.string().datetime().optional(),
    }))
    .query(async ({ input }) => {
      return this.service.list({
        type: input.type,
        status: input.status,
        tag: input.tag,
        limit: input.limit,
        before: input.before ? new Date(input.before) : undefined,
      });
    });

  @Route() entry = protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input }) => {
      return this.service.get(input.id);
    });

  @Route() stats = protectedProcedure
    .query(async () => {
      return this.service.getStats();
    });

  @Route() clear = protectedProcedure
    .input(z.object({
      type: z.enum(MonitorEntryTypeValues).optional(),
    }))
    .mutation(async ({ input }) => {
      await this.service.clear(input.type);
      return { success: true };
    });

  @Route() prune = protectedProcedure
    .input(z.object({
      olderThanHours: z.number().min(1).default(24),
    }))
    .mutation(async ({ input }) => {
      const count = await this.service.prune(input.olderThanHours);
      return { deleted: count };
    });
}
