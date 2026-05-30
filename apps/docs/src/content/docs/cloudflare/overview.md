---
title: Cloudflare Overview
description: Why CruzJS is built on Cloudflare and how the CloudflareContext class provides unified access to all platform bindings.
---

Cloudflare is CruzJS's primary and most mature deployment target. The framework's core design -- from the database layer to the caching strategy -- is optimized for Cloudflare Workers, Pages, D1, KV, R2, and Queues. While CruzJS now supports other platforms via [runtime adapters](/adapters/overview), Cloudflare remains the default and recommended platform.

## Why Cloudflare

### V8 Isolates vs Containers

Traditional serverless platforms (AWS Lambda, Google Cloud Functions) spin up entire containers or microVMs per request. Cloudflare Workers use **V8 isolates** -- the same technology that powers Chrome's JavaScript engine. The difference is dramatic:

| | V8 Isolates (Cloudflare) | Containers (AWS Lambda) |
|---|---|---|
| Cold start | ~0ms | 100ms - 5s |
| Memory overhead | ~5MB per isolate | 128MB - 10GB per container |
| Startup | Microseconds | Seconds |
| Global deployment | 300+ edge locations | Region-specific |

### Edge-First Architecture

Every CruzJS request runs at the Cloudflare edge location closest to the user. Your API, database queries, and file storage all happen within Cloudflare's network -- no round-trips to a centralized data center.

### Pricing Advantages

Cloudflare's free tier is generous enough for most development and many production workloads:

- **Workers**: 100,000 requests/day free
- **D1**: 5M rows read, 100K rows written/day free
- **KV**: 100,000 reads/day free
- **R2**: 10GB storage, 10M Class A operations/month free
- **Pages**: Unlimited sites, unlimited bandwidth

For production SaaS applications, the Workers Paid plan ($5/month) unlocks 10M requests/month -- far cheaper than equivalent compute on AWS or GCP.

## CloudflareContext

`CloudflareContext` is the central class for accessing all Cloudflare bindings in CruzJS. It is initialized once per request from the React Router load context and provides typed access to D1, KV, R2, AI, and Queues.

### Initialization

CloudflareContext is initialized automatically in your entry server:

```typescript
import { CloudflareContext } from '@cruzjs/core/shared/cloudflare/context';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  entryContext: EntryContext,
  loadContext: AppLoadContext
) {
  // Extracts env bindings and initializes database
  await CloudflareContext.init(loadContext);

  // ... render your app
}
```

The `init` method:
1. Extracts Cloudflare environment bindings from the load context
2. Bridges string environment values to `process.env` for ConfigService compatibility
3. Provides an in-memory KV facade when running locally without wrangler
4. Initializes the Drizzle database from the D1 binding (or local SQLite fallback)

### Accessing Bindings

```typescript
import { CloudflareContext } from '@cruzjs/core/shared/cloudflare/context';

// D1 database (typically accessed via Drizzle, not directly)
const db: D1Database | null = CloudflareContext.db;

// KV namespace for caching
const kv: KVNamespace | null = CloudflareContext.kv;

// R2 bucket for file storage
const r2: R2Bucket | null = CloudflareContext.r2;

// Workers AI binding
const ai = CloudflareContext.ai;

// Queue binding by name
const queue = CloudflareContext.getQueue<MyMessage>('MY_QUEUE');

// Any custom binding
const custom = CloudflareContext.getBinding<Fetcher>('MY_SERVICE');
```

### The CloudflareEnv Interface

The environment interface defines the expected bindings:

```typescript
export interface CloudflareEnv {
  CACHE_KV?: KVNamespace;
  UPLOADS_BUCKET?: R2Bucket;
  STORAGE?: R2Bucket;
  DB?: D1Database;
  AI?: unknown;
  [key: string]: unknown; // Dynamic bindings (queues, services, etc.)
}
```

These binding names correspond to your `wrangler.toml` configuration:

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-app-db"
database_id = "xxx"

[[kv_namespaces]]
binding = "CACHE_KV"
id = "xxx"

[[r2_buckets]]
binding = "UPLOADS_BUCKET"
bucket_name = "my-app-uploads"
```

### Diagnostics

For debugging binding availability, use the diagnostics getter:

```typescript
console.log(CloudflareContext.diagnostics);
// {
//   hasEnv: true,
//   hasDB: true,
//   hasCacheKV: true,
//   hasStorage: true,
//   hasAI: false,
//   envKeys: ['DB', 'CACHE_KV', 'UPLOADS_BUCKET', 'AUTH_SECRET', ...]
// }
```

### Local Development

When running locally without wrangler, CruzJS provides automatic fallbacks:

- **D1** falls back to a local SQLite file via better-sqlite3
- **KV** falls back to an in-memory `LocalKVNamespace` that implements the KVNamespace interface
- **R2** falls back to local filesystem storage via `LocalStorageDriver`
- **AI** requires the `CLOUDFLARE_ACCOUNT_ID`, `CF_AI_GATEWAY_ID`, and `CF_AIG_TOKEN` environment variables (calls the AI Gateway API directly)

This means `cruz dev` works without any Cloudflare account or wrangler configuration -- bindings are automatically stubbed.

## Next Steps

- [D1 Database](/cloudflare/d1) -- SQLite at the edge via Drizzle ORM
- [KV Storage](/cloudflare/kv) -- Key-value caching and sessions
- [R2 Storage](/cloudflare/r2) -- S3-compatible object storage
- [Workers](/cloudflare/workers) -- Standalone background Workers
- [Workflows](/cloudflare/workflows) -- Durable multi-step execution
- [Queues](/cloudflare/queues) -- Asynchronous message processing
- [Workers AI](/cloudflare/ai) -- AI model inference at the edge
