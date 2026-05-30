---
title: Multi-Cloud Roadmap
description: Cloudflare ships today; AWS, GCP, Azure, DigitalOcean, and Docker adapters are planned.
---

:::caution[Planned, not shipping yet]
**Cloudflare Workers/Pages is the only supported deployment target today.** The
runtime-adapter abstraction below is the foundation for multi-cloud, and adapter
packages for AWS, GCP, Azure, DigitalOcean, and Docker exist in the monorepo — but
they are **not yet production-ready or documented**. This page captures the plan.
For everything you can deploy today, see [Adapter Setup](/adapters/cloudflare) and
the [Cloudflare](/cloudflare/overview) guides.
:::

## Why an adapter layer

CruzJS talks to infrastructure through logical bindings — `sql`, `kv`, `blob`,
`queue`, `llm`, and a set of optional capabilities — rather than calling cloud
SDKs directly. On Cloudflare those bindings resolve to D1, KV, R2, Queues, and
Workers AI. The adapter layer is what lets a future target map the *same* logical
bindings onto a *different* cloud's native services, so application code never
changes when the deployment target does.

## The plan

A `RuntimeAdapter` provides platform-specific implementations for database,
cache, queue, AI, and storage bindings. Cloudflare is implemented and shipping.
The remaining adapters are roadmap items:

| Target | Adapter | Runtime Type | Status |
|--------|---------|-------------|--------|
| Cloudflare Workers/Pages | `CloudflareAdapter` | Edge | **Shipping** |
| AWS Lambda + API Gateway | `AWSLambdaAdapter` | Serverless | Planned |
| AWS ECS Fargate | `AWSFargateAdapter` | Container | Planned |
| Google Cloud Run | `GCPCloudRunAdapter` | Container | Planned |
| Google Cloud Functions | `GCPCloudFunctionsAdapter` | Serverless | Planned |
| Azure Functions | `AzureFunctionsAdapter` | Serverless | Planned |
| Azure Container Apps | `AzureContainerAppsAdapter` | Container | Planned |
| DigitalOcean App Platform | `DigitalOceanAppPlatformAdapter` | Container | Planned |
| Docker / self-hosted | `DockerAdapter` | Container | Planned |

### Runtime types

- **Edge** — runs at the edge (Cloudflare Workers). Lowest latency, V8 isolate runtime.
- **Serverless** — scale-to-zero functions (Lambda, Cloud Functions). `waitUntil()` must be flushed before the response returns.
- **Container** — long-running processes (Fargate, Cloud Run, Docker). `waitUntil()` is fire-and-forget.

## RuntimeAdapter interface

The abstraction the adapters implement. This is the design reference for the
planned targets — Cloudflare is the only one wired end-to-end today.

```typescript
interface RuntimeAdapter {
  readonly name: string;
  readonly type: 'edge' | 'serverless' | 'container';

  init(context: unknown): Promise<void>;
  getDatabase(): unknown;
  getCache(namespace?: string): CacheBinding;
  getQueue<T>(name: string): QueueBinding<T>;
  getLocalQueue<T>(name: string): LocalQueueLike<T> | null;
  getAI(): AIBinding | null;
  getBinding<T>(name: string): T | null;
  getStorageBucket(): unknown | null;
  waitUntil(promise: Promise<unknown>): void;
  get env(): Record<string, string | undefined>;
  get diagnostics(): Record<string, unknown>;
  clear(): void;

  // Optional bindings — return null when unsupported; modules fall back to
  // in-memory or no-op implementations.
  getRateLimiter(): RateLimitAdapter | null;
  getScheduler(): SchedulerAdapter | null;
  getBroadcast(): BroadcastAdapter | null;
  getSSEBackend(): SSEBackend | null;
  getSearch(): SearchAdapter | null;
  getSessionAdapter(): SessionAdapter | null;
  getLogger(): LogAdapterBinding | null;
}
```

### Target service mapping (planned)

How each logical binding is intended to map onto each cloud's native service.
Only the Cloudflare column is implemented today.

| Binding | Cloudflare | AWS Lambda | AWS Fargate | GCP Cloud Run | GCP Functions | Azure Functions | Azure Containers | DigitalOcean | Docker |
|---------|-----------|-----------|------------|--------------|--------------|----------------|-----------------|-------------|--------|
| Database | D1 | DynamoDB / RDS | RDS | Cloud SQL | Cloud SQL | Cosmos DB | Cosmos DB | Managed DB | PostgreSQL |
| Cache | KV | ElastiCache | ElastiCache | Memorystore | Memorystore | Redis Cache | Redis Cache | Redis | Redis |
| Queue | Queues | SQS | SQS | Pub/Sub | Pub/Sub | Service Bus | Service Bus | -- | BullMQ |
| AI | Workers AI | Bedrock | Bedrock | Vertex AI | Vertex AI | OpenAI | OpenAI | -- | Ollama |
| Storage | R2 | S3 | S3 | GCS | GCS | Blob Storage | Blob Storage | Spaces | Local/S3 |
| Rate Limiter | KV | ElastiCache | ElastiCache | Memorystore | Memorystore | Redis Cache | Redis Cache | Redis | Redis |
| Scheduler | KV | DynamoDB | Redis | Memorystore | Memorystore | Redis Cache | Redis Cache | Redis | Redis |
| Broadcast | KV | ElastiCache | ElastiCache | Memorystore | Memorystore | Redis Cache | Redis Cache | Redis | Redis |
| SSE Backend | KV | -- | Redis | Redis | -- | -- | Redis | Redis | Redis |
| Search | FTS5 (D1) | OpenSearch | OpenSearch | -- | -- | -- | -- | -- | OpenSearch |
| Sessions | KV | DynamoDB | Redis | Memorystore | Memorystore | Redis Cache | Redis Cache | Redis | Redis |
| Logger | Console/Logpush | CloudWatch | CloudWatch | Cloud Logging | Cloud Logging | App Insights | App Insights | -- | stdout |

## Today: Cloudflare

The `adapter` field is **optional** in `createCruzApp()`. Without it, the
framework uses `CloudflareContext` directly. The Cloudflare adapter is the only
supported target:

```typescript
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';

export default createCruzApp({
  schema,
  modules: [/* your modules */],
  adapter: new CloudflareAdapter(),
  pages: () => import('virtual:react-router/server-build'),
});
```

See [Adapter Setup](/adapters/cloudflare) to configure it.
