# Background Jobs

CruzJS uses a queue-based job processing system. D1 tracks status and stores payloads, Cloudflare Queues handle communication, and Workers process the work.

## Architecture

### Flow

```
App code → JobService.createJob()
              ├── INSERT into D1 (status: PENDING)
              └── QueueService.send(JOBS_QUEUE, { jobId, type, priority })

Queue Consumer Worker
  ← receives message from JOBS_QUEUE
  → Fetch full job from D1 by ID
  → UPDATE D1: status=PROCESSING
  → Resolve handler from JobHandlerRegistry
  → handler.run(job)
  → UPDATE D1: status=COMPLETED or FAILED
  → On failure with retries remaining: re-enqueue with backoff
```

### Core Components

| Component | Purpose |
|-----------|---------|
| `JobService` | CRUD operations + queue dispatch on creation |
| `JobHandlerRegistry` | Collects registered handlers via multi-injection |
| `QueueService` | Sends messages to Cloudflare Queues |
| `handleJobMessage` | Queue consumer logic (in `job-queue.consumer.ts`) |
| `handleJobBatch` | Batch consumer for CF Workers `queue()` handler |

### Job Lifecycle

```
PENDING → (queue message) → PROCESSING → COMPLETED
                                     ↓
                                 FAILED (after max retries)
                                     ↓
                              PENDING (if retries remain, re-enqueued)
```

### Local Development

When no Cloudflare Queue is available (local dev), `JobService` automatically falls back to in-process execution via `setImmediate`. Same handler code path, no queue setup needed.

## Creating Job Handlers

### Handler Class

```typescript
import { Injectable, Inject, type JobHandler, type JobHandlerMetadata, type JobResult } from '@cruzjs/core';
import type { Job } from '@cruzjs/core/database/schema';

type MyJobPayload = {
  userId: string;
  data: Record<string, unknown>;
};

@Injectable()
export class MyJobHandler implements JobHandler {
  readonly metadata: JobHandlerMetadata = {
    jobType: 'my-job',
    description: 'Processes my custom jobs',
  };

  constructor(@Inject(MyService) private readonly myService: MyService) {}

  async run(job: Job): Promise<JobResult> {
    const payload = job.payload as unknown as MyJobPayload;

    try {
      const result = await this.myService.process(payload);
      return {
        success: true,
        summary: { processedAt: new Date().toISOString(), itemCount: result.length },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
```

### Register Handler

```typescript
import { Module, JOB_HANDLER } from '@cruzjs/core';

@Module({
  providers: [
    MyService,
    { provide: JOB_HANDLER, useClass: MyJobHandler, multi: true },
  ],
})
export class MyFeatureModule {}
```

## Creating Jobs

```typescript
const jobService = container.get<JobService>(JobService);

// Create a job — automatically enqueued to JOBS_QUEUE
const job = await jobService.createJob({
  type: 'my-job',
  payload: { userId: 'user-123', data: { foo: 'bar' } },
  priority: JobPriority.NORMAL,
  maxAttempts: 3,
  lookupKey: 'user-123',       // Optional: for querying related jobs
  scheduledFor: new Date(),    // Optional: schedule for later (picked up by cron)
});
```

## Queue Consumer Setup

The main app's `server.cloudflare.ts` exports a `queue()` handler that processes job messages. Add the queue binding to `wrangler.toml`:

```toml
[[queues.consumers]]
queue = "cruz-jobs"
max_batch_size = 10
max_retries = 3

[[queues.producers]]
queue = "cruz-jobs"
binding = "JOBS_QUEUE"
```

For custom queue consumer workers, use `handleJobMessage` or `handleJobBatch`:

```typescript
import { handleJobBatch } from '@cruzjs/core/jobs/job-queue.consumer';

export default {
  async queue(batch, env, ctx) {
    const container = await bootstrapContainer(env);
    await handleJobBatch(batch.messages.map(m => ({ body: m.body })), container);
    batch.messages.forEach(m => m.ack());
  },
};
```

## Retry Logic

Jobs retry with exponential backoff when they fail and have attempts remaining:

- **Base delay**: 1000ms
- **Multiplier**: 2x
- **Max attempts**: Configurable per job (default: 3)

```
Attempt 1: Immediate
Attempt 2: After 2 seconds (1000 * 2^1)
Attempt 3: After 4 seconds (1000 * 2^2)
```

On failure, the consumer re-enqueues the job to `JOBS_QUEUE` for retry. CF Queues also have their own DLQ for messages that fail to process entirely.

## Querying Jobs

```typescript
const job = await jobService.getJob(jobId);
const jobs = await jobService.findByLookupKey('user-123', ['PENDING', 'PROCESSING']);
const jobs = await jobService.findByType('my-job', ['FAILED']);
const counts = await jobService.getJobCounts();
const canceledCount = await jobService.cancelByLookupKey('user-123');
```

## Scheduled/Delayed Jobs

Jobs with `scheduledFor` in the future are inserted into D1 but **not** enqueued immediately. A Cron Trigger should poll D1 for jobs where `scheduledFor <= now` and `status = PENDING` and enqueue them. This is the one place D1 polling remains, but it's a simple cron task.

## Best Practices

1. **Make handlers idempotent** — queue delivers at-least-once
2. **Use lookup keys** to group and query related jobs
3. **Keep payloads serializable** — stored as JSON in D1
4. **Return structured results** — `resultSummary` is stored in D1 for admin/debugging
5. **Set appropriate priorities** — stored in D1 for querying, but queue is FIFO
