import { Injectable, Inject } from '../di';
import { config } from '../shared/config';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '../shared/database/drizzle.service';
import { jobs } from '../database/schema';
import type { Job, JobStatus } from '../database/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { CreateJobInput, UpdateJobInput } from './job.types';
import { JobPriority } from './job.types';
import { QueueService } from '../queues/queue.service';
import { CloudflareContext } from '../shared/cloudflare/context';
import { JOBS_QUEUE_BINDING, type JobQueueMessage } from '../queues/queue.types';

/**
 * Job service for managing background jobs.
 *
 * Creates jobs in D1 and dispatches them to a Cloudflare Queue for processing.
 * In local dev, CloudflareContext provides a LocalQueue facade so the same
 * code path works transparently.
 */
@Injectable()
export class JobService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(QueueService) private readonly queueService: QueueService,
  ) {}

  /**
   * Create a new job and dispatch it to the queue.
   */
  async createJob(input: CreateJobInput): Promise<Job> {
    const priority = this.resolvePriority(input.priority);
    const scheduledFor = input.scheduledFor ?? new Date();
    const isScheduledForLater = scheduledFor.getTime() > Date.now() + 1000;

    const [job] = await this.db
      .insert(jobs)
      .values({
        type: input.type,
        payload: JSON.stringify(input.payload),
        lookupKey: input.lookupKey,
        scheduledFor: scheduledFor instanceof Date ? scheduledFor.toISOString() : scheduledFor,
        priority,
        status: 'PENDING',
        maxAttempts: input.maxAttempts ?? config.job?.defaultMaxAttempts ?? 3,
      })
      .returning();

    // Only enqueue immediately if not scheduled for the future.
    // Scheduled jobs are picked up by the cron trigger.
    if (!isScheduledForLater) {
      await this.enqueueJob(job);
    }

    return job;
  }

  /**
   * Create multiple jobs in a batch and dispatch them to the queue.
   */
  async createJobs(inputs: CreateJobInput[]): Promise<Job[]> {
    if (inputs.length === 0) {
      return [];
    }

    const values = inputs.map((input) => {
      const priority = this.resolvePriority(input.priority);
      const scheduledFor = input.scheduledFor ?? new Date();

      return {
        type: input.type,
        payload: JSON.stringify(input.payload),
        lookupKey: input.lookupKey,
        scheduledFor: scheduledFor instanceof Date ? scheduledFor.toISOString() : scheduledFor,
        priority,
        status: 'PENDING' as const,
        maxAttempts: input.maxAttempts ?? config.job?.defaultMaxAttempts ?? 3,
      };
    });

    const created = await this.db.insert(jobs).values(values).returning();

    // Enqueue jobs that aren't scheduled for the future
    const now = Date.now() + 1000;
    const immediate = created.filter((job) => {
      const scheduledFor = new Date(job.scheduledFor).getTime();
      return scheduledFor <= now;
    });

    if (immediate.length > 0) {
      await this.enqueueJobs(immediate);
    }

    return created;
  }

  async getJob(jobId: string): Promise<Job | null> {
    const [job] = await this.db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    return job ?? null;
  }

  async updateJob(jobId: string, input: UpdateJobInput): Promise<Job | null> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (input.status !== undefined) updateData.status = input.status;
    if (input.error !== undefined) updateData.error = input.error;
    if (input.processedBy !== undefined) updateData.processedBy = input.processedBy;
    if (input.startedAt !== undefined) updateData.startedAt = input.startedAt.toISOString();
    if (input.completedAt !== undefined) updateData.completedAt = input.completedAt.toISOString();
    if (input.resultSummary !== undefined) updateData.resultSummary = JSON.stringify(input.resultSummary);

    const [job] = await this.db
      .update(jobs)
      .set(updateData)
      .where(eq(jobs.id, jobId))
      .returning();

    return job ?? null;
  }

  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    error?: string,
    resultSummary?: Record<string, unknown>
  ): Promise<Job | null> {
    const updateData: Record<string, unknown> = {
      status,
      processedBy: null,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date().toISOString();
      if (resultSummary) {
        updateData.resultSummary = JSON.stringify(resultSummary);
      }
    } else if (status === 'FAILED') {
      updateData.error = error ?? 'Unknown error';
    }

    const [job] = await this.db
      .update(jobs)
      .set(updateData)
      .where(eq(jobs.id, jobId))
      .returning();

    return job ?? null;
  }

  async deleteJob(jobId: string): Promise<void> {
    await this.db.delete(jobs).where(eq(jobs.id, jobId));
  }

  /**
   * Retry a failed job with exponential backoff.
   * Re-enqueues the job to the queue.
   */
  async retryJob(jobId: string): Promise<Job> {
    const job = await this.getJob(jobId);

    if (!job) {
      throw new Error('Job not found');
    }

    if (job.attempts >= job.maxAttempts) {
      throw new Error('Max attempts reached');
    }

    const delayMs =
      Math.pow(config.job?.retryMultiplier ?? 2, job.attempts) *
      (config.job?.retryBaseDelayMs ?? 1000);
    const scheduledFor = new Date(Date.now() + delayMs);

    const [updatedJob] = await this.db
      .update(jobs)
      .set({
        status: 'PENDING',
        scheduledFor: scheduledFor.toISOString(),
        processedBy: null,
        error: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    await this.enqueueJob(updatedJob);

    return updatedJob;
  }

  async findByLookupKey(lookupKey: string, statuses?: JobStatus[]): Promise<Job[]> {
    const conditions = [eq(jobs.lookupKey, lookupKey)];
    if (statuses?.length) {
      conditions.push(inArray(jobs.status, statuses));
    }
    return this.db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.priority), desc(jobs.createdAt));
  }

  async findByType(type: string, statuses?: JobStatus[]): Promise<Job[]> {
    const conditions = [eq(jobs.type, type)];
    if (statuses?.length) {
      conditions.push(inArray(jobs.status, statuses));
    }
    return this.db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.priority), desc(jobs.createdAt));
  }

  async getJobCounts(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    const allJobs = await this.db.select().from(jobs);
    let pending = 0, processing = 0, completed = 0, failed = 0;
    for (const job of allJobs) {
      switch (job.status) {
        case 'PENDING': pending++; break;
        case 'PROCESSING': processing++; break;
        case 'COMPLETED': completed++; break;
        case 'FAILED': failed++; break;
      }
    }
    return { pending, processing, completed, failed, total: allJobs.length };
  }

  async listJobs(opts: {
    status?: JobStatus;
    type?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ jobs: Job[]; total: number }> {
    const { status, type, page = 1, limit: perPage = 50 } = opts;
    const conditions: ReturnType<typeof eq>[] = [];
    if (status) conditions.push(eq(jobs.status, status));
    if (type) conditions.push(eq(jobs.type, type));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (page - 1) * perPage;

    const [allRows, pageRows] = await Promise.all([
      this.db.select().from(jobs).where(whereClause),
      this.db.select().from(jobs).where(whereClause).orderBy(desc(jobs.createdAt)).limit(perPage).offset(offset),
    ]);

    return { jobs: pageRows, total: allRows.length };
  }

  async getFailedJobs(limit = config.job?.failedJobsLimit ?? 100): Promise<Job[]> {
    return this.db
      .select()
      .from(jobs)
      .where(eq(jobs.status, 'FAILED'))
      .orderBy(desc(jobs.createdAt))
      .limit(limit);
  }

  async cancelByLookupKey(lookupKey: string): Promise<number> {
    const result = await this.db
      .update(jobs)
      .set({
        status: 'FAILED',
        error: 'Cancelled',
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(jobs.lookupKey, lookupKey), eq(jobs.status, 'PENDING')))
      .returning();
    return result.length;
  }

  // ─── Private ───────────────────────────────────────────────

  private resolvePriority(input?: number | string): number {
    if (typeof input === 'string') {
      return JobPriority[input as keyof typeof JobPriority] ?? JobPriority.NORMAL;
    }
    return input ?? JobPriority.NORMAL;
  }

  private async enqueueJob(job: Job): Promise<void> {
    const queue = CloudflareContext.getQueue<JobQueueMessage>(JOBS_QUEUE_BINDING);
    await this.queueService.send(queue, {
      jobId: job.id,
      type: job.type,
      priority: job.priority,
      attempt: job.attempts,
    });
  }

  private async enqueueJobs(jobList: Job[]): Promise<void> {
    const queue = CloudflareContext.getQueue<JobQueueMessage>(JOBS_QUEUE_BINDING);
    const messages = jobList.map((job) => ({
      jobId: job.id,
      type: job.type,
      priority: job.priority,
      attempt: job.attempts,
    }));
    await this.queueService.sendBatch(queue, messages);
  }
}
