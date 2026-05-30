/**
 * Queue Metrics tRPC Router
 *
 * Provides API endpoints for the queue monitoring UI (Horizon).
 * All endpoints require authentication (protectedProcedure).
 */

import { z } from 'zod';
import { Inject } from '@cruzjs/core/di';
import { TrpcRouter, Router, Route } from '@cruzjs/core/trpc/router-class';
import { protectedProcedure } from '@cruzjs/core/trpc/context';
import { QueueMetricsService } from './queue-metrics.service';

@Router()
export class QueueMetricsTrpc extends TrpcRouter {
  @Inject(QueueMetricsService) private service!: QueueMetricsService;

  @Route() overview = protectedProcedure
    .query(async () => {
      return this.service.getOverview();
    });

  @Route() failedJobs = protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      queue: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return this.service.getFailedJobs({ limit: input.limit, queue: input.queue });
    });

  @Route() retryJob = protectedProcedure
    .input(z.object({ jobId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await this.service.retryJob(input.jobId);
      return { success: true };
    });

  @Route() retryAll = protectedProcedure
    .input(z.object({ queue: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      const count = await this.service.retryAll(input?.queue);
      return { retriedCount: count };
    });

  @Route() deleteJob = protectedProcedure
    .input(z.object({ jobId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await this.service.deleteJob(input.jobId);
      return { success: true };
    });

  @Route() recentJobs = protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      status: z.string().optional(),
      queue: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return this.service.getRecentJobs({
        limit: input.limit,
        status: input.status,
        queue: input.queue,
      });
    });

  @Route() pruneMetrics = protectedProcedure
    .input(z.object({
      olderThanDays: z.number().min(1).default(7),
    }))
    .mutation(async ({ input }) => {
      await this.service.pruneMetrics(input.olderThanDays);
      return { success: true };
    });
}
