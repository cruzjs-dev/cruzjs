# Events, Jobs & Queues

## Domain Events

### Create Event Class

```typescript
// src/features/notes/events/note-created.event.ts
import { AppEvent } from '@cruzjs/core/shared/events/event';

export class NoteCreatedEvent extends AppEvent {
  constructor(
    public readonly noteId: string,
    public readonly userId: string,
    public readonly title: string,
  ) {
    super();
  }
}
```

### Dispatch Events

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { EventEmitterService } from '@cruzjs/core/shared/events/event-emitter.service.server';

@Injectable()
export class NotesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(EventEmitterService) private readonly events: EventEmitterService,
  ) {}

  async create(userId: string, input: CreateInput) {
    const [note] = await this.db.insert(notes).values({ userId, ...input }).returning();
    await this.events.dispatch(new NoteCreatedEvent(note.id, userId, note.title));
    return note;
  }
}
```

### Register Listeners

In `@Module`:

```typescript
@Module({
  providers: [NotesService],
  trpcRouters: { notes: notesRouter },
  events: [
    { event: NoteCreatedEvent, listener: onNoteCreated },
    { event: NoteCreatedEvent, listener: sendNoteNotification },
  ],
})
export class NotesModule {}
```

Listener functions:

```typescript
export async function onNoteCreated(event: NoteCreatedEvent): Promise<void> {
  const container = await getAppContainer();
  const service = container.resolve(SomeService);
  await service.handleNewNote(event.noteId);
}
```

### Synchronous vs Queued

```typescript
// Synchronous — executes in same request
events.on(NoteCreatedEvent, async (event) => { ... });

// Queued — executes as background job
events.onQueue(NoteCreatedEvent, async (event) => { ... });
```

### Built-in Events

From `@cruzjs/core`:
- `IdentityCreatedEvent`, `UserRegisteredEvent`, `UserLoggedInEvent`
- `SessionCreatedEvent`, `EmailVerifiedEvent`
- `JobCreatedEvent`, `JobCompletedEvent`, `JobFailedEvent`

From `@cruzjs/saas`:
- `OrganizationCreatedEvent`, `OrganizationDeletedEvent`
- `MemberAddedEvent`, `MemberRemovedEvent`, `MemberRoleChangedEvent`
- `InvitationCreatedEvent`, `InvitationAcceptedEvent`

## Background Jobs

For durable, retryable work use the job system below. For lightweight fire-and-forget work inside a request (e.g. sending a notification) that doesn't need persistence or retries, prefer `runInBackground` — it lets the promise finish after the response returns:

```typescript
import { runInBackground } from '@cruzjs/core/background';

runInBackground(notify(userId)); // survives after the response; never awaited on the request path
```

### Create Job Handler

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import type { Job, JobHandler, JobHandlerMetadata, JobResult } from '@cruzjs/core/jobs';

@Injectable()
export class MyJobHandler implements JobHandler {
  readonly metadata: JobHandlerMetadata = {
    jobType: 'my-job',
    statuses: ['PENDING'],
  };

  constructor(@Inject(MyService) private readonly service: MyService) {}

  async run(job: Job): Promise<JobResult> {
    try {
      await this.service.process(job.payload);
      return { success: true, summary: { processedAt: new Date().toISOString() } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
  }
}
```

### Register Job Handler (Multi-Injection)

```typescript
import { JOB_HANDLER } from '@cruzjs/core/jobs';

@Module({
  providers: [
    MyService,
    { provide: JOB_HANDLER, useClass: MyJobHandler, multi: true },
  ],
})
export class MyModule {}
```

### Create Jobs

```typescript
import { JobService, JobPriority } from '@cruzjs/core/jobs';

const container = await getAppContainer();
const jobService = container.get(JobService);

await jobService.createJob({
  type: 'my-job',
  payload: { userId: 'user-123', data: { foo: 'bar' } },
  priority: JobPriority.NORMAL,  // CRITICAL=100, HIGH=75, NORMAL=50, LOW=25, BACKGROUND=0
  maxAttempts: 3,
  lookupKey: 'user-123',
});
```

## Cloudflare Queues

### Send Messages (Producer)

```typescript
import { CloudflareContext } from '@cruzjs/core/shared/cloudflare/context';

const queue = CloudflareContext.getQueue<MyMessage>('EMAIL_QUEUE');
if (queue) {
  await queue.send({ to: 'user@example.com', subject: 'Hello' });
}
```

### Scaffold Consumer

```bash
cruz new queue-worker email-sender --queue EMAIL_QUEUE
```

Creates `external-processes/email-sender/` with:

```typescript
// external-processes/email-sender/src/index.ts
export default {
  async queue(batch: MessageBatch<EmailMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processMessage(message.body, env);
        message.ack();
      } catch (error) {
        message.retry();
      }
    }
  },
};
```

## Event Best Practices

1. Keep events immutable (readonly properties)
2. Include all needed data in event constructor (avoid DB lookups in listeners)
3. Use queued listeners for slow operations (emails, external APIs)
4. Listeners should not depend on execution order
5. Name pattern: `<Resource><Action>Event` (e.g., `NoteCreatedEvent`)
