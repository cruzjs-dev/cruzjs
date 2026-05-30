# /add

Add something to an existing feature. Specify what type.

## Types

- **field** — Add a new field to an existing resource (schema + service + validation + UI)
- **event** — Add a domain event to an existing resource
- **test** — Add unit or E2E tests for an existing feature
- **job** — Add a background job handler to an existing feature

## Required Input

- **Type**: `field`, `event`, `test`, or `job`
- **Feature/Resource**: The existing feature to add to (e.g., `task`)
- **Details**: Specific to the type (see below)

## Reference Docs

- `.claude/kb/09-EVENTS.md` — Event patterns
- `.claude/kb/12-JOBS.md` — Job handler patterns
- `.claude/kb/04-DATABASE-DRIZZLE.md` — Schema field types
- `.claude/kb/10-TESTING.md` — Test patterns

---

## /add field

Add a new field to an existing resource.

**Input**: field name + type (e.g., `priority: enum(LOW, MEDIUM, HIGH, URGENT)`, `dueDate: optional timestamp`)

**Steps:**

1. **Schema** (`apps/web/src/database/schema.ts`) — Add column, add enum if needed:

   ```typescript
   export const priorityEnum = pgEnum("Priority", [
     "LOW",
     "MEDIUM",
     "HIGH",
     "URGENT",
   ]);
   // In table: priority: priorityEnum('priority').default('MEDIUM').notNull()
   ```

2. **Migration**:

   ```bash
   cruz db generate
   cruz db migrate
   ```

3. **Service** — Include field in create/update methods and response mapping

4. **Validation** — Add to create/update Zod schemas:

   ```typescript
   priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM");
   ```

5. **Models** — Add to response type

6. **UI** — Update form component to include the field; update list/display if it should be visible

---

## /add event

Add a domain event that fires when something happens in a resource.

**Input**: resource name, event name (e.g., `task.completed`), payload fields

**Generate:**

1. **Event Class** (`apps/web/src/features/<resource>/events/<event-name>.event.ts`):

   ```typescript
   import { DomainEvent } from "@cruzjs/core/shared/events/domain-event";

   export class TaskCompletedEvent extends DomainEvent {
     constructor(
       public readonly taskId: string,
       public readonly orgId: string,
       public readonly completedById: string,
     ) {
       super();
     }
   }
   ```

2. **Update Events Index** (`apps/web/src/features/<resource>/events/index.ts`):

   ```typescript
   export * from "./task-completed.event";
   ```

3. **Emit in Service** — Inject `EventEmitterService`, emit after operation:

   ```typescript
   await this.events.emit(new TaskCompletedEvent(task.id, orgId, userId));
   ```

4. **Listener in Provider** (if side effects needed):
   ```typescript
   registerEventListeners(container: Container, events: EventEmitterService): void {
     events.on(TaskCompletedEvent, async (event) => {
       // handle side effect
     });
     // OR for heavy ops: events.onQueue(TaskCompletedEvent, ...)
   }
   ```

---

## /add test

Add tests for an existing feature.

**Input**: feature name, type (`unit` or `e2e`)

### Unit Tests (`tests/unit/features/<name>/<name>.service.test.ts`)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('<Name>Service', () => {
  let service: NameService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(), orderBy: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(), values: vi.fn().mockReturnThis(),
      returning: vi.fn(), update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(),
    };
    service = new NameService(mockDb);
  });

  it('should list by orgId', async () => { ... });
  it('should create with orgId and userId', async () => { ... });
  it('should delete by id and orgId', async () => { ... });
});
```

### E2E Tests (`tests/e2e/tests/<name>.flows.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('{Name} Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    // login steps
  });

  test('can view {name} list', async ({ page }) => { ... });
  test('can create a {name}', async ({ page }) => { ... });
  test('can edit a {name}', async ({ page }) => { ... });
  test('can delete a {name}', async ({ page }) => { ... });
});
```

**Run:**

```bash
cruz test          # unit tests
cruz test:e2e      # E2E tests
```

---

## /add job

Add a background job handler to an existing feature.

**Input**: jobType (e.g., `send-notification`), statuses (default: `PENDING`), feature/domain

**Generate:**

1. **Handler** (`apps/web/src/features/<domain>/handlers/<name>.handler.ts`):

   ```typescript
   import { injectable } from "inversify";
   import type {
     Job,
     JobHandler,
     JobHandlerMetadata,
     JobResult,
   } from "@cruzjs/core/jobs/job.types";

   type YourJobPayload = {
     /* fields */
   };

   @injectable()
   export class YourJobHandler implements JobHandler {
     readonly metadata: JobHandlerMetadata = {
       jobType: "your-job-type",
       statuses: ["PENDING"],
       description: "What this job does",
     };

     async run(job: Job): Promise<JobResult> {
       const payload = job.payload as unknown as YourJobPayload;
       try {
         // process
         return { success: true, summary: {} };
       } catch (error) {
         return {
           success: false,
           error: error instanceof Error ? error.message : "Unknown error",
         };
       }
     }
   }
   ```

2. **Job Creator** (`apps/web/src/features/<domain>/handlers/<name>.job.ts`):

   ```typescript
   import {
     JobPriority,
     type CreateJobInput,
   } from "@cruzjs/core/jobs/job.types";

   export function createYourJob(payload: YourJobPayload): CreateJobInput {
     return {
       type: "your-job-type",
       payload,
       priority: JobPriority.NORMAL,
       maxAttempts: 3,
     };
   }
   ```

3. **Register in Container**:

   ```typescript
   import { JOB_HANDLER } from "@cruzjs/core/jobs/job.container";
   options
     .bind<YourJobHandler>(JOB_HANDLER)
     .to(YourJobHandler)
     .inSingletonScope();
   ```

4. **Export** from feature's `index.ts`

## Examples

> Add a priority field (enum: LOW, MEDIUM, HIGH, URGENT) to the task resource, defaulting to MEDIUM

> Add a "task.assigned" event that fires when a task is assigned, with payload: taskId, orgId, assignedToId, assignedById

> Add unit tests for the task service covering list, create, update, and delete

> Add a job handler for "send-notification" that handles PENDING jobs in the notification feature
