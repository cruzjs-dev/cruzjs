# Cloudflare Platform

CruzJS runs on Cloudflare Pages with D1, KV, R2, Workers AI, and Queues.

## CloudflareContext

Central class for accessing all Cloudflare bindings. Initialized per request in `entry.server.tsx`:

```typescript
import { CloudflareContext } from '@cruzjs/core/shared/cloudflare/context';

// Initialized automatically by the framework:
await CloudflareContext.init(loadContext);
```

### Accessing Bindings

```typescript
import { CloudflareContext } from '@cruzjs/core/shared/cloudflare/context';

// D1 database (usually accessed via Drizzle, not directly)
const db: D1Database | null = CloudflareContext.db;

// KV namespace for caching
const kv: KVNamespace | null = CloudflareContext.kv;

// R2 bucket for file storage
const r2: R2Bucket | null = CloudflareContext.r2;

// Workers AI
const ai = CloudflareContext.ai;

// Queue by binding name
const queue = CloudflareContext.getQueue<MyMessage>('MY_QUEUE');

// Any custom binding
const custom = CloudflareContext.getBinding<Fetcher>('MY_SERVICE');
```

### Diagnostics

```typescript
console.log(CloudflareContext.diagnostics);
// { hasEnv: true, hasDB: true, hasCacheKV: true, hasStorage: true, hasAI: false, envKeys: [...] }
```

## Local Development Fallbacks

`cruz dev` works without any Cloudflare account. Automatic fallbacks:

| Binding | Local Fallback |
|---------|----------------|
| D1 | Local SQLite via better-sqlite3 |
| KV | In-memory `LocalKVNamespace` |
| R2 | Local filesystem via `LocalStorageDriver` |
| AI | Direct AI Gateway API (needs env vars) |

## Configuration (cruz.config.ts)

Defines bindings and per-environment settings. The CLI generates `wrangler.toml` from this:

```typescript
// cruz.config.ts
export default {
  name: 'my-app',
  d1: { binding: 'DB', name: 'my-app-db' },
  kv: { binding: 'CACHE_KV' },
  r2: { binding: 'UPLOADS_BUCKET', name: 'my-app-uploads' },
  queues: {
    producers: [{ binding: 'EMAIL_QUEUE', queue: 'my-app-email-queue' }],
  },
  environments: {
    production: { vars: { APP_URL: 'https://myapp.com' } },
    staging: { vars: { APP_URL: 'https://staging.myapp.com' } },
  },
};
```

## KV Caching

```typescript
import { injectable, inject } from 'inversify';
import { CloudflareContext } from '@cruzjs/core/shared/cloudflare/context';

@injectable()
export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const kv = CloudflareContext.kv;
    if (!kv) { return null; }
    const value = await kv.get(key, 'json');
    return value as T | null;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const kv = CloudflareContext.kv;
    if (!kv) { return; }
    await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
  }
}
```

## R2 File Storage

Use `StorageService` (recommended) which abstracts R2 vs local:

```typescript
import { StorageService } from '@cruzjs/core/shared/storage/storage.service';

@injectable()
export class AvatarService {
  constructor(@inject(StorageService) private readonly storage: StorageService) {}

  async upload(userId: string, file: Buffer, contentType: string): Promise<string> {
    const key = `avatars/${userId}/${Date.now()}.jpg`;
    await this.storage.disk().put(key, file, { contentType });
    return key;
  }
}
```

## External Processes

### Standalone Worker

```bash
cruz new worker email-sender
```

Creates `external-processes/email-sender/` with its own `wrangler.toml`:

```typescript
// external-processes/email-sender/src/index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Worker logic
    return new Response('OK');
  },
};
```

### Durable Workflow

```bash
cruz new workflow onboarding-flow
```

Multi-step, retryable process:

```typescript
export class OnboardingWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const user = await step.do('create-user', async () => { ... });
    await step.do('send-welcome', async () => { ... });
    await step.do('setup-defaults', async () => { ... });
  }
}
```

### Queue Consumer

```bash
cruz new queue-worker invoice-processor --queue INVOICE_QUEUE
```

```typescript
export default {
  async queue(batch: MessageBatch<Invoice>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await process(msg.body, env);
        msg.ack();
      } catch { msg.retry(); }
    }
  },
};
```

## Deployment

```bash
cruz deploy production       # Build + migrate + deploy main app + external processes
cruz deploy preview          # Preview from current branch
cruz deploy staging          # Deploy to staging environment
```

All external processes in `external-processes/` are deployed automatically alongside the main app.

## CLI Infrastructure Commands

```bash
cruz init <env>              # Initialize environment (creates D1/KV/R2)
cruz status                  # Show all environments
cruz destroy <env>           # Tear down environment
cruz queue create/list/delete
cruz secrets set/list
cruz kv create/list
cruz r2 create/list
```
