---
title: "07 — Real-Time"
description: Broadcast task updates to all org members instantly using BroadcastModule.
---

# Chapter 07 — Real-Time

When one team member updates a task, everyone else in the org sees it instantly — no polling. CruzJS uses Cloudflare Durable Objects for real-time fanout.

## Wire BroadcastModule

Add `BroadcastModule` to your app in `apps/web/src/app.server.ts`:

```typescript
import { BroadcastModule } from '@cruzjs/core';

export default createCruzApp({
  modules: [
    BroadcastModule,
    TasksModule,
    // ...
  ],
});
```

That's the server side. One import.

## Broadcast on mutation

In `packages/core/src/tasks/tasks.service.ts`, inject `BroadcastService` and emit after updates:

```typescript
@injectable()
export class TasksService {
  constructor(
    @inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @inject(BROADCAST_SERVICE) private readonly broadcast: BroadcastService,
  ) {}

  async update(id: string, orgId: string, input: UpdateTaskInput) {
    await this.db.update(tasks)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)));

    await this.broadcast.toOrg(orgId, {
      type: 'task:updated',
      taskId: id,
    });
  }
}
```

`broadcast.toOrg(orgId, payload)` delivers the message to every WebSocket connection in that org — instantly, via Cloudflare's global network.

## Subscribe on the client

```typescript
// In your task list component
import { useBroadcast } from '@cruzjs/start';

const { refetch } = trpc.tasks.list.useQuery();

useBroadcast((message) => {
  if (message.type === 'task:updated') {
    refetch(); // re-fetch tasks when any task changes
  }
});
```

`useBroadcast` opens a WebSocket to the org's Durable Object. The callback fires whenever any message arrives for this org.

## Test it

Open the app in two browser windows logged into the same org. Update a task in one window. Watch it update in the other within milliseconds — no page refresh.

## What we built

- Added `BroadcastModule` (one line)
- Emitted `task:updated` events after mutations
- Subscribed with `useBroadcast` for instant UI updates

**Next:** [Chapter 08 — Background Jobs](/tutorial/08-background-jobs/)
