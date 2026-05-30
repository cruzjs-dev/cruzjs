# Queue-Based Jobs Redesign

## Feature Overview

Redesign the background jobs system from a **D1-polling runner** to a **queue-first architecture**:

- **D1** = status tracking, payload storage, queryability (audit trail)
- **Cloudflare Queues** = communication/dispatch mechanism
- **Workers** = standalone queue consumers that do the actual processing

### What Changes
- `JobService.createJob()` writes to D1 **and** sends a queue message
- Queue consumer worker receives messages, resolves the handler, executes it, updates D1
- Remove: `JobRunner`, `JobDispatcher`, `JobTriggerService`, `RunJobEvent`/`ProcessJobsEvent`, polling worker script, `/api/jobs/process`

### What Stays
- `JobService` (CRUD + queue dispatch added)
- `JobHandlerRegistry` + `JOB_HANDLER` multi-injection pattern
- `JobHandler` interface (handlers unchanged)
- `jobs` D1 table (status tracking, audit trail)
- `ScheduledJobsService` (cleanup tasks)
- `jobRouter` (status queries)
- `/api/jobs/callback` (enhanced for queue consumer → D1 updates)
- `QueueService` (enhanced)

---

## Architecture

### Job Flow (New)

```
App code → JobService.createJob()
              ├── INSERT into D1 (status: PENDING)
              └── QueueService.send(JOBS_QUEUE, { jobId, type, priority })

Queue Consumer Worker (standalone)
  ← receives message from JOBS_QUEUE
  → UPDATE D1 (status: PROCESSING)
  → resolve handler from JobHandlerRegistry
  → handler.run(job)
  → UPDATE D1 (status: COMPLETED/FAILED)
  → if failed & retries remaining: re-queue with delay
```

### Queue Message Shape

```typescript
type JobQueueMessage = {
  jobId: string;
  type: string;
  priority: number;
  attempt: number;
};
```

The queue message is intentionally lightweight — the worker fetches the full job (with payload) from D1 by ID. This keeps queue messages small and means D1 is always the source of truth.

### Local Development

In local dev (no Cloudflare Queues available), `JobService` falls back to dispatching via a local in-process mechanism (direct handler invocation via `setImmediate`). The `QueueService.send()` already handles `null` queue gracefully — we extend this with a local fallback.

---

## Implementation Task List

### Phase 1: Queue Message Types & QueueService Enhancement

**1.1 Define job queue message type**
- [ ] Add `JobQueueMessage` type to `packages/core/src/queues/queue.types.ts`
- [ ] Fields: `jobId`, `type`, `priority`, `attempt`

**1.2 Add job queue constant**
- [ ] Add `JOBS_QUEUE` binding name constant to `packages/core/src/queues/queue.types.ts`
- [ ] Default binding name: `JOBS_QUEUE`

### Phase 2: JobService — Queue Dispatch on Creation

**2.1 Inject QueueService into JobService**
- [ ] Add `QueueService` dependency to `JobService` constructor
- [ ] Import `CloudflareContext` for queue binding access

**2.2 Dispatch to queue after D1 insert in `createJob()`**
- [ ] After inserting into D1, send `JobQueueMessage` to `JOBS_QUEUE`
- [ ] If queue unavailable (local dev), fall back to local dispatch (see 2.4)
- [ ] Queue dispatch failure should **not** fail the job creation — log warning, job stays PENDING

**2.3 Dispatch to queue after D1 insert in `createJobs()` (batch)**
- [ ] After batch insert, send batch of `JobQueueMessage` via `QueueService.sendBatch()`
- [ ] Same fallback behavior as single create

**2.4 Local development fallback**
- [ ] When queue is unavailable, use `setImmediate` to process locally via handler registry
- [ ] Extract local dispatch logic into a private method `dispatchLocally(job)`
- [ ] This replaces the `JobTriggerService` functionality

**2.5 Add queue dispatch to `retryJob()`**
- [ ] After updating D1 status back to PENDING, re-enqueue to `JOBS_QUEUE`
- [ ] Include incremented `attempt` count in message

### Phase 3: Queue Consumer Worker

**3.1 Create queue consumer worker scaffold**
- [ ] Create `packages/core/src/jobs/job-queue.consumer.ts`
- [ ] Export a `handleJobMessage(message: JobQueueMessage, container: Container)` function
- [ ] This is the core processing logic, independent of CF Worker boilerplate

**3.2 Consumer logic**
```
1. Fetch job from D1 by jobId
2. If job not found or already COMPLETED/FAILED → ack (discard)
3. UPDATE D1: status=PROCESSING, attempts++, startedAt=now, processedBy=workerId
4. Resolve handler from JobHandlerRegistry by job.type
5. If no handler → fail job, ack
6. Execute handler.run(job)
7. On success → UPDATE D1: status=COMPLETED, completedAt=now, resultSummary
8. On failure:
   a. If attempts < maxAttempts → UPDATE D1: status=PENDING, re-enqueue with backoff delay
   b. If attempts >= maxAttempts → UPDATE D1: status=FAILED, error message
9. Ack message
```

**3.3 Scaffold external worker (template)**
- [ ] Update `cruz new queue-worker` template to include job consumer setup
- [ ] The external worker wires up: DI container, schema, handler registry, then calls `handleJobMessage`
- [ ] Add `wrangler.toml` snippet for `JOBS_QUEUE` consumer binding

**3.4 Add `apps/web/` queue consumer handler**
- [ ] In `apps/web/src/server.cloudflare.ts`, add `queue()` export for CF Pages queue consumer
- [ ] Wire up container bootstrap + `handleJobMessage`

### Phase 4: Remove Polling Infrastructure

**4.1 Remove `JobRunner`**
- [ ] Delete `packages/core/src/jobs/job-runner.service.ts`
- [ ] Remove from `job.module.ts` providers

**4.2 Remove `JobTriggerService`**
- [ ] Delete `packages/core/src/jobs/job-trigger.service.ts`
- [ ] Remove from `job.module.ts` providers

**4.3 Remove `JobDispatcher`**
- [ ] Delete `packages/core/src/jobs/job-dispatcher.service.ts`
- [ ] Remove from `job.module.ts` providers
- [ ] The job locking/completion/retry logic moves to `job-queue.consumer.ts`

**4.4 Remove job events**
- [ ] Delete `packages/core/src/jobs/events/run-job.event.ts`
- [ ] Delete `packages/core/src/jobs/events/run-job.listener.ts`
- [ ] Remove `registerJobEventListeners()` call from wherever it's registered
- [ ] Delete `packages/core/src/jobs/events/` directory (or keep index if other events exist)

**4.5 Remove polling worker script**
- [ ] Delete `apps/web/scripts/job-worker.ts`
- [ ] Remove `npm run jobs` / `npm run jobs:once` scripts from `apps/web/package.json`

**4.6 Remove `/api/jobs/process` endpoint**
- [ ] Delete `packages/core/src/api/jobs-process.ts`
- [ ] Remove route registration

**4.7 Update `/api/jobs/callback`**
- [ ] Keep this endpoint — external workers can still use it
- [ ] Add `resultSummary` field support to the callback payload

### Phase 5: Update Event Emitter Queued Listeners

**5.1 Update `EventEmitterService.emit()` queued listener path**
- [ ] In `packages/core/src/shared/events/event-emitter.service.server.ts`
- [ ] The `jobService.createJob()` call already exists — it will now automatically dispatch to queue
- [ ] No code change needed here (it goes through `JobService.createJob()` which handles dispatch)
- [ ] Verify this works end-to-end

### Phase 6: Update Module & Exports

**6.1 Update `JobModule`**
- [ ] Remove `JobRunner`, `JobTriggerService`, `JobDispatcher` from providers
- [ ] Add `QueueService` if not already registered elsewhere
- [ ] Export `handleJobMessage` for external workers
- [ ] Update module docstring

**6.2 Update barrel exports**
- [ ] Update `packages/core/src/jobs/index.ts` (if exists) to remove deleted exports
- [ ] Export new `JobQueueMessage` type and `handleJobMessage`

**6.3 Update config schema**
- [ ] Add `JOBS_QUEUE` to the CF bindings config in `cruz.config.ts`
- [ ] Add queue binding to `wrangler.toml` template

### Phase 7: Documentation & KB

**7.1 Update KB**
- [ ] Rewrite `.claude/kb/12-JOBS.md` to reflect queue-based architecture
- [ ] Remove references to `JobRunner`, `JobDispatcher`, `JobTriggerService`
- [ ] Document queue consumer setup
- [ ] Document local dev fallback behavior

---

## Key Design Decisions

### Why lightweight queue messages (jobId only, not full payload)?
- Queue messages have size limits
- D1 is the source of truth — avoids stale data if job is modified between creation and processing
- Simpler retry logic — just re-enqueue the jobId

### Why local fallback instead of requiring queues in dev?
- `wrangler dev` can run queues locally, but adds complexity
- Most devs want `cruz dev` to just work without queue setup
- Local fallback uses the same handler code path, just invoked directly

### What about priority ordering?
- CF Queues are FIFO — they don't support priority ordering natively
- Options: (a) multiple queues per priority level, (b) accept FIFO ordering (simplest), (c) consumer re-sorts
- **Recommendation**: Start with single queue (FIFO). Priority is stored in D1 for querying/admin purposes. If ordering matters, add priority queues later (JOBS_QUEUE_CRITICAL, JOBS_QUEUE_NORMAL, JOBS_QUEUE_BACKGROUND)

### What about scheduled/delayed jobs?
- `scheduledFor` in the future: job is inserted in D1 with PENDING status but **not** enqueued immediately
- A separate scheduled worker (Cron Trigger) polls D1 for jobs where `scheduledFor <= now` and `status = PENDING` and enqueues them
- This is the one case where D1 polling remains — but it's a lightweight cron, not a job runner

---

## Files Modified/Created/Deleted

| Action | File |
|--------|------|
| **Modify** | `packages/core/src/queues/queue.types.ts` |
| **Modify** | `packages/core/src/jobs/job.service.ts` |
| **Modify** | `packages/core/src/jobs/job.module.ts` |
| **Modify** | `packages/core/src/api/jobs-callback.ts` |
| **Modify** | `apps/web/src/server.cloudflare.ts` |
| **Modify** | `apps/web/wrangler.toml` |
| **Create** | `packages/core/src/jobs/job-queue.consumer.ts` |
| **Delete** | `packages/core/src/jobs/job-runner.service.ts` |
| **Delete** | `packages/core/src/jobs/job-dispatcher.service.ts` |
| **Delete** | `packages/core/src/jobs/job-trigger.service.ts` |
| **Delete** | `packages/core/src/jobs/events/run-job.event.ts` |
| **Delete** | `packages/core/src/jobs/events/run-job.listener.ts` |
| **Delete** | `packages/core/src/api/jobs-process.ts` |
| **Delete** | `apps/web/scripts/job-worker.ts` |
