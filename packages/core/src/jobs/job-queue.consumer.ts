import type { Job } from '../database/schema';
import { jobs } from '../database/schema';
import { eq, and, inArray } from 'drizzle-orm';
import type { DrizzleDatabase } from '../shared/database/drizzle.service';
import { DRIZZLE } from '../shared/database/drizzle.service';
import { DrizzleService } from '../shared/database/drizzle.service';
import type { JobQueueMessage } from '../queues/queue.types';
import { JOBS_QUEUE_BINDING } from '../queues/queue.types';
import { QueueService } from '../queues/queue.service';
import { JobHandlerRegistry } from './job-handler.registry';
import { config } from '../shared/config';
import type { CruzContainer } from '../di';
import type { JobResult } from './job.types';
import { CloudflareContext } from '../shared/cloudflare/context';
import { buildContainerWithProviders } from '../framework/application.server';

/**
 * Bootstrap a container and process a batch of queue messages.
 *
 * This is the single entry point for server.cloudflare.ts to dynamic-import.
 * All other imports in this file are static.
 */
export async function processQueueBatch(
  messages: { body: unknown }[],
  env: Record<string, unknown>,
  schema: Record<string, unknown>,
): Promise<void> {
  CloudflareContext.init({ cloudflare: { env } } as any);
  DrizzleService.setSchema(schema);

  const container = await buildContainerWithProviders([]);

  for (const msg of messages) {
    try {
      await handleJobMessage(msg.body as JobQueueMessage, container);
    } catch (error) {
      const jobId = (msg.body as JobQueueMessage)?.jobId ?? 'unknown';
      console.error(`[JobConsumer] Unhandled error processing job ${jobId}:`, error);
    }
  }
}

/**
 * Process a single job queue message.
 *
 * Flow:
 * 1. Fetch job from D1 by ID
 * 2. Guard: skip if already completed/failed or missing
 * 3. Lock: mark PROCESSING with worker ID
 * 4. Execute: resolve handler, run it
 * 5. Update D1: COMPLETED or FAILED (with retry if attempts remain)
 */
export async function handleJobMessage(
  message: JobQueueMessage,
  container: CruzContainer,
): Promise<void> {
  const db = container.get<DrizzleDatabase>(DRIZZLE);
  const registry = container.get<JobHandlerRegistry>(JobHandlerRegistry);
  const workerId = `queue-consumer-${Date.now()}`;

  // 1. Fetch job from D1
  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, message.jobId))
    .limit(1);

  if (!job) {
    console.warn(`[JobConsumer] Job ${message.jobId} not found in D1, discarding message`);
    return;
  }

  // 2. Skip if already terminal
  if (job.status === 'COMPLETED' || job.status === 'FAILED') {
    return;
  }

  // 3. Atomic lock: PENDING → PROCESSING
  const [locked] = await db
    .update(jobs)
    .set({
      status: 'PROCESSING',
      processedBy: workerId,
      startedAt: new Date().toISOString(),
      attempts: job.attempts + 1,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(jobs.id, job.id),
        inArray(jobs.status, ['PENDING', 'PROCESSING']),
      )
    )
    .returning();

  if (!locked) {
    console.warn(`[JobConsumer] Failed to lock job ${job.id}, likely already claimed`);
    return;
  }

  // 4. Resolve handler
  const handler = registry.getHandler(job.type);
  if (!handler) {
    await db
      .update(jobs)
      .set({
        status: 'FAILED',
        error: `No handler registered for job type: ${job.type}`,
        processedBy: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(jobs.id, job.id));
    console.error(`[JobConsumer] No handler for job type: ${job.type}`);
    return;
  }

  // 5. Execute handler
  let result: JobResult;
  try {
    const jobForHandler: Job = {
      ...locked,
      payload: typeof locked.payload === 'string' ? JSON.parse(locked.payload) : locked.payload,
    };

    result = await handler.run(jobForHandler);
  } catch (error) {
    result = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // 6. Update D1 based on result
  if (result.success) {
    await db
      .update(jobs)
      .set({
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        resultSummary: JSON.stringify(result.summary ?? {}),
        processedBy: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(jobs.id, job.id));
  } else {
    const newAttempts = locked.attempts;
    if (newAttempts < locked.maxAttempts) {
      // Retry: reset to PENDING and re-enqueue
      const delayMs =
        Math.pow(config.job?.retryMultiplier ?? 2, newAttempts) *
        (config.job?.retryBaseDelayMs ?? 1000);

      await db
        .update(jobs)
        .set({
          status: 'PENDING',
          scheduledFor: new Date(Date.now() + delayMs).toISOString(),
          error: result.error ?? null,
          processedBy: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(jobs.id, job.id));

      // Re-enqueue to the queue for retry
      reEnqueueJob(container, locked, newAttempts);

      console.log(`[JobConsumer] Job ${job.id} (${job.type}) failed, retrying (attempt ${newAttempts}/${locked.maxAttempts})`);
    } else {
      // Max retries exhausted
      await db
        .update(jobs)
        .set({
          status: 'FAILED',
          error: result.error ?? 'Unknown error',
          processedBy: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(jobs.id, job.id));

      console.error(`[JobConsumer] Job ${job.id} (${job.type}) failed permanently: ${result.error}`);
    }
  }
}

function reEnqueueJob(
  container: CruzContainer,
  job: Job,
  attempt: number,
): void {
  const queueService = container.get<QueueService>(QueueService);
  const queue = CloudflareContext.getQueue<JobQueueMessage>(JOBS_QUEUE_BINDING);

  queueService.send(queue, {
    jobId: job.id,
    type: job.type,
    priority: job.priority,
    attempt,
  }).catch((error) => {
    console.error(`[JobConsumer] Failed to re-enqueue job ${job.id}:`, error);
  });
}
