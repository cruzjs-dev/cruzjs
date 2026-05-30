# createCruzApp Unified Bootstrap - Implementation Notes

## Final API
```ts
export default createCruzApp({
  schema,
  providers: userProviders,
  pages: () => import('virtual:react-router/server-build'),
  queues: {
    NOTIFICATIONS_QUEUE: async (messages, container) => { ... },
  },
  scheduled: [
    { cron: '0 * * * *', handler: async (container) => { ... } },
  ],
});
```
- `pages` is required — provides React Router server build (virtual module)
- `queues` is optional — user-defined queue consumers (JOBS_QUEUE is built-in)
- `scheduled` is optional — cron handlers
- Uses `@ts-expect-error` for the virtual module import in server.cloudflare.ts

## What Changed

### New Files
- `packages/core/src/framework/create-cruz-app.ts` — `createCruzApp()` function that produces unified CF Worker export (`fetch`, `queue`, `scheduled`)
- `packages/core/src/framework/local-queue-registry.ts` — Extracted local queue consumer registration (avoids circular deps between create-cruz-app ↔ application.server)
- `packages/core/src/shared/cloudflare/local-queue.ts` — In-memory queue facade for local dev
- `packages/core/src/jobs/job-queue.consumer.ts` — Queue consumer logic (processQueueBatch, handleJobMessage)
- `apps/web/src/jobs/hello-world.handler.ts` — Example job handler
- `apps/web/src/routes/api/jobs-example.ts` — Example API route for testing jobs

### Modified Files
- `apps/web/src/server.cloudflare.ts` — Rewritten to use `createCruzApp()` (~35 lines vs ~250)
- `apps/web/cruz.config.ts` — Added `queues: true`, `scheduled` config
- `packages/cli/src/define-config.ts` — Added `CruzQueueConfig`, `CruzScheduledConfig`, `queues`, `scheduled` to `CruzConfig`
- `packages/cli/src/config/wrangler-generator.ts` — Auto-generates JOBS_QUEUE bindings, user queues from config, `[triggers]` for cron
- `packages/core/src/framework/application.server.ts` — Phase 6 calls `registerLocalQueueConsumers(container)` from local-queue-registry
- `packages/core/src/index.ts` — Exports `createCruzApp`, `CruzAppConfig`, `ScheduledHandler`, `QueueHandler`
- `packages/core/src/shared/cloudflare/context.ts` — Added `getQueue()` (never null), `getLocalQueue()`, LocalQueue facade
- `packages/core/src/shared/config/schema.ts` — Empty string → undefined for optional env vars (GOOGLE_CLIENT_ID, etc.)

### Deleted Files (from earlier queue-based jobs redesign)
- `packages/core/src/jobs/job-runner.service.ts`
- `packages/core/src/jobs/job-dispatcher.service.ts`
- `packages/core/src/jobs/job-trigger.service.ts`
- `packages/core/src/jobs/events/run-job.event.ts`
- `packages/core/src/jobs/events/run-job.listener.ts`
- `packages/core/src/api/jobs-process.ts`
- `apps/web/scripts/job-worker.ts`

## Architecture

### createCruzApp() Flow
```
server.cloudflare.ts
  └─ createCruzApp({ schema, providers, queues, scheduled, getServerBuild })
       ├─ fetch() → React Router SSR + /api/health + /api/__scheduled (dev)
       ├─ queue() → JOBS_QUEUE (built-in) + user queues (by binding name)
       └─ scheduled() → runs handlers matching controller.cron
```

### Local Dev Queue Flow
```
buildContainerWithProviders() (Phase 6)
  └─ registerLocalQueueConsumers(container) [from local-queue-registry.ts]
       ├─ CloudflareContext.getQueue(JOBS_QUEUE) → creates LocalQueue if no CF binding
       └─ localQueue.onMessage(callback) → processes messages synchronously
```

### Key Design Decisions
1. **Local consumers registered in buildContainerWithProviders, not createCruzApp** — Because Vite dev uses cloudflareDevProxy which runs server.cloudflare.ts in miniflare (separate V8 isolate), module-level state from createCruzApp isn't visible to the Vite SSR context. Registering in buildContainerWithProviders works in both contexts.
2. **Extracted local-queue-registry.ts** — Avoids circular dep: create-cruz-app imports application.server, and application.server needs registerLocalQueueConsumers.
3. **LocalQueue processes synchronously** — D1 bindings are scoped to request context in wrangler dev, so async/setImmediate would lose the binding.
4. **Wrangler generator auto-creates JOBS_QUEUE** — When `bindings.queues: true`, the built-in jobs queue is always configured.

## KB Files to Update
- `.claude/kb/12-JOBS.md` — Queue-based architecture, createCruzApp integration
- `.claude/kb/13-DEPLOYMENT.md` — Queue/scheduled config in cruz.config.ts, wrangler.toml generation
- `.claude/kb/11-FRAMEWORK-EXTENSIBILITY.md` — createCruzApp as primary bootstrap, QueueHandler pattern
- `.claude/kb/01-ARCHITECTURE.md` — server.cloudflare.ts now uses createCruzApp
- `.claude/kb/14-QUICK-START.md` — Updated server.cloudflare.ts example
