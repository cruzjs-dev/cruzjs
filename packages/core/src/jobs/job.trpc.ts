import { z } from 'zod';
import { protectedProcedure, router } from '../trpc/context';
import { JobService } from './job.service';
import { JobStatusValues } from '../database/schema';

/**
 * Job status response type
 */
export type JobStatusResponse = {
  id: string;
  status: string;
  error: string | null;
  resultSummary: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

/**
 * Job tRPC Router
 * Provides endpoints for checking job status
 */
export const jobTrpc = router({
  /**
   * Get status of a job by ID
   */
  getStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }): Promise<JobStatusResponse | null> => {
      const jobService = ctx.container.get<JobService>(JobService);

      const job = await jobService.getJob(input.jobId);
      if (!job) {
        return null;
      }

      // Parse resultSummary from JSON string if present
      let resultSummary: Record<string, unknown> | null = null;
      if (job.resultSummary) {
        try {
          resultSummary = typeof job.resultSummary === 'string'
            ? JSON.parse(job.resultSummary)
            : job.resultSummary;
        } catch {
          resultSummary = null;
        }
      }

      return {
        id: job.id,
        status: job.status,
        error: job.error,
        resultSummary,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
      };
    }),

  /**
   * List jobs with optional filters and pagination.
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(JobStatusValues as unknown as [string, ...string[]]).optional(),
        type: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(200).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const jobService = ctx.container.get<JobService>(JobService);
      const result = await jobService.listJobs({
        status: input.status as any,
        type: input.type,
        page: input.page,
        limit: input.limit,
      });
      return {
        jobs: result.jobs.map((job) => ({
          id: job.id,
          type: job.type,
          status: job.status,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
          error: job.error,
          payload: (() => { try { return typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload; } catch { return {}; } })(),
          scheduledFor: job.scheduledFor,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          createdAt: job.createdAt,
        })),
        total: result.total,
        page: input.page,
        limit: input.limit,
      };
    }),

  /**
   * Get full detail for a single job.
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const jobService = ctx.container.get<JobService>(JobService);
      const job = await jobService.getJob(input.id);
      if (!job) return null;
      return {
        id: job.id,
        type: job.type,
        status: job.status,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        error: job.error,
        payload: (() => { try { return typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload; } catch { return {}; } })(),
        scheduledFor: job.scheduledFor,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
      };
    }),

  /**
   * Retry a failed job.
   */
  retry: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const jobService = ctx.container.get<JobService>(JobService);
      await jobService.retryJob(input.id);
      return { success: true };
    }),

  /**
   * Cancel a pending job by marking it as failed.
   */
  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const jobService = ctx.container.get<JobService>(JobService);
      await jobService.updateJobStatus(input.id, 'FAILED', 'Cancelled');
      return { success: true };
    }),

  /**
   * Get job counts by status.
   */
  counts: protectedProcedure.query(async ({ ctx }) => {
    const jobService = ctx.container.get<JobService>(JobService);
    return jobService.getJobCounts();
  }),

  /**
   * Get jobs by lookup key (e.g., an entity ID associated with the job)
   */
  getByLookupKey: protectedProcedure
    .input(z.object({ lookupKey: z.string() }))
    .query(async ({ ctx, input }): Promise<JobStatusResponse[]> => {
      const jobService = ctx.container.get<JobService>(JobService);

      const jobs = await jobService.findByLookupKey(input.lookupKey);

      return jobs.map((job) => {
        let resultSummary: Record<string, unknown> | null = null;
        if (job.resultSummary) {
          try {
            resultSummary = typeof job.resultSummary === 'string'
              ? JSON.parse(job.resultSummary)
              : job.resultSummary;
          } catch {
            resultSummary = null;
          }
        }

        return {
          id: job.id,
          status: job.status,
          error: job.error,
          resultSummary,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          createdAt: job.createdAt,
        };
      });
    }),
});
