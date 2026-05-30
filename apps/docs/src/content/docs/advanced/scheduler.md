---
title: Task Scheduler
description: Cron-based task scheduling with distributed locking to prevent duplicate execution in CruzJS
---

CruzJS includes a task scheduler for running periodic jobs on a cron schedule. The scheduler uses distributed locking to prevent duplicate execution across multiple instances.

## Setup

Register the `SchedulerModule` in your application:

```typescript
import { SchedulerModule } from '@cruzjs/core/scheduler';

export default createCruzApp({
  modules: [SchedulerModule],
});
```

## Defining Scheduled Tasks

Register cron tasks in `createCruzApp` using the `scheduled` option:

```typescript
// server.cloudflare.ts
export default createCruzApp({
  schema,
  modules: [SchedulerModule],
  adapter: new CloudflareAdapter(),
  scheduled: [
    {
      cron: '0 * * * *',  // Every hour
      name: 'cleanup-expired-sessions',
      handler: async (container) => {
        const sessionService = container.get(SessionService);
        await sessionService.cleanupExpired();
      },
    },
    {
      cron: '0 2 * * *',  // Daily at 2 AM
      name: 'generate-daily-report',
      handler: async (container) => {
        const reportService = container.get(ReportService);
        await reportService.generateDailyReport();
      },
    },
  ],
  pages: () => import('virtual:react-router/server-build'),
});
```

On Cloudflare, these are triggered by the Workers `scheduled` event handler. Configure the cron triggers in `wrangler.toml`:

```toml
[triggers]
crons = ["0 * * * *", "0 2 * * *"]
```

## Distributed Locking

When running multiple instances (containers, Workers), the scheduler uses distributed locking to ensure only one instance executes each task per schedule.

### SchedulerAdapter Interface

```typescript
interface SchedulerAdapter {
  acquireLock(key: string, ttlSeconds: number): Promise<boolean>;
  releaseLock(key: string): Promise<void>;
  isLocked(key: string): Promise<boolean>;
}
```

### Cloudflare (KV)

The `CloudflareKVSchedulerAdapter` uses KV for distributed locking. When a task is triggered, the first Worker to write the lock key wins. Other instances that receive the same cron trigger see the lock and skip execution.

```typescript
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';

export default createCruzApp({
  adapter: new CloudflareAdapter(), // KV locking built-in
  modules: [SchedulerModule],
});
```

### Docker / Containers (Redis)

Container deployments use Redis for distributed locking via `SETNX` with TTL:

```typescript
import { DockerAdapter } from '@cruzjs/adapter-docker';

export default createCruzApp({
  adapter: new DockerAdapter(), // Redis locking via REDIS_URL
  modules: [SchedulerModule],
});
```

### How It Prevents Double-Runs

1. Cron trigger fires on all instances simultaneously
2. Each instance tries to acquire a lock: `acquireLock('scheduler:cleanup-expired-sessions', 300)`
3. Only the first instance succeeds (KV `put` with `ifNoneMatch` or Redis `SETNX`)
4. The winning instance runs the handler
5. Lock is released after completion (or expires via TTL if the handler crashes)

## Module Cleanup Tasks

Modules can register cleanup routines that run together via `ScheduledJobsService.runAllCleanupTasks()`:

```typescript
// In a scheduled handler
{
  cron: '0 3 * * *',
  name: 'run-all-cleanup',
  handler: async (container) => {
    const scheduler = container.get(ScheduledJobsService);
    await scheduler.runAllCleanupTasks();
  },
}
```

This executes cleanup tasks registered by all modules -- session cleanup, expired token removal, stale file pruning, and so on.

## tRPC Procedures

Manage scheduled tasks via tRPC (admin-scoped):

| Procedure | Type | Description |
|-----------|------|-------------|
| `scheduler.list` | query | List all registered scheduled tasks |
| `scheduler.create` | mutation | Register a new scheduled task |
| `scheduler.pause` | mutation | Pause a scheduled task |
| `scheduler.delete` | mutation | Remove a scheduled task |

## Example: Hourly Cleanup

```typescript
import { SchedulerModule } from '@cruzjs/core/scheduler';

export default createCruzApp({
  modules: [SchedulerModule],
  scheduled: [
    {
      cron: '0 * * * *',
      name: 'cleanup-expired-tokens',
      handler: async (container) => {
        const db = container.get(DRIZZLE);
        await db.delete(verificationTokens)
          .where(lt(verificationTokens.expiresAt, new Date().toISOString()));
      },
    },
  ],
});
```

## Example: Nightly Report

```typescript
{
  cron: '0 0 * * *',
  name: 'nightly-usage-report',
  handler: async (container) => {
    const analytics = container.get(AnalyticsService);
    const email = container.get(EmailService);

    const report = await analytics.generateDailyUsageReport();
    await email.send({
      to: 'team@company.com',
      subject: `Daily Usage Report - ${new Date().toISOString().split('T')[0]}`,
      html: report.toHtml(),
    });
  },
}
```
