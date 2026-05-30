/**
 * Scheduler tRPC Router
 *
 * Admin endpoints for viewing, triggering, and managing scheduled tasks.
 * Uses protectedProcedure since scheduled tasks are system-level (not org-scoped).
 */

import { Inject } from '../di';
import { Router, Route, TrpcRouter } from '../trpc/router-class';
import { protectedProcedure } from '../trpc/context';
import { TRPCError } from '@trpc/server';
import { SchedulerService } from './scheduler.service';
import { runTaskSchema, taskHistorySchema, toggleTaskSchema } from './scheduler.validation';

@Router()
export class SchedulerTrpc extends TrpcRouter {
  @Inject(SchedulerService) private service!: SchedulerService;

  @Route() list = protectedProcedure
    .query(async () => this.service.listTasks());

  @Route() runNow = protectedProcedure
    .input(runTaskSchema)
    .mutation(async ({ input }) => {
      if (!this.service.hasTask(input.name)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Task "${input.name}" not found`,
        });
      }
      return this.service.run(input.name);
    });

  @Route() history = protectedProcedure
    .input(taskHistorySchema)
    .query(async ({ input }) => this.service.getHistory(input.name, input.limit));

  @Route() toggle = protectedProcedure
    .input(toggleTaskSchema)
    .mutation(async ({ input }) => {
      try {
        const newState = await this.service.toggle(input.name);
        return { name: input.name, isActive: newState };
      } catch {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Task "${input.name}" not found`,
        });
      }
    });
}
