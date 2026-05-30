/**
 * Queue Metrics Service
 *
 * Tracks queue performance metrics and provides failed job management.
 * Integrates with the existing JobService for job queries and retries.
 */

import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { eq, and, desc, lt, sql } from 'drizzle-orm';
import { queueMetrics } from './queue-metrics.schema';
import { jobs } from '@cruzjs/core/database/schema';
import type { QueueOverview, QueueSummary, RecentJobsOptions, FailedJobsOptions } from './queue-metrics.types';

@Injectable()
export class QueueMetricsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  /**
   * Record a successful job processing. Upserts the minute-granularity metrics row.
   */
  async recordProcessed(queue: string, runtimeMs: number, waitTimeMs = 0): Promise<void> {
    const period = this.currentPeriod();
    const now = new Date().toISOString();

    // Try to update existing row first
    const [existing] = await this.db
      .select()
      .from(queueMetrics)
      .where(and(
        eq(queueMetrics.queue, queue),
        eq(queueMetrics.period, period),
      ))
      .limit(1);

    if (existing) {
      await this.db
        .update(queueMetrics)
        .set({
          processedCount: existing.processedCount + 1,
          totalRuntimeMs: existing.totalRuntimeMs + Math.round(runtimeMs),
          totalWaitTimeMs: existing.totalWaitTimeMs + Math.round(waitTimeMs),
          updatedAt: now,
        })
        .where(eq(queueMetrics.id, existing.id));
    } else {
      await this.db
        .insert(queueMetrics)
        .values({
          queue,
          period,
          processedCount: 1,
          failedCount: 0,
          totalRuntimeMs: Math.round(runtimeMs),
          totalWaitTimeMs: Math.round(waitTimeMs),
        });
    }
  }

  /**
   * Record a failed job. Upserts the minute-granularity metrics row.
   */
  async recordFailed(queue: string): Promise<void> {
    const period = this.currentPeriod();
    const now = new Date().toISOString();

    const [existing] = await this.db
      .select()
      .from(queueMetrics)
      .where(and(
        eq(queueMetrics.queue, queue),
        eq(queueMetrics.period, period),
      ))
      .limit(1);

    if (existing) {
      await this.db
        .update(queueMetrics)
        .set({
          failedCount: existing.failedCount + 1,
          updatedAt: now,
        })
        .where(eq(queueMetrics.id, existing.id));
    } else {
      await this.db
        .insert(queueMetrics)
        .values({
          queue,
          period,
          processedCount: 0,
          failedCount: 1,
          totalRuntimeMs: 0,
          totalWaitTimeMs: 0,
        });
    }
  }

  /**
   * Get an overview of all queues with aggregated metrics.
   */
  async getOverview(): Promise<QueueOverview> {
    const rows = await this.db
      .select({
        queue: queueMetrics.queue,
        processed: sql<number>`sum(${queueMetrics.processedCount})`.as('processed'),
        failed: sql<number>`sum(${queueMetrics.failedCount})`.as('failed'),
        totalRuntime: sql<number>`sum(${queueMetrics.totalRuntimeMs})`.as('totalRuntime'),
      })
      .from(queueMetrics)
      .groupBy(queueMetrics.queue);

    const queues: QueueSummary[] = rows.map((row) => {
      const processed = row.processed ?? 0;
      const failed = row.failed ?? 0;
      const totalRuntime = row.totalRuntime ?? 0;
      const total = processed + failed;

      return {
        name: row.queue,
        processed,
        failed,
        avgRuntimeMs: processed > 0 ? Math.round(totalRuntime / processed) : 0,
        failureRate: total > 0 ? Math.round((failed / total) * 10000) / 100 : 0, // 2 decimal places
      };
    });

    const totalProcessed = queues.reduce((sum, q) => sum + q.processed, 0);
    const totalFailed = queues.reduce((sum, q) => sum + q.failed, 0);

    return { queues, totalProcessed, totalFailed };
  }

  /**
   * Get failed jobs from the jobs table.
   */
  async getFailedJobs(options?: FailedJobsOptions) {
    const limit = options?.limit ?? 20;
    const conditions = [eq(jobs.status, 'FAILED')];

    if (options?.queue) {
      conditions.push(eq(jobs.type, options.queue));
    }

    return this.db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.createdAt))
      .limit(limit);
  }

  /**
   * Retry a single failed job by resetting its status to PENDING.
   */
  async retryJob(jobId: string): Promise<void> {
    await this.db
      .update(jobs)
      .set({
        status: 'PENDING',
        error: null,
        processedBy: null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(jobs.id, jobId), eq(jobs.status, 'FAILED')));
  }

  /**
   * Retry all failed jobs, optionally filtered by queue/type.
   * Returns the count of jobs reset.
   */
  async retryAll(queue?: string): Promise<number> {
    const conditions = [eq(jobs.status, 'FAILED')];

    if (queue) {
      conditions.push(eq(jobs.type, queue));
    }

    const result = await this.db
      .update(jobs)
      .set({
        status: 'PENDING',
        error: null,
        processedBy: null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(...conditions))
      .returning();

    return result.length;
  }

  /**
   * Delete a failed job permanently.
   */
  async deleteJob(jobId: string): Promise<void> {
    await this.db.delete(jobs).where(eq(jobs.id, jobId));
  }

  /**
   * Get recent jobs with optional filtering.
   */
  async getRecentJobs(options?: RecentJobsOptions) {
    const limit = options?.limit ?? 20;
    const conditions = [];

    if (options?.status) {
      conditions.push(eq(jobs.status, options.status));
    }
    if (options?.queue) {
      conditions.push(eq(jobs.type, options.queue));
    }

    return this.db
      .select()
      .from(jobs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(jobs.createdAt))
      .limit(limit);
  }

  /**
   * Delete metrics older than the given number of days.
   */
  async pruneMetrics(olderThanDays = 7): Promise<void> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const cutoffPeriod = this.formatPeriod(cutoff);

    await this.db
      .delete(queueMetrics)
      .where(lt(queueMetrics.period, cutoffPeriod));
  }

  // ─── Private ───────────────────────────────────────────────

  /**
   * Get the current minute-granularity period string.
   */
  private currentPeriod(): string {
    return this.formatPeriod(new Date());
  }

  /**
   * Format a date to 'YYYY-MM-DDTHH:MM' period string.
   */
  private formatPeriod(date: Date): string {
    return date.toISOString().slice(0, 16); // 'YYYY-MM-DDTHH:MM'
  }
}
