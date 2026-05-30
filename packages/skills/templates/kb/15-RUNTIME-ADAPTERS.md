# Runtime Adapters

CruzJS supports multiple cloud providers through the RuntimeAdapter pattern. Each adapter implements a common interface for database, cache, queue, AI, storage, and a set of optional bindings for rate limiting, scheduling, broadcasting, search, sessions, logging, and more.

## Architecture

```
createCruzApp({
  adapter: new CloudflareAdapter(),  // or AWSLambdaAdapter, DockerAdapter, etc.
  ...
})
```

The adapter is initialized per-request and provides provider-specific implementations of core bindings and optional infrastructure bindings.

## Available Adapters

| Package | Adapter | Runtime Type | Best For |
|---------|---------|-------------|----------|
| `@cruzjs/adapter-cloudflare` | `CloudflareAdapter` | edge | Cloudflare Workers/Pages |
| `@cruzjs/adapter-aws` | `AWSLambdaAdapter` | serverless | AWS Lambda + API Gateway |
| `@cruzjs/adapter-aws` | `AWSFargateAdapter` | container | AWS ECS Fargate |
| `@cruzjs/adapter-gcp` | `GCPCloudRunAdapter` | container | Google Cloud Run |
| `@cruzjs/adapter-gcp` | `GCPCloudFunctionsAdapter` | serverless | Google Cloud Functions |
| `@cruzjs/adapter-azure` | `AzureFunctionsAdapter` | serverless | Azure Functions |
| `@cruzjs/adapter-azure` | `AzureContainerAppsAdapter` | container | Azure Container Apps |
| `@cruzjs/adapter-digitalocean` | `DigitalOceanAppPlatformAdapter` | container | DO App Platform |
| `@cruzjs/adapter-docker` | `DockerAdapter` | container | Docker, Dokploy, Coolify, K8s |

## RuntimeAdapter Interface

All adapters implement the core interface. Optional methods return `null` when the binding is not available for that adapter.

```typescript
interface RuntimeAdapter {
  // Identity
  readonly name: string;           // e.g. 'cloudflare', 'aws-lambda', 'docker'
  readonly type: RuntimeType;      // 'edge' | 'serverless' | 'container'

  // Lifecycle
  init(context: unknown): Promise<void>;
  clear(): void;

  // Core bindings (required)
  getDatabase(): unknown;
  getCache(namespace?: string): CacheBinding;
  getQueue<T>(name: string): QueueBinding<T>;
  getLocalQueue<T>(name: string): LocalQueueLike<T> | null;
  getAI(): AIBinding | null;
  getBinding<T>(name: string): T | null;
  getStorageBucket(): unknown | null;

  // Optional infrastructure bindings
  getLogger?(): LogAdapterBinding | null;
  getRateLimiter?(): RateLimitAdapter | null;
  getScheduler?(): SchedulerAdapter | null;
  getBroadcast?(): BroadcastAdapter | null;
  getSSEBackend?(): SSEBackend | null;
  getSearch?(): SearchAdapter | null;
  getSessionAdapter?(): SessionAdapter | null;

  // Environment
  waitUntil(promise: Promise<unknown>): void;
  get env(): Record<string, string | undefined>;
  get diagnostics(): Record<string, unknown>;
}
```

## Adapter Binding Matrix

Each adapter package has a `bindings/` directory with provider-specific implementations. The following table shows which optional bindings are available per adapter.

| Binding | Cloudflare | AWS | GCP | Azure | DigitalOcean | Docker |
|---------|-----------|-----|-----|-------|-------------|--------|
| `LogAdapterBinding` | Yes | Yes | Yes | Yes | Yes | Yes |
| `RateLimitAdapter` | Yes (KV) | Yes | Yes | Yes | Yes | Yes |
| `SchedulerAdapter` | Yes (KV locking) | Yes | Yes | Yes | Yes | Yes |
| `BroadcastAdapter` | Yes (KV presence) | Yes | Yes | Yes | Yes | Yes |
| `SSEBackend` | Yes (KVSSEBackend) | Yes | Yes | Yes | Yes | Yes |
| `SearchAdapter` | Yes (D1/FTS5) | Yes | Yes | Yes | Yes | Yes |
| `SessionAdapter` | Yes (KV) | Yes | Yes | Yes | Yes | Yes |
| `AuditLogAdapter` | Yes | Yes | Yes | Yes | Yes | Yes |
| `ErrorReportingAdapter` | Yes | Yes | Yes | Yes | Yes | Yes |
| `TracingAdapter` | Yes | Yes | Yes | Yes | Yes | Yes |
| `TwoFactorAdapter` | Yes (Twilio) | Yes | Yes | Yes | Yes | Yes |
| `MultiDatabaseAdapter` | Yes | Yes | Yes | Yes | Yes | Yes |

### Cloudflare-Specific Bindings

Cloudflare has additional bindings not available on other adapters:

| Binding | File | Description |
|---------|------|-------------|
| `CloudflareAIBinding` | `ai.ts` | Workers AI / OpenAI gateway |
| `CloudflareCacheBinding` | `cache.ts` | KV-backed cache |
| `CloudflareQueueBinding` | `queue.ts` | Cloudflare Queues |

### Non-Cloudflare Adapter Bindings

Non-Cloudflare adapters include fallback bindings:

| Binding | File | Description |
|---------|------|-------------|
| In-memory cache | `memory-cache.ts` | In-memory cache for local dev |
| In-memory queue | `memory-queue.ts` | In-memory queue for local dev |
| OpenAI AI binding | `openai-ai.ts` | OpenAI API as AI binding |

## Binding Interfaces

### CacheBinding

```typescript
interface CacheBinding {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: string | number | object, ttlSeconds?: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  keys(pattern: string): Promise<string[]>;
  clear(): Promise<number>;
  increment(key: string, by?: number): Promise<number>;
  decrement(key: string, by?: number): Promise<number>;
}
```

### QueueBinding

```typescript
interface QueueBinding<T = unknown> {
  send(message: T): Promise<void>;
  sendBatch(messages: { body: T }[]): Promise<void>;
}
```

### RateLimitAdapter

Used by `RateLimitModule` for distributed rate limiting. On Cloudflare, `CloudflareKVRateLimitAdapter` uses KV with read-modify-write for per-key counters.

```typescript
interface RateLimitAdapter {
  hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
  getRemaining(key: string, limit: number, windowSeconds: number): Promise<number>;
}
```

### SchedulerAdapter

Used by `SchedulerModule` for cron-like scheduling with distributed locking. On Cloudflare, uses KV for lock coordination.

```typescript
interface SchedulerAdapter {
  acquireLock(lockId: string, ttlSeconds: number): Promise<boolean>;
  releaseLock(lockId: string): Promise<void>;
  isLocked(lockId: string): Promise<boolean>;
}
```

### BroadcastAdapter

Used by `BroadcastModule` for real-time presence tracking. SSE delivery is handled separately via `SSEBackend`.

```typescript
interface BroadcastAdapter {
  trackPresence(channelId: string, userId: string, metadata?: Record<string, unknown>): Promise<void>;
  removePresence(channelId: string, userId: string): Promise<void>;
  getPresence(channelId: string): Promise<PresenceEntry[]>;
}
```

On Cloudflare, `KVSSEBackend` provides SSE delivery, while the `BroadcastAdapter` handles presence state in KV.

### SearchAdapter

Used by `SearchModule` for full-text search. On Cloudflare, `CloudflareFTSSearchAdapter` wraps `SQLiteFTSAdapter` using D1 with FTS5.

```typescript
interface SearchAdapter {
  index(collection: string, id: string, document: Record<string, unknown>): Promise<void>;
  bulkIndex(collection: string, documents: { id: string; data: Record<string, unknown> }[]): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
  search(collection: string, query: string, options?: SearchOptions): Promise<SearchResult[]>;
  flush(collection: string): Promise<void>;
}
```

### SessionAdapter

Used by `SessionModule` for session storage. On Cloudflare, `CloudflareKVSessionAdapter` uses KV for sub-millisecond session validation lookups.

```typescript
interface SessionAdapter {
  store(sessionId: string, data: SessionData, ttlSeconds?: number): Promise<void>;
  get(sessionId: string): Promise<SessionData | null>;
  delete(sessionId: string): Promise<void>;
  getUserSessions(userId: string): Promise<SessionInfo[]>;
  invalidateAll(userId: string): Promise<void>;
}
```

### LogAdapterBinding

Used for structured logging. Implementations vary by adapter (console, CloudWatch, Stackdriver, etc.).

```typescript
interface LogAdapterBinding {
  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;
  flush?(): Promise<void>;
}
```

## Cloudflare Implementation Notes

The Cloudflare adapter leverages native Cloudflare bindings for optimal edge performance:

- **KV for rate limiting** -- Read-modify-write pattern with atomic operations. Counters stored with TTL matching the rate limit window.
- **KV for sessions** -- Sub-millisecond session validation. Session data stored as JSON with TTL for automatic expiry.
- **KV for broadcast presence** -- Channel membership tracked in KV keys. `KVSSEBackend` handles SSE stream delivery.
- **KV for scheduler locking** -- Distributed lock coordination using KV with TTL-based expiry for automatic lock release.
- **D1/FTS5 for search** -- `CloudflareFTSSearchAdapter` wraps `SQLiteFTSAdapter` to use D1's native FTS5 support for full-text search.
- **Twilio for 2FA** -- `CloudflareTwilioTwoFactorAdapter` extends `TwilioTwoFactorAdapter` for SMS-based two-factor authentication.
- **OTLP tracing** -- `OTLPTracingAdapter` sends traces to an OTLP endpoint if `OTLP_ENDPOINT` env var is set; falls back to in-memory tracing.

## Usage Examples

### Cloudflare (default)

```typescript
// server.cloudflare.ts
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';

export default createCruzApp({
  schema,
  modules: [StartModule, ...coreModules],
  adapter: new CloudflareAdapter(),
  pages: () => import('virtual:react-router/server-build'),
});
```

### Docker (self-hosted)

```typescript
import { DockerAdapter } from '@cruzjs/adapter-docker';

export default createCruzApp({
  schema,
  modules: [StartModule, ...coreModules],
  adapter: new DockerAdapter({
    databaseUrl: process.env.DATABASE_URL,
    openaiApiKey: process.env.OPENAI_API_KEY,
  }),
  pages: () => import('virtual:react-router/server-build'),
});
```

### AWS Lambda

```typescript
import { AWSLambdaAdapter } from '@cruzjs/adapter-aws';

export default createCruzApp({
  schema,
  modules: [StartModule, ...coreModules],
  adapter: new AWSLambdaAdapter({
    databaseUrl: process.env.DATABASE_URL,
    s3Bucket: process.env.S3_BUCKET,
  }),
  pages: () => import('virtual:react-router/server-build'),
});
```

## Serverless vs Container vs Edge

- **Edge** (`cloudflare`): `waitUntil()` uses the Cloudflare ExecutionContext. All optional bindings implemented natively.
- **Serverless** (`aws-lambda`, `gcp-cloud-functions`, `azure-functions`): `waitUntil()` collects promises that must be flushed before returning. Call `adapter.flushPendingWork()` before the Lambda response.
- **Container** (`aws-fargate`, `gcp-cloud-run`, `azure-container-apps`, `docker`, `digitalocean`): `waitUntil()` is fire-and-forget since the process is long-lived.

## Adapter Contract Tests

The framework includes comprehensive contract tests (`packages/core/src/runtime/__tests__/adapter-contract.test-utils.ts`) and end-to-end tests (`packages/core/src/runtime/__tests__/adapter-e2e.test.ts`) to verify that all adapter implementations conform to the `RuntimeAdapter` interface. Use these test utilities when building custom adapters.

## Backward Compatibility

The `adapter` field is optional in `createCruzApp()`. Without it, the framework uses `CloudflareContext` directly (existing behavior). When provided, the adapter is initialized alongside `CloudflareContext` so existing services continue to work.
