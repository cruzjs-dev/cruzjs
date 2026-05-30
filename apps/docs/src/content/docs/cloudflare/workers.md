---
title: Standalone Workers
description: Creating standalone Cloudflare Workers in CruzJS for background processing, scheduled tasks, and independent services.
---

CruzJS applications run on Cloudflare Pages, but some workloads are better served by standalone Workers. Workers live in the `external-processes/` directory and deploy alongside your main application.

## When to Use Workers vs Pages

| Use Case | Pages (main app) | Standalone Worker |
|---|---|---|
| Web UI + API | Yes | No |
| Background processing | Via Queues/Workflows | Direct |
| Scheduled tasks (cron) | No | Yes |
| WebSocket servers | Limited | Yes |
| Custom routing logic | React Router | Full control |
| Independent scaling | No | Yes |
| Separate deployment | No | Yes |

Use a standalone Worker when you need independent deployment, cron triggers, WebSocket support, or processing that should not run inside the Pages request lifecycle.

## Scaffolding a Worker

```bash
cruz new worker my-processor
```

This creates `external-processes/my-processor/` with:

```
external-processes/my-processor/
  src/
    index.ts          # Worker entry point
  wrangler.toml       # Worker configuration
  package.json
  tsconfig.json
```

## Worker Structure

The scaffolded Worker follows Cloudflare's module Worker syntax:

```typescript
// external-processes/my-processor/src/index.ts
export interface Env {
  DB: D1Database;
  CACHE_KV: KVNamespace;
  MY_QUEUE: Queue;
}

export default {
  /**
   * HTTP fetch handler -- responds to incoming requests
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    if (url.pathname === '/process' && request.method === 'POST') {
      const body = await request.json();

      // Do work...
      ctx.waitUntil(processInBackground(body, env));

      return Response.json({ status: 'accepted' });
    }

    return new Response('Not Found', { status: 404 });
  },

  /**
   * Scheduled handler -- runs on cron triggers
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Cron trigger: ${event.cron}`);
    ctx.waitUntil(runScheduledTask(env));
  },
};

async function processInBackground(data: unknown, env: Env) {
  // Access D1, KV, or other bindings
  const result = await env.DB.prepare('SELECT COUNT(*) as count FROM Job').first();
  console.log('Job count:', result?.count);
}

async function runScheduledTask(env: Env) {
  // Periodic cleanup, report generation, etc.
}
```

## wrangler.toml Configuration

```toml
# external-processes/my-processor/wrangler.toml
name = "my-app-my-processor"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Share the same D1 database as the main app
[[d1_databases]]
binding = "DB"
database_name = "my-app-db"
database_id = "your-database-id"

# Share KV namespace
[[kv_namespaces]]
binding = "CACHE_KV"
id = "your-kv-id"

# Cron triggers (optional)
[triggers]
crons = ["0 */6 * * *"]  # Every 6 hours

# Environment variables
[vars]
ENVIRONMENT = "production"
```

### Sharing Bindings

Standalone Workers can bind to the same D1 databases, KV namespaces, R2 buckets, and Queues as your main Pages application. Use the same `database_id`, `id`, or `bucket_name` values from your main `wrangler.toml`.

## Service Bindings

Workers can call each other directly (without HTTP) using Service Bindings:

```toml
# In the main app's wrangler.toml
[[services]]
binding = "PROCESSOR"
service = "my-app-my-processor"
```

```typescript
// In the main app
const response = await env.PROCESSOR.fetch(
  new Request('https://internal/process', {
    method: 'POST',
    body: JSON.stringify({ taskId: '123' }),
  })
);
```

Service Bindings are zero-latency since communication happens within Cloudflare's network without a public HTTP roundtrip.

## Deployment

Standalone Workers deploy automatically with `cruz deploy`:

```bash
# Deploy everything (main app + all external processes)
cruz deploy production

# Preview deploy
cruz deploy preview
```

The CLI discovers all directories in `external-processes/` with a `wrangler.toml` and deploys each one.

You can also deploy a single Worker manually:

```bash
cd external-processes/my-processor
npx wrangler deploy
```

## Accessing the Database from Workers

Since Workers don't use the CruzJS DI container, use Drizzle directly:

```typescript
import { drizzle } from 'drizzle-orm/d1';
import { jobs } from './schema'; // Copy or import your schema
import { eq } from 'drizzle-orm';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const db = drizzle(env.DB);

    const pendingJobs = await db
      .select()
      .from(jobs)
      .where(eq(jobs.status, 'PENDING'))
      .limit(10);

    return Response.json({ jobs: pendingJobs });
  },
};
```

## Testing Workers

Test Workers locally with wrangler:

```bash
cd external-processes/my-processor
npx wrangler dev
```

This starts a local development server for the Worker with simulated D1, KV, and R2 bindings.

## Next Steps

- [Workflows](/cloudflare/workflows) -- Durable multi-step execution
- [Queues](/cloudflare/queues) -- Asynchronous message processing
- [Deployment](/getting-started/deployment) -- Deploy Workers alongside your app
