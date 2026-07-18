---
title: "08 — Background Jobs"
description: Send a task assignment email via the job queue with JobService.
---

# Chapter 08 — Background Jobs

When a task is assigned to someone, send them an email notification — without blocking the HTTP response. Use the CruzJS job queue.

## Define the job type

Add a job type constant to `packages/core/src/tasks/tasks.jobs.ts`:

```typescript
export const TASK_ASSIGNED_JOB_TYPE = 'TASK_ASSIGNED';

export interface TaskAssignedPayload {
  taskId: string;
  taskTitle: string;
  assigneeEmail: string;
  assigneeName: string;
  orgName: string;
}
```

## Write the job handler

```typescript
// packages/core/src/tasks/handlers/task-assigned.handler.ts
import { injectable, inject } from 'inversify';
import { JobHandler, JobHandlerMetadata, Job, JobResult } from '@cruzjs/core';
import { EMAIL_SERVICE, EmailService } from '@cruzjs/core';
import { TASK_ASSIGNED_JOB_TYPE, TaskAssignedPayload } from '../tasks.jobs';

@injectable()
export class TaskAssignedHandler implements JobHandler {
  readonly metadata: JobHandlerMetadata = {
    jobType: TASK_ASSIGNED_JOB_TYPE,
    statuses: ['PENDING'],
    description: 'Notify a user that a task was assigned to them',
  };

  constructor(@inject(EMAIL_SERVICE) private readonly email: EmailService) {}

  async run(job: Job): Promise<JobResult> {
    const { taskTitle, assigneeEmail, assigneeName, orgName } =
      job.payload as unknown as TaskAssignedPayload;

    await this.email.sendEmail(
      assigneeEmail,
      `Task assigned: ${taskTitle}`,
      `<p>Hi ${assigneeName},</p>
       <p>You were assigned to <strong>${taskTitle}</strong> in ${orgName}.</p>`,
    );

    return { success: true };
  }
}
```

## Register the handler

In `packages/core/src/tasks/tasks.module.ts`:

```typescript
import { JOB_HANDLER } from '@cruzjs/core';
import { TaskAssignedHandler } from './handlers/task-assigned.handler';

@Module({
  providers: [
    // ...existing providers...
    { provide: JOB_HANDLER, useClass: TaskAssignedHandler, multi: true },
  ],
})
export class TasksModule {}
```

## Enqueue from the service

When a task is assigned, enqueue the job:

```typescript
// In TasksService.update()
if (input.assigneeId && input.assigneeId !== existingTask.assigneeId) {
  await this.jobService.createJob({
    type: TASK_ASSIGNED_JOB_TYPE,
    payload: {
      taskId: id,
      taskTitle: existingTask.title,
      assigneeEmail: assignee.email,
      assigneeName: assignee.name,
      orgName: org.name,
    },
  });
}
```

The job runs asynchronously — the HTTP response returns immediately, the email sends in the background.

## Test with `cruz console`

Trigger a job manually without going through the UI:

```bash
cruz console
> const jobService = container.get(JobService)
> await jobService.createJob({ type: 'TASK_ASSIGNED', payload: { ... } })
```

Check `/dev/emails` to see the email that was sent.

## Monitor jobs

Visit `/admin/jobs` in your running app to see the job queue — pending jobs, running jobs, failed jobs, and their payloads. Failed jobs can be retried from this UI.

## What we built

- Defined a job type and payload interface
- Wrote a job handler that sends an email
- Enqueued the job from a service mutation

**Next:** [Chapter 09 — File Uploads](/tutorial/09-file-uploads/)

import { Steps, Aside } from '@astrojs/starlight/components';

Your todos app works, but right now nothing happens when a new user signs up beyond creating their account. In a real app, you would send a welcome email, track analytics, provision defaults, or enqueue onboarding tasks.

In this step, you will:

1. Listen to the built-in `UserRegisteredEvent` domain event.
2. Create a background job handler that "sends" a welcome email.
3. Wire the event listener to enqueue the job automatically.
4. Verify the job runs in local development.

## Why Background Jobs?

You could send the welcome email directly inside the registration handler, but that creates problems:

- **Slow responses** — the user waits while your app talks to an email API (100-500ms).
- **Fragile** — if the email API is down, registration fails entirely.
- **No retries** — a transient network error means the email is lost forever.

Background jobs solve all three problems. The registration completes immediately, and the email is sent asynchronously with automatic retries.

## Domain Events

CruzJS fires domain events at key moments in the application lifecycle. Events are fire-and-forget notifications: the code that fires the event does not wait for listeners to finish.

Built-in events include:

| Event | Fires when |
|-------|------------|
| `UserRegisteredEvent` | A new user completes registration |
| `UserLoggedInEvent` | A user logs in successfully |
| `OrgCreatedEvent` | A new organization is created |
| `MemberInvitedEvent` | A user is invited to an organization |

You can also define custom events for your own features. For this tutorial, `UserRegisteredEvent` is all you need.

## Step 1: Create the Job Handler

Create the directory for the welcome feature:

```bash
mkdir -p src/features/welcome
```

Create `src/features/welcome/welcome-email.handler.ts`:

```typescript
import { injectable, inject } from 'inversify';
import { JobHandler, JobResult, JOB_HANDLER } from '@cruzjs/core/jobs';

export const WELCOME_EMAIL_JOB = 'todos/welcome-email';

export type WelcomeEmailPayload = {
  userId: string;
  email: string;
  name: string | null;
};

@injectable()
export class WelcomeEmailHandler implements JobHandler {
  metadata = {
    type: WELCOME_EMAIL_JOB,
    description: 'Send welcome email to new user',
  };

  async run(job: { payload: WelcomeEmailPayload }): Promise<JobResult> {
    const { email, name } = job.payload;

    // In production, you would call your email service here:
    //   await this.emailService.send({
    //     to: email,
    //     template: 'welcome',
    //     data: { name },
    //   });
    //
    // For this tutorial, we log to the console to prove the job ran.
    console.log(`Welcome email sent to ${name ?? email} <${email}>`);

    return { success: true, summary: { recipient: email } };
  }
}
```

### Anatomy of a Job Handler

A job handler is a class that implements the `JobHandler` interface:

- **`metadata.type`** — a unique string that identifies this job type. Use a namespaced format (`feature/job-name`) to avoid collisions.
- **`metadata.description`** — a human-readable description shown in admin tools and logs.
- **`run(job)`** — the actual work. Receives the job payload and returns a `JobResult`.
- **`JobResult`** — an object with `success: boolean` and an optional `summary` for logging. If `success` is `false`, the job will be retried.

<Aside type="tip">
Job handlers must be idempotent. If a job runs twice (due to a retry), the result should be the same. For email, this might mean checking a "welcome_sent" flag before sending.
</Aside>

## Step 2: Create the Event Listener

The event listener bridges the gap between "a user registered" and "enqueue a welcome email job."

Create `src/features/welcome/welcome-email.listener.ts`:

```typescript
import { injectable, inject } from 'inversify';
import { UserRegisteredEvent } from '@cruzjs/core/auth/events';
import { JobService } from '@cruzjs/core/jobs';
import { WELCOME_EMAIL_JOB } from './welcome-email.handler';
import type { WelcomeEmailPayload } from './welcome-email.handler';

@injectable()
export class WelcomeEmailListener {
  constructor(
    @inject(JobService) private readonly jobService: JobService,
  ) {}

  async handle(event: UserRegisteredEvent): Promise<void> {
    await this.jobService.createJob<WelcomeEmailPayload>({
      type: WELCOME_EMAIL_JOB,
      payload: {
        userId: event.userId,
        email: event.email,
        name: event.name,
      },
    });
  }
}
```

### How This Works

1. When a user registers, the auth system fires `UserRegisteredEvent` with the user's ID, email, and name.
2. CruzJS looks up all listeners registered for `UserRegisteredEvent` and calls their handler method.
3. `WelcomeEmailListener.handle()` calls `jobService.createJob()`, which:
   - Inserts a row into the `Job` table with status `PENDING`.
   - In local dev, immediately picks up and runs the job in-process.
   - In production, enqueues the job to a Cloudflare Queue for async processing.
4. The `WelcomeEmailHandler.run()` method executes and logs the message.

The event listener does not send the email directly. It creates a job, which is a durable record that will be processed with retries. If the job fails on the first attempt, it will be retried automatically.

## Step 3: Create the Module

Create `src/features/welcome/welcome.module.ts`:

```typescript
import { Module } from '@cruzjs/core/di';
import { JOB_HANDLER } from '@cruzjs/core/jobs';
import { UserRegisteredEvent } from '@cruzjs/core/auth/events';
import { WelcomeEmailHandler } from './welcome-email.handler';
import { WelcomeEmailListener } from './welcome-email.listener';

@Module({
  providers: [WelcomeEmailHandler, WelcomeEmailListener],
  events: [
    {
      event: UserRegisteredEvent,
      useClass: WelcomeEmailListener,
      method: 'handle',
    },
  ],
  jobHandlers: [
    { provide: JOB_HANDLER, useClass: WelcomeEmailHandler, multi: true },
  ],
})
export class WelcomeModule {}
```

### Module Configuration Explained

- **`providers`** — registers both classes in the DI container so they can be instantiated and have their dependencies injected.
- **`events`** — tells CruzJS to call `WelcomeEmailListener.handle()` whenever a `UserRegisteredEvent` fires. You can register multiple listeners for the same event.
- **`jobHandlers`** — registers the handler with the job processing system. The `multi: true` option allows multiple handlers to be registered under the same `JOB_HANDLER` token (each handling a different job type).

## Step 4: Create a Barrel Export

Create `src/features/welcome/index.ts`:

```typescript
export { WelcomeModule } from './welcome.module';
```

## Step 5: Register the Module

Open `src/app.server.ts` and add `WelcomeModule`:

```typescript
import 'reflect-metadata';
import { DrizzleService } from '@cruzjs/core/shared/database/drizzle.service';
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';
import { TodosModule } from './features/todos';
import { WelcomeModule } from './features/welcome';  // add this
import * as schema from './database/schema';

DrizzleService.setSchema(schema);

registerModules([
  StartModule,
  TodosModule,
  WelcomeModule,  // add this
]);
```

That is all the code you need. No queue configuration, no worker setup, no infrastructure changes for local development.

## Step 6: Test It

<Steps>

1. Make sure the dev server is running: `cruz dev`

2. Open your browser and register a new user account (or use the registration page at `/auth/register`).

3. Check the terminal where `cruz dev` is running. You should see:

   ```
   Welcome email sent to Jane <jane@example.com>
   ```

4. Verify the job was recorded in the database:

   ```bash
   cruz db query "SELECT id, type, status, summary FROM Job ORDER BY createdAt DESC LIMIT 5"
   ```

   You should see a row like:

   ```
   id          | type                  | status    | summary
   ------------|----------------------|-----------|-------------------
   clx1abc...  | todos/welcome-email  | COMPLETED | {"recipient":"jane@example.com"}
   ```

</Steps>

<Aside type="tip">
In local development, jobs run immediately in the same process as your dev server. There is no queue to configure. This makes the development experience seamless — you write the handler, register it, and it just works.
</Aside>

## Job Lifecycle

Every job moves through a state machine:

```
PENDING → PROCESSING → COMPLETED
                    ↘ FAILED → PENDING (retry)
```

1. **PENDING** — the job is created and waiting to be picked up.
2. **PROCESSING** — a worker has claimed the job and is running it.
3. **COMPLETED** — the handler returned `{ success: true }`. The job is done.
4. **FAILED** — the handler threw an error or returned `{ success: false }`. The job will be retried.

### Retry Logic

Failed jobs are retried with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1st retry | 10 seconds |
| 2nd retry | 60 seconds |
| 3rd retry | 5 minutes |

After 3 failed attempts, the job is marked as `DEAD` and no further retries are attempted. You can monitor dead jobs in the database and investigate failures.

## Production: Cloudflare Queues

In production, jobs are processed through [Cloudflare Queues](https://developers.cloudflare.com/queues/) for true asynchronous processing. The transition is automatic — no code changes needed.

When you deploy with `cruz deploy`, CruzJS:

1. Creates a Cloudflare Queue if one does not exist.
2. Configures the queue consumer in your `wrangler.toml`.
3. Routes `jobService.createJob()` calls to the queue instead of in-process execution.

The queue consumer picks up messages and runs the same `WelcomeEmailHandler.run()` method. Your handler code is identical in both environments.

<Aside type="caution">
Cloudflare Queues require a Workers Paid plan ($5/month). In the free tier, jobs will still work but are processed in-process on each request (same as local dev). For most small apps, this is fine.
</Aside>

## Adding a Real Email Service

To actually send emails in production, inject an email service into your handler:

```typescript
import { injectable, inject } from 'inversify';
import { JobHandler, JobResult } from '@cruzjs/core/jobs';
import { EmailService } from '@cruzjs/core/email';
import type { WelcomeEmailPayload } from './welcome-email.handler';

export const WELCOME_EMAIL_JOB = 'todos/welcome-email';

@injectable()
export class WelcomeEmailHandler implements JobHandler {
  metadata = {
    type: WELCOME_EMAIL_JOB,
    description: 'Send welcome email to new user',
  };

  constructor(
    @inject(EmailService) private readonly email: EmailService,
  ) {}

  async run(job: { payload: WelcomeEmailPayload }): Promise<JobResult> {
    const { email, name } = job.payload;

    await this.email.send({
      to: email,
      subject: 'Welcome to My Todos!',
      template: 'welcome',
      data: { name: name ?? 'there' },
    });

    return { success: true, summary: { recipient: email } };
  }
}
```

CruzJS supports Resend, Postmark, and SendGrid out of the box. See the [Email documentation](/advanced/email) for setup instructions.

## Creating Custom Events

If you want to fire events from your own features (for example, when a todo is completed), define a custom event class:

```typescript
// src/features/todos/events/todo-completed.event.ts
export class TodoCompletedEvent {
  constructor(
    public readonly todoId: string,
    public readonly orgId: string,
    public readonly completedById: string,
  ) {}
}
```

Fire it from your service:

```typescript
import { EventBus } from '@cruzjs/core/events';

@Injectable()
export class TodosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(EventBus) private readonly events: EventBus,
  ) {}

  async complete(id: string, orgId: string, userId: string) {
    const [todo] = await this.db
      .update(todos)
      .set({ completed: true, updatedAt: new Date() })
      .where(and(eq(todos.id, id), eq(todos.orgId, orgId)))
      .returning();

    if (todo) {
      await this.events.emit(new TodoCompletedEvent(id, orgId, userId));
    }

    return todo;
  }
}
```

Then register listeners for `TodoCompletedEvent` in your module, exactly as you did for `UserRegisteredEvent`.

## File Structure

After this step, your welcome feature looks like:

```
src/features/welcome/
  index.ts                      # barrel export
  welcome.module.ts             # module registration
  welcome-email.handler.ts      # job handler
  welcome-email.listener.ts     # event listener
```

This is a clean, self-contained feature. The welcome module knows nothing about how registration works — it just listens for the event and enqueues a job. If you remove the module from `app.server.ts`, the registration flow continues to work without the welcome email.

---

Next: [Testing →](/tutorial/09-testing)
