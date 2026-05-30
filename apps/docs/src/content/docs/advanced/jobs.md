---
title: Background Jobs
description: Process work asynchronously with CruzJS's job system — create handlers, dispatch jobs with priorities, and leverage automatic retry with exponential backoff.
---

CruzJS includes a background job processing system for work that should not block HTTP responses. Jobs are stored in D1, processed in batches, and automatically retried on failure with exponential backoff.

## Job Lifecycle

```
PENDING → PROCESSING → COMPLETED
                    ↓
                FAILED (after max retries)
```

Jobs start as `PENDING`, move to `PROCESSING` when picked up by a runner, and end as either `COMPLETED` or `FAILED`. Failed jobs are retried up to `maxAttempts` times before being marked as permanently failed.

## Creating Job Handlers

A job handler is an `@Injectable()` class that implements the `JobHandler` interface. Each handler declares a `jobType` it processes and a `run()` method.

```typescript
// features/reports/handlers/generate-report.handler.ts
import { Injectable, Inject } from '@cruzjs/core/di';
import type { Job } from '@cruzjs/core/jobs/jobs.schema';
import type { JobHandler, JobHandlerMetadata, JobResult } from '@cruzjs/core/jobs/job.types';
import { ReportService } from '../report.service';

type GenerateReportPayload = {
  orgId: string;
  reportType: 'monthly' | 'quarterly' | 'annual';
  startDate: string;
  endDate: string;
};

@Injectable()
export class GenerateReportHandler implements JobHandler {
  readonly metadata: JobHandlerMetadata = {
    jobType: 'generate-report',
    statuses: ['PENDING'],
    description: 'Generates PDF reports for organizations',
  };

  constructor(
    @Inject(ReportService) private readonly reportService: ReportService,
  ) {}

  async run(job: Job): Promise<JobResult> {
    const payload = job.payload as unknown as GenerateReportPayload;

    try {
      const report = await this.reportService.generate(
        payload.orgId,
        payload.reportType,
        payload.startDate,
        payload.endDate,
      );

      return {
        success: true,
        summary: {
          reportId: report.id,
          pages: report.pageCount,
          generatedAt: new Date().toISOString(),
        },
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

The `metadata.jobType` string must match the `type` field used when creating jobs. The `statuses` array controls which job statuses this handler processes (typically `['PENDING']`).

## Registering Handlers

Register handlers using the `JOB_HANDLER` token with `multi: true` in your module:

```typescript
// features/reports/report.module.ts
import { Module } from '@cruzjs/core/di';
import { JOB_HANDLER } from '@cruzjs/core/jobs/job.container';
import { ReportService } from './report.service';
import { GenerateReportHandler } from './handlers/generate-report.handler';

@Module({
  providers: [
    ReportService,
    { provide: JOB_HANDLER, useClass: GenerateReportHandler, multi: true },
  ],
})
export class ReportModule {}
```

The `multi: true` flag is required because multiple handlers are bound to the same `JOB_HANDLER` token. The `JobHandlerRegistry` collects all of them at boot time.

## Dispatching Jobs

Use `JobService` to create jobs from anywhere in your application:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { JobService, JobPriority } from '@cruzjs/core';

@Injectable()
export class ReportRequestService {
  constructor(
    @Inject(JobService) private readonly jobService: JobService,
  ) {}

  async requestReport(orgId: string, reportType: string) {
    const job = await this.jobService.createJob({
      type: 'generate-report',
      payload: {
        orgId,
        reportType,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      },
      priority: JobPriority.NORMAL,
      maxAttempts: 3,
      lookupKey: `org-${orgId}`,         // for querying related jobs later
      scheduledFor: new Date(),          // optional: schedule for later
    });

    return job;
  }
}
```

### Creating Multiple Jobs

```typescript
const jobs = await this.jobService.createJobs([
  { type: 'generate-report', payload: { orgId, reportType: 'monthly' } },
  { type: 'generate-report', payload: { orgId, reportType: 'quarterly' } },
]);
```

## Job Priorities

Jobs are processed in priority order. Higher-priority jobs run first.

```typescript
import { JobPriority } from '@cruzjs/core/jobs/job.types';

JobPriority.CRITICAL    // 100 — runs first (password resets, security alerts)
JobPriority.HIGH        // 75  — important but not urgent (transactional emails)
JobPriority.NORMAL      // 50  — default (reports, notifications)
JobPriority.LOW         // 25  — can wait (data sync, cleanup)
JobPriority.BACKGROUND  // 0   — runs last (analytics, archival)
```

```typescript
// Critical: user-facing, time-sensitive
await jobService.createJob({
  type: 'send-email',
  payload: { to: user.email, template: 'password-reset', data: { token } },
  priority: JobPriority.CRITICAL,
});

// Background: can wait hours
await jobService.createJob({
  type: 'analytics-sync',
  payload: { orgId },
  priority: JobPriority.BACKGROUND,
});
```

## Retry Logic

Failed jobs are automatically retried with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 2 seconds (1000ms x 2^1) |
| 3 | 4 seconds (1000ms x 2^2) |
| 4 | 8 seconds (1000ms x 2^3) |

The base delay is 1000ms with a 2x multiplier. The maximum number of attempts is configurable per job (default: 3).

## Making Jobs Idempotent

Jobs may be retried, so handlers should be idempotent. Check whether work has already been done before proceeding:

```typescript
async run(job: Job): Promise<JobResult> {
  const payload = job.payload as unknown as GenerateReportPayload;

  // Check if this report was already generated
  const existing = await this.reportService.findByJobId(job.id);
  if (existing) {
    return { success: true, summary: { skipped: true, reportId: existing.id } };
  }

  // Generate and record the job ID to prevent duplicates
  const report = await this.reportService.generateAndRecord(payload, job.id);
  return { success: true, summary: { reportId: report.id } };
}
```

## Querying Jobs

`JobService` provides methods for monitoring and managing jobs:

```typescript
// Get a single job by ID
const job = await jobService.getJob(jobId);

// Find jobs by lookup key and status
const pendingJobs = await jobService.findByLookupKey('org-123', ['PENDING', 'PROCESSING']);

// Find jobs by type
const failedEmails = await jobService.findByType('send-email', ['FAILED']);

// Get aggregate counts
const counts = await jobService.getJobCounts();
// { pending: 5, processing: 2, completed: 100, failed: 3, total: 110 }

// Cancel all pending jobs for a lookup key
const cancelledCount = await jobService.cancelByLookupKey('org-123');
```

## Job Results

Return a `summary` object from your handler to store diagnostic information. Results are persisted in the `resultSummary` column and visible in the admin dashboard.

```typescript
return {
  success: true,
  summary: {
    emailsSent: 5,
    recipients: ['user1@example.com', 'user2@example.com'],
    durationMs: 1234,
  },
};
```

For failures, include an `error` string:

```typescript
return {
  success: false,
  error: 'External API returned 503',
};
```

## Built-in Handlers

### SendEmailJobHandler

Processes `send-email` jobs using the `EmailService` and template system:

```typescript
await jobService.createJob({
  type: 'send-email',
  payload: {
    to: 'user@example.com',
    template: 'welcome',
    data: { userName: 'Jane' },
  },
  priority: JobPriority.HIGH,
});
```

If email is not configured (missing `EMAIL_FROM` or provider credentials), the handler completes successfully with a warning rather than failing the job.

### EventListenerJobHandler

Automatically created when you use `events.onQueue()`. You do not need to create or register this handler manually:

```typescript
// This creates a background job under the hood
events.onQueue(InvoiceCreatedEvent, async (event) => {
  await slackService.postMessage(`New invoice: ${event.invoiceId}`);
});
```

## Processing Jobs

### Development

```bash
# Trigger job processing via API
curl -X POST http://localhost:3000/api/jobs/process
```

### Production

Jobs are processed by a scheduled worker. The job runner picks up pending jobs in priority order, dispatches them to the appropriate handler, and updates their status.

## Testing Job Handlers

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateReportHandler } from './generate-report.handler';

describe('GenerateReportHandler', () => {
  let handler: GenerateReportHandler;
  let mockReportService: { generate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockReportService = { generate: vi.fn() };
    handler = new GenerateReportHandler(mockReportService as any);
  });

  it('returns success with report details', async () => {
    mockReportService.generate.mockResolvedValue({ id: 'rpt-1', pageCount: 12 });

    const job = { id: 'job-1', payload: { orgId: 'org-1', reportType: 'monthly' } };
    const result = await handler.run(job as any);

    expect(result.success).toBe(true);
    expect(result.summary?.reportId).toBe('rpt-1');
  });

  it('returns failure on error', async () => {
    mockReportService.generate.mockRejectedValue(new Error('Timeout'));

    const job = { id: 'job-2', payload: { orgId: 'org-1', reportType: 'monthly' } };
    const result = await handler.run(job as any);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Timeout');
  });
});
```

## Best Practices

1. **Use lookup keys** to group related jobs. This makes it easy to query, monitor, and cancel jobs for a specific entity (e.g., `org-${orgId}` or `user-${userId}`).

2. **Set appropriate priorities.** User-facing operations (password resets, transactional emails) should be `CRITICAL` or `HIGH`. Analytics and cleanup can be `BACKGROUND`.

3. **Make handlers idempotent.** Jobs may be retried after partial completion. Always check whether work has already been done before proceeding.

4. **Return meaningful results.** Include diagnostic data in `summary` so you can debug issues from the admin dashboard without reading logs.

5. **Handle errors gracefully.** Catch exceptions in your handler and return `{ success: false, error: message }` rather than letting exceptions propagate.

6. **Keep payloads small.** Store IDs and references in the payload, not large data blobs. The handler can fetch full data from the database when it runs.
