---
title: Scaffolding
description: Generate feature modules, events, services, jobs, tests, Workers, Workflows, and queue consumers with cruz new.
---

The `cruz new` command scaffolds application code and standalone Cloudflare Workers. It automatically detects whether your project uses a monorepo layout (`apps/web/src/`) or a standalone layout (`src/`) and places files accordingly.

## Quick Reference

| Command | Description |
|---------|-------------|
| `cruz new feature <name>` | Full feature: schema + service + tRPC + routes + UI |
| `cruz new crud <name>` | Minimal CRUD: schema + `createCrud()` module (3 files) |
| `cruz new event <name>` | Domain event class |
| `cruz new service <name>` | Standalone `@Injectable()` service |
| `cruz new job <name>` | Background `JobHandler` |
| `cruz new test <feature>` | Unit or integration test file |
| `cruz new package <name>` | New `@cruzjs/*` package |
| `cruz new worker <name>` | Standalone Cloudflare Worker |
| `cruz new workflow <name>` | Cloudflare Workflow (durable steps) |
| `cruz new queue-worker <name>` | Cloudflare Queue consumer |

## Auto-Wire (`--wire`)

The `--wire` flag on `new feature` and `new crud` automatically registers the module in `src/app.server.ts` and exports the schema from `database/schema.ts`. Use it to go from zero to running migration in a single command:

```bash
# Create + register + export in one step
cruz new feature invoices --scope org --wire
# → Only remaining step: cruz db generate && cruz db migrate
```

## cruz new feature

Creates a complete feature module with schema, service, tRPC router, validation, models, routes, and a starter page component.

```bash
cruz new feature <name> [--scope org|user|global] [--crud] [--wire]
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--scope` | `org` | Data ownership: `org` (org-scoped), `user` (user-specific), `global` (no owner) |
| `--crud` | off | Use `createCrud()` helper instead of separate service + tRPC files |
| `--wire` | off | Auto-register in `src/app.server.ts` and `database/schema.ts` |

### Examples

```bash
# Org-scoped feature (default)
cruz new feature tags --scope org

# User-specific feature
cruz new feature bookmarks --scope user

# Zero-friction: scaffold + wire + ready for migration
cruz new feature invoices --scope org --wire

# CRUD shorthand (generates a single .crud.ts instead of separate service + trpc)
cruz new feature labels --scope org --crud
```

### Generated Files

```
src/features/tags/
  index.ts                  # Barrel exports
  tags.module.ts            # @Module with providers, trpcRouters, pageRoutes
  tags.schema.ts            # Drizzle SQLite table + type exports
  tags.validation.ts        # Zod create/update schemas
  tags.models.ts            # Response types + mapper
  tags.routes.ts            # RouteFactory for page routes
  tags.service.ts           # @Injectable service with CRUD methods
  tags.trpc.ts              # @Router with list/get/create/update/delete
  routes/
    tags._index.tsx          # Starter page component
```

With `--crud`, the `tags.service.ts` and `tags.trpc.ts` files are replaced by a single `tags.crud.ts` that uses the `createCrud()` helper.

### Generated Code

The module wires everything together:

```typescript
// tags.module.ts
import { Module } from '@cruzjs/core/di';
import { TagsService } from './tags.service';
import { TagsTrpc } from './tags.trpc';
import { tagsRoutes } from './tags.routes';

@Module({
  providers: [TagsService, TagsTrpc],
  trpcRouters: {
    tags: TagsTrpc,
  },
  pageRoutes: tagsRoutes,
})
export class TagsModule {}
```

The schema uses `fkRef` for cross-package foreign keys and `timestamp_ms` mode:

```typescript
// tags.schema.ts (org-scoped)
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';
import { fkRef } from '@cruzjs/drizzle-universal';
import { authIdentity } from '@cruzjs/core/database/schema';
import { organizations } from '@cruzjs/core/database/schema';

export const tags = sqliteTable('Tags', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  orgId: text('orgId').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdById: text('createdById')
    .notNull()
    .references(() => fkRef(authIdentity.id), { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
}, (table) => ({
  orgIdIdx: index('Tags_orgId_idx').on(table.orgId),
  createdByIdIdx: index('Tags_createdById_idx').on(table.createdById),
}));
```

### Next Steps After Scaffolding

**With `--wire`**: Steps 1 and 2 are done automatically. Just run:

```bash
cruz db generate && cruz db migrate
```

**Without `--wire`**, do these manually:

1. Register the module in your `src/app.server.ts`:

```typescript
import { TagsModule } from './features/tags';

registerModules([...existingModules, TagsModule]);
```

2. Export the schema in `database/schema.ts`:

```typescript
export * from '../features/tags/tags.schema';
```

3. Generate and apply the migration:

```bash
cruz db generate && cruz db migrate
```

## cruz new event

Creates a domain event class.

```bash
cruz new event <name>
```

### Example

```bash
cruz new event tag-created
```

### Generated File

```
src/events/tag-created.event.ts
```

```typescript
export class TagCreatedEvent {
  constructor(
    public readonly data: { id: string; [key: string]: unknown },
  ) {}
}
```

### Usage

```typescript
import { TagCreatedEvent } from '../events/tag-created.event';

// In a service method:
this.eventBus.emit(new TagCreatedEvent({ id: item.id }));
```

## cruz new service

Creates a standalone `@Injectable()` service. Optionally places it inside an existing feature directory.

```bash
cruz new service <name> [--feature <feature>]
```

### Examples

```bash
# Standalone service in src/services/
cruz new service email-sender

# Inside an existing feature directory
cruz new service notification-sender --feature tags
```

### Generated File

Without `--feature`:
```
src/services/email-sender.service.ts
```

With `--feature tags`:
```
src/features/tags/notification-sender.service.ts
```

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';

@Injectable()
export class EmailSenderService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  // TODO: implement EmailSenderService methods
}
```

After generating, register the service as a provider in your module:

```typescript
providers: [..., EmailSenderService]
```

## cruz new job

Creates a background job handler class that implements the `JobHandler` interface.

```bash
cruz new job <name> [--feature <feature>]
```

### Examples

```bash
# Standalone job in src/jobs/
cruz new job send-welcome-email

# Co-located with an existing feature
cruz new job process-payment --feature invoices
```

### Generated File

```typescript
// invoices/process-payment.job.ts
import type { Job } from '@cruzjs/core/database/schema';
import type { JobHandler, JobHandlerMetadata, JobResult } from '@cruzjs/core/jobs/job.types';
import { injectable, inject } from 'inversify';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';

type ProcessPaymentJobPayload = {
  // Define your job payload fields here
};

@injectable()
export class ProcessPaymentJobHandler implements JobHandler {
  readonly metadata: JobHandlerMetadata = {
    jobType: 'process-payment-job',
    statuses: ['PENDING'],
    description: 'ProcessPayment background job',
  };

  constructor(
    @inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  async run(job: Job): Promise<JobResult> {
    const payload = job.payload as unknown as ProcessPaymentJobPayload;
    try {
      // TODO: implement job logic here
      return { success: true, summary: { processedAt: new Date().toISOString() } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
```

After generating, register as a provider and dispatch from a service:

```typescript
// Register in module
providers: [..., ProcessPaymentJobHandler]

// Dispatch from a service
await this.jobService.enqueue('process-payment-job', { invoiceId: invoice.id });
```

## cruz new test

Creates a unit or integration test file co-located with the feature.

```bash
cruz new test <feature> [--integration]
```

### Examples

```bash
# Unit test (mocked dependencies)
cruz new test invoices

# Integration test (real database via createTestDb)
cruz new test invoices --integration
```

### Generated Files

```
src/features/invoices/
  invoices.service.test.ts            # unit test (mocked)
  invoices.service.integration.test.ts # integration test (createTestDb)
```

```typescript
// invoices.service.integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContainer, createTestDb } from '@cruzjs/core/testing';
import { InvoicesModule } from './invoices.module';
import { InvoicesService } from './invoices.service';
import * as schema from '../../database/schema';

describe('InvoicesService (integration)', () => {
  let container: Awaited<ReturnType<typeof createTestContainer>>;

  beforeEach(async () => {
    const db = await createTestDb(schema);
    container = await createTestContainer([InvoicesModule], { db });
  });

  it('should be defined', () => {
    const service = container.resolve(InvoicesService);
    expect(service).toBeDefined();
  });
});
```

## cruz new crud

Creates a minimal CRUD module using `createCrud()` — just 3 files (schema, crud, index). Use this when you don't need custom service logic or a dedicated page route.

```bash
cruz new crud <name> [--scope org|user|global] [--wire]
```

### Examples

```bash
# Minimal CRUD module, auto-wired
cruz new crud labels --scope org --wire

# User-scoped CRUD
cruz new crud preferences --scope user --wire
```

### Generated Files

```
src/features/labels/
  labels.schema.ts    # Drizzle table definition
  labels.crud.ts      # createCrud() module with @Module
  index.ts            # Barrel exports
```

```typescript
// labels.crud.ts
import { Module } from '@cruzjs/core/di';
import { createCrud } from '@cruzjs/core/crud';
import { z } from 'zod';
import { labels } from './labels.schema';

export const {
  Service: LabelsService,
  Trpc: LabelsTrpc,
  RestRouter: LabelsRestRouter,
} = createCrud({
  name: 'Labels',
  table: labels,
  scope: 'org',
  createSchema: z.object({ name: z.string().min(1), description: z.string().optional() }),
  updateSchema: z.object({ name: z.string().min(1).optional(), description: z.string().optional() }),
  ordering: ['name', 'createdAt'],
});

@Module({
  providers: [LabelsService, LabelsTrpc, LabelsRestRouter],
  trpcRouters: { labels: LabelsTrpc },
  apiRouters: [LabelsRestRouter],
})
export class LabelsModule {}
```

This generates all 5 CRUD procedures (`trpc.labels.list`, `.getById`, `.create`, `.update`, `.delete`) and REST endpoints (`GET/POST /api/labels`, `GET/PATCH/DELETE /api/labels/:id`).

## cruz new package

Creates a new `@cruzjs/*` package in the `packages/` directory with module, service, barrel export, and TypeScript configuration.

```bash
cruz new package <name>
```

### Example

```bash
cruz new package analytics
```

### Generated Files

```
packages/analytics/
  package.json           # @cruzjs/analytics package config
  tsconfig.json          # TypeScript configuration
  src/
    index.ts             # Barrel exports
    analytics.module.ts  # @Module
    analytics.service.ts # @Injectable service
```

### Next Steps

```bash
pnpm install   # Link the new package in the workspace
```

Then import the module in your app:

```typescript
import { AnalyticsModule } from '@cruzjs/analytics';

modules: [..., AnalyticsModule]
```

## cruz new worker

Creates a standalone Cloudflare Worker with an HTTP handler.

```bash
cruz new worker my-api
```

### Generated Files

```
external-processes/my-api/
  src/index.ts       # Worker entry point with fetch handler
  wrangler.toml      # Wrangler configuration
  package.json       # Dependencies and scripts
  tsconfig.json      # TypeScript configuration
```

### Generated Code

The worker template includes a health check endpoint and a placeholder response:

```typescript
// external-processes/my-api/src/index.ts
export interface Env {
  // Add bindings here (KV, D1, R2, etc.)
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', worker: 'my-api' });
    }

    return Response.json({ message: 'Hello from my-api worker!' });
  },
} satisfies ExportedHandler<Env>;
```

### Next Steps After Scaffolding

```bash
cd external-processes/my-api
npm install
npx wrangler dev        # Local development
cruz deploy production   # Deploys with the main app
```

## cruz new workflow

Creates a Cloudflare Workflow with durable, retryable steps. Workflows are long-running processes where each step is independently retried on failure.

```bash
cruz new workflow order-processor
```

### Generated Files

```
external-processes/order-processor/
  src/index.ts       # Workflow class + HTTP trigger
  wrangler.toml      # Wrangler config with workflow binding
  package.json
  tsconfig.json
```

### Generated Code

The workflow template includes a multi-step `run()` method and an HTTP endpoint for triggering and checking status:

```typescript
// external-processes/order-processor/src/index.ts
import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
} from 'cloudflare:workers';

export interface Env {
  ORDER_PROCESSOR: Workflow;
}

type WorkflowParams = {
  itemId: string;
};

export class OrderProcessor extends WorkflowEntrypoint<Env, WorkflowParams> {
  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep) {
    const input = event.payload;

    // Step 1: Validate
    const validated = await step.do('validate-input', async () => {
      console.log('Validating:', input.itemId);
      return { valid: true, itemId: input.itemId };
    });

    // Step 2: Process
    const result = await step.do('process', async () => {
      console.log('Processing:', validated.itemId);
      return { processed: true };
    });

    // Step 3: Finalize
    await step.do('finalize', async () => {
      console.log('Finalizing:', validated.itemId);
    });

    return { success: true, itemId: input.itemId };
  }
}
```

The generated `wrangler.toml` includes the workflow binding:

```toml
name = "order-processor"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[[workflows]]
name = "order-processor"
binding = "ORDER_PROCESSOR"
class_name = "OrderProcessor"
```

### Triggering a Workflow

The generated HTTP endpoint accepts POST requests:

```bash
# Trigger via HTTP
curl -X POST http://localhost:8787/trigger \
  -H "Content-Type: application/json" \
  -d '{"itemId": "item_123"}'

# Check status
curl http://localhost:8787/status/<instance-id>
```

## cruz new queue-worker

Creates a queue consumer Worker that processes messages from a Cloudflare Queue. You must specify the queue name with `--queue`.

```bash
cruz new queue-worker email-sender --queue email-queue
```

If you omit `--queue`, the queue name defaults to `<name>-queue` (e.g., `email-sender-queue`).

### Generated Files

```
external-processes/email-sender/
  src/index.ts       # Queue consumer with batch processing
  wrangler.toml      # Consumer + producer queue bindings
  package.json
  tsconfig.json
```

### Generated Code

The queue worker template handles batches of messages with acknowledgment and retry logic:

```typescript
// external-processes/email-sender/src/index.ts
export interface Env {
  EMAIL_QUEUE_QUEUE: Queue;
}

type QueueMessage = {
  type: string;
  data: Record<string, unknown>;
  timestamp?: string;
};

export default {
  // HTTP entrypoint for health checks and manual enqueue
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', consumer: 'email-sender', queue: 'email-queue' });
    }

    if (request.method === 'POST' && url.pathname === '/enqueue') {
      const message = await request.json() as QueueMessage;
      await env.EMAIL_QUEUE_QUEUE.send({
        ...message,
        timestamp: new Date().toISOString(),
      });
      return Response.json({ queued: true });
    }

    return Response.json({ message: 'email-sender queue consumer.' });
  },

  // Queue consumer -- processes batches of messages
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        const { type, data } = msg.body;

        switch (type) {
          // Add your message type handlers here
          default:
            console.log(`Unknown message type: ${type}`);
        }

        msg.ack();
      } catch (error) {
        console.error('Failed to process message:', error);
        msg.retry({ delaySeconds: 30 });
      }
    }
  },
} satisfies ExportedHandler<Env>;
```

### Queue Setup

After scaffolding a queue worker, create the queue on Cloudflare:

```bash
# Create the queue
cruz queue create email-queue

# Install dependencies and start local dev
cd external-processes/email-sender
npm install
npx wrangler dev
```

### Sending Messages from the Main App

To send messages from your Pages application to the queue, add the queue binding to your `cruz.config.ts` and use the binding in your service code:

```typescript
// In a service or tRPC procedure
await env.EMAIL_QUEUE_QUEUE.send({
  type: 'welcome-email',
  data: { userId: 'user_123', email: 'new@example.com' },
});
```

## Auto-Deployment

All projects in `external-processes/` are discovered and deployed automatically when you run `cruz deploy`. The deployment process:

1. Builds and deploys the main Pages application.
2. Discovers all directories in `external-processes/` that contain a `wrangler.toml`.
3. Deploys each standalone worker sequentially using `wrangler deploy`.

```bash
# This deploys the main app AND all external processes
cruz deploy production
```

No additional configuration is needed. Each external process manages its own `wrangler.toml` and bindings.
