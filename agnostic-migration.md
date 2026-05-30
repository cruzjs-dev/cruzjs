# CruzJS Provider-Agnostic Migration Plan

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Cloudflare Coupling Analysis](#2-current-cloudflare-coupling-analysis)
3. [Target Architecture](#3-target-architecture)
4. [Phase 1: Core Abstractions](#4-phase-1-core-abstractions)
5. [Phase 2: Runtime Adapters](#5-phase-2-runtime-adapters)
6. [Phase 3: Service Adapters](#6-phase-3-service-adapters)
7. [Phase 4: CLI & Deployment Adapters](#7-phase-4-cli--deployment-adapters)
8. [Phase 5: Database Dialect Support](#8-phase-5-database-dialect-support)
9. [Provider-Specific Adapter Deep Dives](#9-provider-specific-adapter-deep-dives)
10. [Package Restructuring](#10-package-restructuring)
11. [Migration Path for Existing Apps](#11-migration-path-for-existing-apps)
12. [Implementation Order & Dependencies](#12-implementation-order--dependencies)

---

## 1. Executive Summary

CruzJS is currently deeply coupled to Cloudflare at three layers:

- **Runtime**: Workers/Pages execution model (`ExportedHandler`, `env` bindings, `ExecutionContext`)
- **Services**: D1, KV, R2, Queues, Workers AI
- **Tooling**: wrangler CLI for dev, migrate, deploy

The goal is to make CruzJS run on **any** platform while keeping Cloudflare as a first-class (and default) target. The approach:

1. Define **provider-agnostic interfaces** for every infrastructure concern
2. Move Cloudflare implementations behind those interfaces as the **default adapters**
3. Build additional adapters for AWS, GCP, Azure, DigitalOcean, and self-hosted (Docker)
4. Make the CLI extensible with provider plugins
5. Let `cruz.config.ts` declare the target provider, and everything flows from that

### Supported Target Providers

| Provider | Serverless | Container/VM |
|----------|-----------|--------------|
| **Cloudflare** | Workers/Pages (current) | - |
| **AWS** | Lambda + API Gateway | Fargate (ECS) |
| **Google Cloud** | Cloud Functions / Cloud Run (serverless) | Cloud Run (container) |
| **Azure** | Azure Functions | Azure Container Apps |
| **DigitalOcean** | App Platform (serverless) | App Platform (container) / Droplets |
| **Self-Hosted** | - | Docker (Dokploy, Coolify, bare metal) |

---

## 2. Current Cloudflare Coupling Analysis

### Coupling Severity Matrix

| Subsystem | Coupling | Abstraction Exists? | Decoupling Effort |
|-----------|----------|--------------------|--------------------|
| `CloudflareContext` (binding hub) | CRITICAL | No | High |
| `createCruzApp()` (server entry) | VERY HIGH | No | High |
| CLI / Deployment | TOTAL | No | Very High |
| Database (D1/SQLite) | HIGH | Partial (`LocalDb`) | Medium |
| KV Cache | HIGH | Partial (`LocalKV`) | Medium |
| Queues / Jobs | HIGH | Partial (`LocalQueue`) | Medium |
| Object Storage (R2) | MEDIUM | Yes (`StorageDriver`) | Low |
| AI Service | MEDIUM | No | Medium |
| Email | LOW | Yes (multi-provider) | Low |
| tRPC | MINIMAL | N/A | Trivial |
| Auth | MINIMAL | N/A | Trivial |
| DI System | NONE | N/A | Zero |
| Events | NONE | N/A | Zero |

### Key Files with Cloudflare Dependencies

```
packages/core/src/shared/cloudflare/context.ts          -- Central binding hub (imported everywhere)
packages/core/src/framework/create-cruz-app.ts           -- ExportedHandler shape, CF Worker lifecycle
packages/core/src/shared/database/drizzle.service.ts     -- D1Database type, DrizzleD1Database
packages/core/src/shared/cloudflare/kv-cache.service.ts  -- KVNamespace direct usage
packages/core/src/shared/cloudflare/r2.service.ts        -- R2Bucket direct usage
packages/core/src/queues/queue.service.ts                -- CF Queue binding
packages/core/src/ai/ai.service.ts                       -- Workers AI binding
packages/core/src/jobs/job.service.ts                    -- Queue dispatch via CloudflareContext
packages/cli/src/config/wrangler-generator.ts            -- wrangler.toml generation
packages/cli/src/utils/wrangler.ts                       -- All CLI commands shell to wrangler
apps/web/src/server.cloudflare.ts                        -- CF Pages entry
apps/web/src/entry.server.tsx                            -- CloudflareContext.init()
```

---

## 3. Target Architecture

### Layered Adapter Model

```
┌─────────────────────────────────────────────────────┐
│                    cruz.config.ts                     │
│              provider: "cloudflare" | "aws-lambda"    │
│              | "aws-fargate" | "gcp-run" | ...        │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              @cruzjs/core (framework)                │
│                                                      │
│  ┌─────────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ RuntimeCtx  │ │ Database │ │ Cache / Storage  │  │
│  │ (interface) │ │(interface)│ │ Queue / AI       │  │
│  └──────┬──────┘ └────┬─────┘ └───────┬──────────┘  │
│         │              │               │             │
│    uses interfaces only — no provider imports        │
└─────────┼──────────────┼───────────────┼─────────────┘
          │              │               │
┌─────────▼──────────────▼───────────────▼─────────────┐
│              Provider Adapter Packages                │
│                                                       │
│  @cruzjs/adapter-cloudflare   (Workers, D1, KV, R2)  │
│  @cruzjs/adapter-aws          (Lambda/Fargate, RDS,   │
│                                 ElastiCache, S3, SQS) │
│  @cruzjs/adapter-gcp          (Cloud Run, CloudSQL,   │
│                                 Memorystore, GCS, Pub/Sub) │
│  @cruzjs/adapter-azure        (Functions/Container Apps, │
│                                 Azure SQL, Redis, Blob, │
│                                 Service Bus)           │
│  @cruzjs/adapter-digitalocean (App Platform, Managed DB, │
│                                 Spaces, Redis)         │
│  @cruzjs/adapter-docker       (Node server, Postgres/  │
│                                 MySQL, Redis, S3-compat,│
│                                 BullMQ)                │
└───────────────────────────────────────────────────────┘
```

### New Package Structure

```
packages/
  core/                    -- Framework runtime (interfaces only, zero provider imports)
  adapter-cloudflare/      -- Cloudflare Workers/Pages adapter
  adapter-aws/             -- AWS Lambda + Fargate adapter
  adapter-gcp/             -- Google Cloud Run + Functions adapter
  adapter-azure/           -- Azure Functions + Container Apps adapter
  adapter-digitalocean/    -- DigitalOcean App Platform adapter
  adapter-docker/          -- Self-hosted Docker adapter (Dokploy, Coolify, etc.)
  start/                   -- UI components (unchanged, provider-agnostic)
  pro/                     -- Billing, admin (unchanged)
  cli/                     -- Unified CLI with provider plugins
  create-cruz-app/         -- Scaffolding (now asks which provider)
```

---

## 4. Phase 1: Core Abstractions

This phase extracts provider-agnostic interfaces from `@cruzjs/core`. No behavior changes — just interface definitions.

### 4.1 RuntimeContext Interface

Replace `CloudflareContext` with a provider-agnostic `RuntimeContext`.

```typescript
// packages/core/src/runtime/runtime-context.ts

export interface RuntimeContext {
  /** Initialize context from platform-specific request data */
  init(platformContext: unknown): void;

  /** Get the database connection for this request */
  readonly db: DatabaseBinding;

  /** Get a cache namespace */
  cache(namespace?: string): CacheBinding;

  /** Get an object storage bucket */
  storage(bucket?: string): StorageBinding;

  /** Get a queue by name */
  queue(name: string): QueueBinding;

  /** Get an AI/ML provider */
  ai(): AIBinding | null;

  /** Get a raw platform-specific binding (escape hatch) */
  getBinding<T = unknown>(name: string): T | undefined;

  /** Background work that should complete after response */
  waitUntil(promise: Promise<unknown>): void;

  /** Platform environment variables */
  env: Record<string, string | undefined>;
}
```

**Key design decision**: `RuntimeContext` is a **per-request singleton** in the DI container, not a static class. This eliminates the global mutable state pattern of `CloudflareContext` and makes testing trivial.

### 4.2 DatabaseBinding Interface

```typescript
// packages/core/src/runtime/bindings/database.ts

import type { DrizzleConfig } from "drizzle-orm";

export interface DatabaseBinding {
  /** Get the Drizzle ORM instance */
  getDrizzle(): DrizzleDatabase;

  /** Get the raw driver connection (escape hatch) */
  getRawConnection(): unknown;

  /** Database dialect for schema generation */
  readonly dialect: "sqlite" | "postgres" | "mysql";
}

/** Union type — the actual Drizzle instance type depends on the dialect */
export type DrizzleDatabase =
  | DrizzleD1Database<any>
  | DrizzlePgDatabase<any>
  | DrizzleMySqlDatabase<any>
  | DrizzleBetterSQLiteDatabase<any>;
```

### 4.3 CacheBinding Interface

```typescript
// packages/core/src/runtime/bindings/cache.ts

export interface CacheBinding {
  get<T = string>(key: string, options?: CacheGetOptions): Promise<T | null>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: CachePutOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  list(options?: CacheListOptions): Promise<CacheListResult>;
}

export interface CacheGetOptions {
  type?: "text" | "json" | "arrayBuffer" | "stream";
}

export interface CachePutOptions {
  ttlSeconds?: number;
  metadata?: Record<string, string>;
}

export interface CacheListOptions {
  prefix?: string;
  cursor?: string;
  limit?: number;
}

export interface CacheListResult {
  keys: { name: string; metadata?: Record<string, string> }[];
  cursor?: string;
  done: boolean;
}
```

### 4.4 StorageBinding Interface

Already exists as `StorageDriver` in `packages/core/src/shared/storage/storage.interface.ts`. Rename to `StorageBinding` for consistency and promote to `runtime/bindings/`.

### 4.5 QueueBinding Interface

```typescript
// packages/core/src/runtime/bindings/queue.ts

export interface QueueBinding {
  send(message: unknown): Promise<void>;
  sendBatch(messages: { body: unknown; delaySeconds?: number }[]): Promise<void>;
}

export interface QueueConsumer {
  /** Process a batch of messages */
  consume(handler: (messages: QueueMessage[]) => Promise<void>): void;
}

export interface QueueMessage {
  id: string;
  body: unknown;
  timestamp: Date;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}
```

### 4.6 AIBinding Interface

```typescript
// packages/core/src/runtime/bindings/ai.ts

export interface AIBinding {
  chat(options: AIChatOptions): Promise<AIChatResponse>;
  embed(options: AIEmbedOptions): Promise<AIEmbedResponse>;
  extractStructured<T>(options: AIExtractOptions): Promise<T>;
}

export interface AIChatOptions {
  model?: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  maxTokens?: number;
}

// ... response types
```

### 4.7 SchedulerBinding Interface

```typescript
// packages/core/src/runtime/bindings/scheduler.ts

export interface SchedulerBinding {
  /** Register a cron handler */
  onSchedule(cron: string, handler: () => Promise<void>): void;
}
```

### 4.8 RuntimeAdapter Interface

The top-level adapter that each provider implements:

```typescript
// packages/core/src/runtime/runtime-adapter.ts

export interface RuntimeAdapter {
  readonly name: string;
  readonly type: "serverless" | "container" | "edge";

  /** Create the platform-specific HTTP handler */
  createHandler(app: CruzApp): PlatformHandler;

  /** Create the platform-specific queue consumer (if supported) */
  createQueueConsumer?(app: CruzApp): PlatformQueueConsumer;

  /** Create the platform-specific cron/scheduler (if supported) */
  createScheduler?(app: CruzApp): PlatformScheduler;

  /** Initialize the RuntimeContext for a given request */
  createRequestContext(platformRequest: unknown): RuntimeContext;
}

/** Platform-agnostic app definition */
export interface CruzApp {
  container: CruzContainer;
  modules: ContainerModule[];
  config: CruzConfig;
}
```

---

## 5. Phase 2: Runtime Adapters

Each provider needs a runtime adapter that bridges the platform's request lifecycle to CruzJS.

### 5.1 Cloudflare Adapter (`@cruzjs/adapter-cloudflare`)

**What it wraps**: Workers/Pages `ExportedHandler` with `fetch`, `queue`, `scheduled` exports.

```typescript
// packages/adapter-cloudflare/src/index.ts

import type { RuntimeAdapter, RuntimeContext, CruzApp } from "@cruzjs/core";

export class CloudflareAdapter implements RuntimeAdapter {
  readonly name = "cloudflare";
  readonly type = "edge" as const;

  createHandler(app: CruzApp): ExportedHandler {
    return {
      fetch: async (request: Request, env: Env, ctx: ExecutionContext) => {
        const runtimeCtx = this.createRequestContext({ request, env, ctx });
        return app.handleRequest(request, runtimeCtx);
      },
      queue: async (batch: MessageBatch, env: Env, ctx: ExecutionContext) => {
        const runtimeCtx = this.createRequestContext({ env, ctx });
        const messages = batch.messages.map(m => ({
          id: m.id,
          body: m.body,
          timestamp: m.timestamp,
          ack: () => m.ack(),
          retry: (opts) => m.retry(opts),
        }));
        return app.handleQueue(batch.queue, messages, runtimeCtx);
      },
      scheduled: async (controller: ScheduledController, env: Env, ctx: ExecutionContext) => {
        const runtimeCtx = this.createRequestContext({ env, ctx });
        return app.handleScheduled(controller.cron, runtimeCtx);
      },
    };
  }

  createRequestContext({ env, ctx }): RuntimeContext {
    return new CloudflareRuntimeContext(env, ctx);
  }
}

class CloudflareRuntimeContext implements RuntimeContext {
  constructor(private env: Env, private ctx: ExecutionContext) {}

  init() {
    // Bridge env vars to process.env for compatibility
    for (const [key, value] of Object.entries(this.env)) {
      if (typeof value === "string") process.env[key] = value;
    }
  }

  get db() { return new D1DatabaseBinding(this.env.DB); }
  cache(ns?: string) { return new KVCacheBinding(this.env.KV, ns); }
  storage(bucket?: string) { return new R2StorageBinding(this.env.R2); }
  queue(name: string) { return new CFQueueBinding(this.env[name]); }
  ai() { return new WorkersAIBinding(this.env.AI); }
  getBinding<T>(name: string) { return this.env[name] as T; }
  waitUntil(p: Promise<unknown>) { this.ctx.waitUntil(p); }
  get env_vars() { /* ... */ }
}
```

**Service bindings in this adapter**:
- `D1DatabaseBinding` — wraps `D1Database` → `drizzle(d1)`
- `KVCacheBinding` — wraps `KVNamespace`
- `R2StorageBinding` — wraps `R2Bucket` (existing `R2StorageDriver` logic)
- `CFQueueBinding` — wraps CF Queue `send`/`sendBatch`
- `WorkersAIBinding` — wraps `env.AI.run()`

### 5.2 AWS Lambda Adapter (`@cruzjs/adapter-aws` — serverless mode)

**What it wraps**: API Gateway v2 (HTTP API) + Lambda handler.

```typescript
// packages/adapter-aws/src/lambda/index.ts

import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

export class AWSLambdaAdapter implements RuntimeAdapter {
  readonly name = "aws-lambda";
  readonly type = "serverless" as const;

  createHandler(app: CruzApp): APIGatewayProxyHandlerV2 {
    return async (event, context) => {
      // Convert API Gateway event to standard Request
      const request = apiGatewayToRequest(event);
      const runtimeCtx = this.createRequestContext({ event, context });
      const response = await app.handleRequest(request, runtimeCtx);
      return responseToApiGateway(response);
    };
  }

  createRequestContext({ event, context }): RuntimeContext {
    return new AWSLambdaRuntimeContext(context);
  }
}

class AWSLambdaRuntimeContext implements RuntimeContext {
  private _db: DatabaseBinding;
  private _cache: CacheBinding;

  constructor(private lambdaContext: LambdaContext) {
    // AWS uses environment variables for config, not request-scoped bindings
    // Connections are typically initialized at cold start, reused across invocations
  }

  get db() {
    if (!this._db) {
      // Choose based on config: RDS (Postgres/MySQL) via Data API, or Neon, or PlanetScale
      const dialect = process.env.CRUZ_DB_DIALECT || "postgres";
      if (dialect === "postgres") {
        this._db = new PostgresDatabaseBinding(process.env.DATABASE_URL!);
      } else if (dialect === "mysql") {
        this._db = new MySQLDatabaseBinding(process.env.DATABASE_URL!);
      }
    }
    return this._db;
  }

  cache(ns?: string) {
    // ElastiCache Redis or DynamoDB-backed cache
    return new RedisCacheBinding(process.env.REDIS_URL!, ns);
  }

  storage(bucket?: string) {
    return new S3StorageBinding(bucket || process.env.S3_BUCKET!);
  }

  queue(name: string) {
    return new SQSQueueBinding(process.env[`QUEUE_URL_${name.toUpperCase()}`]!);
  }

  ai() {
    return new BedrockAIBinding(); // or OpenAI-compatible
  }

  waitUntil(p: Promise<unknown>) {
    // Lambda doesn't have waitUntil — we must await before responding
    // or use Lambda response streaming + background work via Lambda Destinations
    // For now, register and await all pending promises before returning
    this._pendingWork.push(p);
  }

  get env() { return process.env as Record<string, string | undefined>; }
}
```

**Service bindings**:
- `PostgresDatabaseBinding` — `drizzle(postgres(connectionString))`
- `MySQLDatabaseBinding` — `drizzle(mysql2(connectionString))`
- `RDSDataAPIBinding` — for RDS Data API (serverless Aurora)
- `RedisCacheBinding` — ioredis or `@upstash/redis`
- `S3StorageBinding` — `@aws-sdk/client-s3` implementing `StorageBinding`
- `SQSQueueBinding` — `@aws-sdk/client-sqs` implementing `QueueBinding`
- `BedrockAIBinding` — `@aws-sdk/client-bedrock-runtime` implementing `AIBinding`

**SQS Queue Consumer** (separate Lambda):
```typescript
// packages/adapter-aws/src/lambda/sqs-consumer.ts

import type { SQSHandler } from "aws-lambda";

export function createSQSConsumer(app: CruzApp): SQSHandler {
  return async (event) => {
    const messages: QueueMessage[] = event.Records.map(record => ({
      id: record.messageId,
      body: JSON.parse(record.body),
      timestamp: new Date(parseInt(record.attributes.SentTimestamp)),
      ack: () => {}, // SQS auto-deletes on success
      retry: () => { throw new Error("Message will auto-retry on failure"); },
    }));
    await app.handleQueue(event.Records[0]?.eventSourceARN, messages, runtimeCtx);
  };
}
```

**Cron/Scheduler** (EventBridge → Lambda):
```typescript
// packages/adapter-aws/src/lambda/scheduled.ts

import type { ScheduledHandler } from "aws-lambda";

export function createScheduledHandler(app: CruzApp): ScheduledHandler {
  return async (event) => {
    // event.detail-type === "Scheduled Event", event.resources[0] has the rule ARN
    const cron = event.resources[0]; // map back to cron expression
    await app.handleScheduled(cron, runtimeCtx);
  };
}
```

### 5.3 AWS Fargate Adapter (`@cruzjs/adapter-aws` — container mode)

**What it wraps**: A long-running Node.js process behind an ALB, running in ECS Fargate.

```typescript
// packages/adapter-aws/src/fargate/index.ts

import { createServer } from "node:http";

export class AWSFargateAdapter implements RuntimeAdapter {
  readonly name = "aws-fargate";
  readonly type = "container" as const;

  createHandler(app: CruzApp) {
    // Returns a Node.js HTTP server — same as Docker adapter
    // but with AWS-specific service discovery and health checks
    return createNodeHandler(app, {
      healthCheck: "/health",
      // ECS uses ALB health checks on this path
      // Connections are persistent (not per-request like Lambda)
    });
  }

  createRequestContext(): RuntimeContext {
    return new AWSContainerRuntimeContext();
  }
}

class AWSContainerRuntimeContext implements RuntimeContext {
  // Same bindings as Lambda but connections are long-lived
  // Use connection pooling for database
  private static pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  get db() {
    return new PostgresDatabaseBinding(AWSContainerRuntimeContext.pool);
  }

  // Cache, storage, queue — same as Lambda (use AWS SDKs)

  waitUntil(p: Promise<unknown>) {
    // In container mode, we can fire-and-forget safely
    p.catch(err => console.error("Background work failed:", err));
  }
}
```

**Key difference from Lambda**: Connection pooling is possible and preferred. The process is long-lived. `waitUntil` can truly fire-and-forget. BullMQ can be used for queues since we have a persistent process.

### 5.4 Google Cloud Run Adapter (`@cruzjs/adapter-gcp`)

**Serverless mode** (Cloud Run with scale-to-zero):

```typescript
// packages/adapter-gcp/src/cloud-run/index.ts

export class GCPCloudRunAdapter implements RuntimeAdapter {
  readonly name = "gcp-cloud-run";
  readonly type = "container" as const; // Cloud Run is container-based but serverless

  createHandler(app: CruzApp) {
    // Cloud Run receives standard HTTP requests
    // Uses the same Node.js HTTP handler as Docker
    return createNodeHandler(app, {
      port: parseInt(process.env.PORT || "8080"),
      healthCheck: "/health",
    });
  }

  createRequestContext(): RuntimeContext {
    return new GCPRuntimeContext();
  }
}

class GCPRuntimeContext implements RuntimeContext {
  get db() {
    // Cloud SQL (Postgres or MySQL) via Unix socket or connection string
    // Also supports AlloyDB, Spanner (with Drizzle adapter), Firestore
    const dialect = process.env.CRUZ_DB_DIALECT || "postgres";
    if (dialect === "postgres") {
      return new PostgresDatabaseBinding(process.env.DATABASE_URL!);
    }
    return new MySQLDatabaseBinding(process.env.DATABASE_URL!);
  }

  cache(ns?: string) {
    // Memorystore (Redis) or Firestore
    return new RedisCacheBinding(process.env.REDIS_URL!, ns);
  }

  storage(bucket?: string) {
    return new GCSStorageBinding(bucket || process.env.GCS_BUCKET!);
  }

  queue(name: string) {
    // Cloud Pub/Sub or Cloud Tasks
    return new PubSubQueueBinding(process.env.GCP_PROJECT_ID!, name);
  }

  ai() {
    // Vertex AI
    return new VertexAIBinding(process.env.GCP_PROJECT_ID!, process.env.GCP_REGION!);
  }

  waitUntil(p: Promise<unknown>) {
    // Cloud Run supports background processing if CPU is set to "always allocated"
    p.catch(err => console.error("Background work failed:", err));
  }
}
```

**Service bindings**:
- `GCSStorageBinding` — `@google-cloud/storage` implementing `StorageBinding`
- `PubSubQueueBinding` — `@google-cloud/pubsub` implementing `QueueBinding`
- `CloudTasksQueueBinding` — alternative queue via Cloud Tasks (HTTP-based, with retry)
- `VertexAIBinding` — Vertex AI SDK for chat/embed
- `RedisCacheBinding` — shared with AWS adapter (same `ioredis` under the hood)

**Cloud Functions mode** (alternative to Cloud Run):
```typescript
// packages/adapter-gcp/src/cloud-functions/index.ts

import * as functions from "@google-cloud/functions-framework";

export class GCPFunctionsAdapter implements RuntimeAdapter {
  readonly name = "gcp-functions";
  readonly type = "serverless" as const;

  createHandler(app: CruzApp) {
    functions.http("cruzApp", async (req, res) => {
      const request = nodeRequestToWebRequest(req);
      const runtimeCtx = this.createRequestContext();
      const response = await app.handleRequest(request, runtimeCtx);
      await writeWebResponseToNode(response, res);
    });
  }
}
```

### 5.5 Azure Adapter (`@cruzjs/adapter-azure`)

**Azure Functions mode** (serverless):

```typescript
// packages/adapter-azure/src/functions/index.ts

import { app as azureApp, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export class AzureFunctionsAdapter implements RuntimeAdapter {
  readonly name = "azure-functions";
  readonly type = "serverless" as const;

  createHandler(cruzApp: CruzApp) {
    azureApp.http("cruzHandler", {
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      route: "{*path}",
      handler: async (req: HttpRequest, context: InvocationContext) => {
        const request = azureRequestToWebRequest(req);
        const runtimeCtx = this.createRequestContext({ req, context });
        const response = await cruzApp.handleRequest(request, runtimeCtx);
        return webResponseToAzure(response);
      },
    });
  }

  createRequestContext({ context }): RuntimeContext {
    return new AzureRuntimeContext(context);
  }
}

class AzureRuntimeContext implements RuntimeContext {
  constructor(private context: InvocationContext) {}

  get db() {
    // Azure SQL (Postgres-compatible via Citus/Flexible Server) or Azure SQL Database (MS SQL)
    // Recommend Postgres flexible server for Drizzle compatibility
    return new PostgresDatabaseBinding(process.env.DATABASE_URL!);
  }

  cache(ns?: string) {
    // Azure Cache for Redis
    return new RedisCacheBinding(process.env.REDIS_URL!, ns);
  }

  storage(bucket?: string) {
    // Azure Blob Storage
    return new AzureBlobStorageBinding(
      process.env.AZURE_STORAGE_CONNECTION_STRING!,
      bucket || process.env.AZURE_CONTAINER_NAME!
    );
  }

  queue(name: string) {
    // Azure Service Bus or Storage Queues
    return new ServiceBusQueueBinding(process.env.AZURE_SERVICEBUS_CONNECTION!, name);
  }

  ai() {
    // Azure OpenAI Service
    return new AzureOpenAIBinding(
      process.env.AZURE_OPENAI_ENDPOINT!,
      process.env.AZURE_OPENAI_API_KEY!
    );
  }

  waitUntil(p: Promise<unknown>) {
    // Azure Functions supports Durable Functions for background work
    // For simple fire-and-forget, just catch errors
    p.catch(err => this.context.error("Background work failed:", err));
  }
}
```

**Azure Container Apps mode**:
```typescript
// packages/adapter-azure/src/container-apps/index.ts

export class AzureContainerAppsAdapter implements RuntimeAdapter {
  readonly name = "azure-container-apps";
  readonly type = "container" as const;

  createHandler(app: CruzApp) {
    // Same Node.js HTTP server pattern as Docker adapter
    // Azure Container Apps handles scaling, HTTPS termination
    return createNodeHandler(app, {
      port: parseInt(process.env.PORT || "8080"),
      healthCheck: "/health",
    });
  }
}
```

**Service bindings**:
- `AzureBlobStorageBinding` — `@azure/storage-blob` implementing `StorageBinding`
- `ServiceBusQueueBinding` — `@azure/service-bus` implementing `QueueBinding`
- `AzureOpenAIBinding` — `@azure/openai` implementing `AIBinding`
- `RedisCacheBinding` — shared implementation (Azure Cache for Redis uses standard Redis protocol)

**Queue consumer** (Azure Functions with Service Bus trigger):
```typescript
azureApp.serviceBusQueue("queueConsumer", {
  queueName: "cruz-jobs",
  connection: "AZURE_SERVICEBUS_CONNECTION",
  handler: async (message, context) => {
    const queueMsg: QueueMessage = {
      id: context.invocationId,
      body: message,
      timestamp: new Date(),
      ack: () => {}, // Auto-completed on success
      retry: () => { throw new Error("Retry by throwing"); },
    };
    await cruzApp.handleQueue("cruz-jobs", [queueMsg], runtimeCtx);
  },
});
```

### 5.6 DigitalOcean Adapter (`@cruzjs/adapter-digitalocean`)

**App Platform mode** (serverless):

DigitalOcean App Platform runs containers or static sites. For serverless functions, it uses a specific format.

```typescript
// packages/adapter-digitalocean/src/app-platform/index.ts

export class DigitalOceanAppPlatformAdapter implements RuntimeAdapter {
  readonly name = "digitalocean-app-platform";
  readonly type = "container" as const;

  createHandler(app: CruzApp) {
    // DO App Platform expects a standard HTTP server on $PORT
    return createNodeHandler(app, {
      port: parseInt(process.env.PORT || "8080"),
      healthCheck: "/health",
    });
  }

  createRequestContext(): RuntimeContext {
    return new DORuntimeContext();
  }
}

class DORuntimeContext implements RuntimeContext {
  get db() {
    // DigitalOcean Managed Databases (Postgres or MySQL)
    return new PostgresDatabaseBinding(process.env.DATABASE_URL!);
  }

  cache(ns?: string) {
    // DigitalOcean Managed Redis
    return new RedisCacheBinding(process.env.REDIS_URL!, ns);
  }

  storage(bucket?: string) {
    // DigitalOcean Spaces (S3-compatible API)
    return new S3StorageBinding(bucket || process.env.SPACES_BUCKET!, {
      endpoint: process.env.SPACES_ENDPOINT!,
      region: process.env.SPACES_REGION!,
      credentials: {
        accessKeyId: process.env.SPACES_KEY!,
        secretAccessKey: process.env.SPACES_SECRET!,
      },
    });
  }

  queue(name: string) {
    // No native queue service — use Redis-based BullMQ or external service
    return new BullMQQueueBinding(process.env.REDIS_URL!, name);
  }

  ai() {
    // No native AI — use OpenAI API directly
    return new OpenAIBinding(process.env.OPENAI_API_KEY!);
  }

  waitUntil(p: Promise<unknown>) {
    p.catch(err => console.error("Background work failed:", err));
  }
}
```

**Key DigitalOcean considerations**:
- Spaces uses the S3-compatible API — reuse `S3StorageBinding` with custom endpoint
- No native queue service — recommend BullMQ over Redis or an external service
- Managed Postgres/MySQL available
- Managed Redis available
- App Platform auto-scales containers, handles TLS termination
- Functions runtime supports Node.js but has limitations — prefer container mode

### 5.7 Docker / Self-Hosted Adapter (`@cruzjs/adapter-docker`)

For Dokploy, Coolify, bare Docker, Docker Compose, Kubernetes, etc.

```typescript
// packages/adapter-docker/src/index.ts

import { createServer } from "node:http";
import { nodeToWebRequest, webToNodeResponse } from "./node-compat";

export class DockerAdapter implements RuntimeAdapter {
  readonly name = "docker";
  readonly type = "container" as const;

  private bullWorkers: Worker[] = [];

  createHandler(app: CruzApp) {
    const server = createServer(async (req, res) => {
      const request = nodeToWebRequest(req);
      const runtimeCtx = this.createRequestContext();

      if (req.url === "/health") {
        res.writeHead(200);
        res.end(JSON.stringify({ status: "ok", runtime: "docker" }));
        return;
      }

      const response = await app.handleRequest(request, runtimeCtx);
      await webToNodeResponse(response, res);
    });

    const port = parseInt(process.env.PORT || "3000");
    server.listen(port, () => {
      console.log(`CruzJS running on http://localhost:${port}`);
    });

    return server;
  }

  createQueueConsumer(app: CruzApp) {
    // BullMQ workers run in-process alongside the HTTP server
    return new BullMQConsumer(app, process.env.REDIS_URL!);
  }

  createScheduler(app: CruzApp) {
    // node-cron or BullMQ repeatable jobs for scheduling
    return new NodeCronScheduler(app);
  }

  createRequestContext(): RuntimeContext {
    return new DockerRuntimeContext();
  }
}

class DockerRuntimeContext implements RuntimeContext {
  private static dbPool: pg.Pool | null = null;

  get db() {
    const dialect = process.env.CRUZ_DB_DIALECT || "postgres";
    if (dialect === "postgres") {
      if (!DockerRuntimeContext.dbPool) {
        DockerRuntimeContext.dbPool = new pg.Pool({
          connectionString: process.env.DATABASE_URL,
        });
      }
      return new PostgresDatabaseBinding(DockerRuntimeContext.dbPool);
    }
    if (dialect === "mysql") {
      return new MySQLDatabaseBinding(process.env.DATABASE_URL!);
    }
    if (dialect === "sqlite") {
      return new SQLiteDatabaseBinding(process.env.SQLITE_PATH || "./data/cruz.db");
    }
    throw new Error(`Unsupported dialect: ${dialect}`);
  }

  cache(ns?: string) {
    // Redis (any provider — local, managed, Upstash)
    return new RedisCacheBinding(process.env.REDIS_URL!, ns);
  }

  storage(bucket?: string) {
    if (process.env.S3_ENDPOINT) {
      // MinIO, Garage, any S3-compatible storage
      return new S3StorageBinding(bucket || process.env.S3_BUCKET!, {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY!,
          secretAccessKey: process.env.S3_SECRET_KEY!,
        },
        forcePathStyle: true, // Required for MinIO
      });
    }
    // Fallback to local filesystem
    return new LocalFilesystemStorageBinding(process.env.STORAGE_PATH || "./data/uploads");
  }

  queue(name: string) {
    return new BullMQQueueBinding(process.env.REDIS_URL!, name);
  }

  ai() {
    // Use any OpenAI-compatible API (Ollama, vLLM, OpenAI, etc.)
    return new OpenAIBinding(
      process.env.OPENAI_API_KEY || "",
      process.env.OPENAI_BASE_URL || "http://localhost:11434/v1" // Ollama default
    );
  }

  waitUntil(p: Promise<unknown>) {
    p.catch(err => console.error("Background work failed:", err));
  }

  get env() { return process.env as Record<string, string | undefined>; }
}
```

**Docker Compose template** (generated by CLI):
```yaml
# docker-compose.yml (generated by `cruz init docker`)
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://cruz:cruz@postgres:5432/cruzdb
      - REDIS_URL=redis://redis:6379
      - S3_ENDPOINT=http://minio:9000
      - S3_BUCKET=cruz-uploads
      - S3_ACCESS_KEY=minioadmin
      - S3_SECRET_KEY=minioadmin
      - CRUZ_PROVIDER=docker
    depends_on:
      - postgres
      - redis
      - minio

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: cruzdb
      POSTGRES_USER: cruz
      POSTGRES_PASSWORD: cruz
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - miniodata:/data

volumes:
  pgdata:
  redisdata:
  miniodata:
```

**Dockerfile** (generated by CLI):
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx cruz build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "build/server.js"]
```

---

## 6. Phase 3: Service Adapters (Deep Dive)

### 6.1 Database Adapters

This is the most complex adapter layer because the ORM dialect affects schema definitions, migrations, and query patterns.

#### Strategy: Dialect-Aware Schema

Currently all schemas use `sqliteTable` from `drizzle-orm/sqlite-core`. For multi-dialect support:

**Option A (Recommended): Dialect-Polymorphic Schema Helper**

```typescript
// packages/core/src/database/schema-helpers.ts

import { sqliteTable } from "drizzle-orm/sqlite-core";
import { pgTable } from "drizzle-orm/pg-core";
import { mysqlTable } from "drizzle-orm/mysql-core";

const dialect = process.env.CRUZ_DB_DIALECT || "sqlite";

export const defineTable = dialect === "postgres" ? pgTable
  : dialect === "mysql" ? mysqlTable
  : sqliteTable;

// Column type helpers that map across dialects
export const columnTypes = {
  id: () => dialect === "sqlite" ? text("id") : dialect === "postgres" ? uuid("id") : varchar("id", { length: 36 }),
  timestamp: (name: string) => dialect === "sqlite" ? integer(name, { mode: "timestamp" }) : dialect === "postgres" ? timestamp(name) : datetime(name),
  text: (name: string) => text(name), // Same across all
  integer: (name: string) => integer(name),
  boolean: (name: string) => dialect === "sqlite" ? integer(name, { mode: "boolean" }) : dialect === "postgres" ? boolean(name) : tinyint(name),
  json: (name: string) => dialect === "sqlite" ? text(name, { mode: "json" }) : dialect === "postgres" ? jsonb(name) : json(name),
};
```

**Option B: Separate schema files per dialect**

```
apps/web/src/database/
  schema.ts           -- re-exports from dialect-specific file
  schema.sqlite.ts    -- SQLite/D1 schema (current)
  schema.postgres.ts  -- Postgres schema
  schema.mysql.ts     -- MySQL schema
```

Option A is recommended because it keeps a single schema source of truth.

#### Database Adapter Implementations

```typescript
// Shared across adapters
interface DatabaseAdapter {
  readonly dialect: "sqlite" | "postgres" | "mysql";
  connect(config: DatabaseConfig): DrizzleDatabase;
  runMigrations(migrationsPath: string): Promise<void>;
  generateMigrations(schemaPath: string, outPath: string): Promise<void>;
}
```

| Provider | Database | Adapter | Connection |
|----------|----------|---------|------------|
| Cloudflare | D1 (SQLite) | `D1Adapter` | `drizzle(env.DB)` |
| AWS Lambda | RDS Postgres | `PostgresAdapter` | Data API or `pg` with RDS Proxy |
| AWS Lambda | Aurora Serverless | `PostgresAdapter` | Data API |
| AWS Fargate | RDS Postgres | `PostgresAdapter` | `pg.Pool` |
| GCP Cloud Run | Cloud SQL Postgres | `PostgresAdapter` | Unix socket or TCP |
| GCP Cloud Run | AlloyDB | `PostgresAdapter` | Postgres-compatible |
| Azure | Flexible Server Postgres | `PostgresAdapter` | TCP |
| DigitalOcean | Managed Postgres | `PostgresAdapter` | TCP |
| Docker | Postgres container | `PostgresAdapter` | `pg.Pool` |
| Docker | MySQL container | `MySQLAdapter` | `mysql2` |
| Docker | SQLite file | `SQLiteAdapter` | `better-sqlite3` |

**Migration tooling per adapter**:

| Adapter | Migration Tool |
|---------|---------------|
| D1/SQLite | `wrangler d1 migrations apply` (Cloudflare) or `drizzle-kit push` |
| Postgres | `drizzle-kit migrate` with `pg` driver |
| MySQL | `drizzle-kit migrate` with `mysql2` driver |

### 6.2 Cache Adapters

```typescript
// Common implementations shared across providers

class RedisCacheBinding implements CacheBinding {
  private client: Redis;
  private prefix: string;

  constructor(redisUrl: string, namespace?: string) {
    this.client = new Redis(redisUrl);
    this.prefix = namespace ? `${namespace}:` : "";
  }

  async get<T>(key: string, opts?: CacheGetOptions): Promise<T | null> {
    const value = await this.client.get(this.prefix + key);
    if (!value) return null;
    if (opts?.type === "json") return JSON.parse(value) as T;
    return value as T;
  }

  async put(key: string, value: string, opts?: CachePutOptions): Promise<void> {
    if (opts?.ttlSeconds) {
      await this.client.setex(this.prefix + key, opts.ttlSeconds, String(value));
    } else {
      await this.client.set(this.prefix + key, String(value));
    }
  }

  async delete(key: string): Promise<boolean> {
    return (await this.client.del(this.prefix + key)) > 0;
  }

  async list(opts?: CacheListOptions): Promise<CacheListResult> {
    const pattern = this.prefix + (opts?.prefix || "") + "*";
    const [cursor, keys] = await this.client.scan(
      opts?.cursor ? parseInt(opts.cursor) : 0,
      "MATCH", pattern,
      "COUNT", opts?.limit || 100
    );
    return {
      keys: keys.map(k => ({ name: k.slice(this.prefix.length) })),
      cursor: cursor === "0" ? undefined : cursor,
      done: cursor === "0",
    };
  }
}
```

| Provider | Cache Service | Adapter |
|----------|--------------|---------|
| Cloudflare | KV | `KVCacheBinding` (wraps KVNamespace) |
| AWS | ElastiCache Redis | `RedisCacheBinding` |
| AWS | DynamoDB | `DynamoDBCacheBinding` (for serverless) |
| GCP | Memorystore Redis | `RedisCacheBinding` |
| Azure | Azure Cache for Redis | `RedisCacheBinding` |
| DigitalOcean | Managed Redis | `RedisCacheBinding` |
| Docker | Redis container | `RedisCacheBinding` |
| Docker | In-memory | `MemoryCacheBinding` (for single-instance) |

### 6.3 Storage Adapters

The `StorageDriver` interface already exists. New implementations:

```typescript
// packages/adapter-aws/src/bindings/s3-storage.ts
class S3StorageBinding implements StorageBinding {
  private client: S3Client;
  constructor(bucket: string, config?: S3ClientConfig) {
    this.client = new S3Client(config || {});
    this.bucket = bucket;
  }
  async put(key, data, opts) { /* PutObjectCommand */ }
  async get(key) { /* GetObjectCommand */ }
  async delete(key) { /* DeleteObjectCommand */ }
  async exists(key) { /* HeadObjectCommand */ }
  async getMetadata(key) { /* HeadObjectCommand */ }
  async url(key) { /* construct public URL */ }
  async signedUrl(key, opts) { /* GetObjectCommand + getSignedUrl */ }
  async getPresignedUploadUrl(key, opts) { /* PutObjectCommand + getSignedUrl */ }
}
```

| Provider | Storage Service | Adapter |
|----------|----------------|---------|
| Cloudflare | R2 | `R2StorageBinding` (existing) |
| AWS | S3 | `S3StorageBinding` |
| GCP | Cloud Storage | `GCSStorageBinding` |
| Azure | Blob Storage | `AzureBlobStorageBinding` |
| DigitalOcean | Spaces | `S3StorageBinding` (S3-compatible) |
| Docker | MinIO | `S3StorageBinding` (S3-compatible) |
| Docker | Local FS | `LocalFilesystemStorageBinding` |

### 6.4 Queue Adapters

```typescript
// packages/adapter-aws/src/bindings/sqs-queue.ts
class SQSQueueBinding implements QueueBinding {
  private client: SQSClient;
  constructor(queueUrl: string) {
    this.client = new SQSClient({});
    this.queueUrl = queueUrl;
  }
  async send(message) {
    await this.client.send(new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(message),
    }));
  }
  async sendBatch(messages) {
    await this.client.send(new SendMessageBatchCommand({
      QueueUrl: this.queueUrl,
      Entries: messages.map((m, i) => ({
        Id: String(i),
        MessageBody: JSON.stringify(m.body),
        DelaySeconds: m.delaySeconds,
      })),
    }));
  }
}

// packages/adapter-docker/src/bindings/bullmq-queue.ts
class BullMQQueueBinding implements QueueBinding {
  private queue: Queue;
  constructor(redisUrl: string, name: string) {
    this.queue = new Queue(name, { connection: parseRedisUrl(redisUrl) });
  }
  async send(message) {
    await this.queue.add("job", message);
  }
  async sendBatch(messages) {
    await this.queue.addBulk(messages.map(m => ({
      name: "job",
      data: m.body,
      opts: { delay: (m.delaySeconds || 0) * 1000 },
    })));
  }
}
```

| Provider | Queue Service | Adapter | Consumer |
|----------|--------------|---------|----------|
| Cloudflare | Queues | `CFQueueBinding` | Worker `queue` handler |
| AWS | SQS | `SQSQueueBinding` | Lambda SQS trigger |
| AWS | SQS (Fargate) | `SQSQueueBinding` | In-process poller |
| GCP | Pub/Sub | `PubSubQueueBinding` | Push subscription to Cloud Run |
| GCP | Cloud Tasks | `CloudTasksQueueBinding` | HTTP endpoint handler |
| Azure | Service Bus | `ServiceBusQueueBinding` | Azure Functions trigger |
| DigitalOcean | BullMQ (Redis) | `BullMQQueueBinding` | In-process worker |
| Docker | BullMQ (Redis) | `BullMQQueueBinding` | In-process worker |

### 6.5 AI Adapters

```typescript
// packages/core/src/runtime/bindings/ai.ts — shared OpenAI-compatible implementation

class OpenAICompatibleBinding implements AIBinding {
  constructor(
    private apiKey: string,
    private baseUrl: string = "https://api.openai.com/v1",
    private defaultModel: string = "gpt-4o",
  ) {}

  async chat(opts: AIChatOptions): Promise<AIChatResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: opts.model || this.defaultModel,
        messages: opts.messages,
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
      }),
    });
    return res.json();
  }

  // embed, extractStructured — similar
}
```

| Provider | AI Service | Adapter |
|----------|-----------|---------|
| Cloudflare | Workers AI + AI Gateway | `WorkersAIBinding` |
| AWS | Bedrock | `BedrockAIBinding` |
| GCP | Vertex AI | `VertexAIBinding` |
| Azure | Azure OpenAI | `AzureOpenAIBinding` |
| DigitalOcean | OpenAI API | `OpenAICompatibleBinding` |
| Docker | Ollama / vLLM / OpenAI | `OpenAICompatibleBinding` |

---

## 7. Phase 4: CLI & Deployment Adapters

The CLI needs the most extensive rework. Currently it's monolithically tied to wrangler.

### 7.1 CLI Provider Plugin Architecture

```typescript
// packages/cli/src/providers/provider.interface.ts

export interface CLIProvider {
  readonly name: string;

  // Dev server
  dev: {
    start(config: CruzConfig): Promise<void>;
    stop(): Promise<void>;
  };

  // Database operations
  db: {
    migrate(config: CruzConfig, opts: { remote?: boolean }): Promise<void>;
    query(config: CruzConfig, sql: string, opts: { remote?: boolean }): Promise<void>;
    studio(config: CruzConfig): Promise<void>;
    seed(config: CruzConfig): Promise<void>;
    generate(config: CruzConfig): Promise<void>;
    hardReset(config: CruzConfig): Promise<void>;
  };

  // Deployment
  deploy: {
    build(config: CruzConfig): Promise<void>;
    push(config: CruzConfig, env: string): Promise<void>;
    preview(config: CruzConfig): Promise<void>;
    destroy(config: CruzConfig, env: string): Promise<void>;
    status(config: CruzConfig): Promise<void>;
  };

  // Infrastructure init
  init(config: CruzConfig, env: string): Promise<void>;

  // Secrets
  secrets: {
    set(config: CruzConfig, key: string, value: string): Promise<void>;
    list(config: CruzConfig): Promise<void>;
  };

  // Scaffold
  scaffold: {
    worker(name: string): Promise<void>;
    workflow(name: string): Promise<void>;
    queueWorker(name: string, queue: string): Promise<void>;
  };
}
```

### 7.2 Cloudflare CLI Provider

Wraps existing wrangler-based commands (minimal changes):

```typescript
// packages/cli/src/providers/cloudflare.provider.ts

export class CloudflareCLIProvider implements CLIProvider {
  readonly name = "cloudflare";

  dev = {
    start: async (config) => {
      // Existing: wrangler pages dev
      await exec("npx wrangler pages dev ...");
    },
    stop: async () => { /* existing logic */ },
  };

  db = {
    migrate: async (config, opts) => {
      if (opts.remote) {
        await exec(`npx wrangler d1 migrations apply ${config.d1.name} --remote`);
      } else {
        await exec(`npx wrangler d1 migrations apply ${config.d1.name} --local`);
      }
    },
    query: async (config, sql, opts) => {
      const flag = opts.remote ? "--remote" : "--local";
      await exec(`npx wrangler d1 execute ${config.d1.name} --command="${sql}" ${flag}`);
    },
    // ... rest wraps existing wrangler commands
  };

  deploy = {
    build: async (config) => {
      await generateWranglerToml(config);
      await exec("npx react-router build");
      await bundlePagesWorker(config);
    },
    push: async (config, env) => {
      await exec(`npx wrangler pages deploy ./build/client --project-name=${config.projectName}`);
    },
    // ...
  };
}
```

### 7.3 AWS CLI Provider

```typescript
// packages/cli/src/providers/aws.provider.ts

export class AWSCLIProvider implements CLIProvider {
  readonly name = "aws";

  dev = {
    start: async (config) => {
      // Use local Node.js server with Docker Compose for dependencies
      await exec("docker compose -f docker-compose.dev.yml up -d postgres redis minio");
      await exec("npx tsx watch src/server.ts"); // or vite dev
    },
    stop: async () => {
      await exec("docker compose -f docker-compose.dev.yml down");
    },
  };

  db = {
    migrate: async (config, opts) => {
      if (opts.remote) {
        // Run drizzle-kit migrate against RDS
        await exec(`DATABASE_URL=${await this.getRemoteDbUrl(config)} npx drizzle-kit migrate`);
      } else {
        await exec("npx drizzle-kit migrate");
      }
    },
    generate: async (config) => {
      // drizzle-kit generate with postgres dialect
      await exec("npx drizzle-kit generate --dialect=postgresql");
    },
    query: async (config, sql, opts) => {
      if (opts.remote) {
        // Use AWS CLI or RDS Data API
        await exec(`aws rds-data execute-statement --resource-arn ${config.aws.dbArn} --secret-arn ${config.aws.dbSecretArn} --sql "${sql}"`);
      } else {
        await exec(`psql ${config.localDbUrl} -c "${sql}"`);
      }
    },
    studio: async () => {
      await exec("npx drizzle-kit studio");
    },
    // ...
  };

  deploy = {
    build: async (config) => {
      if (config.aws.mode === "lambda") {
        await exec("npx react-router build");
        // Bundle for Lambda: create handler wrapper
        await bundleLambdaHandler(config);
        // Package as zip for deployment
        await exec("cd build && zip -r ../deploy.zip .");
      } else if (config.aws.mode === "fargate") {
        await exec("npx react-router build");
        // Build Docker image
        await exec(`docker build -t ${config.aws.ecrRepo}:latest .`);
      }
    },
    push: async (config, env) => {
      if (config.aws.mode === "lambda") {
        // Deploy via SAM, CDK, or raw CloudFormation
        await exec("npx cdk deploy --require-approval never");
        // Or: aws lambda update-function-code
      } else if (config.aws.mode === "fargate") {
        // Push to ECR, update ECS service
        await exec(`aws ecr get-login-password | docker login --username AWS --password-stdin ${config.aws.ecrRepo}`);
        await exec(`docker push ${config.aws.ecrRepo}:latest`);
        await exec(`aws ecs update-service --cluster ${config.aws.cluster} --service ${config.aws.service} --force-new-deployment`);
      }
    },
    // ...
  };

  init = async (config, env) => {
    // Create RDS instance, ElastiCache, S3 bucket, SQS queues
    // Generate CDK stack or CloudFormation template
    console.log("Generating AWS CDK stack...");
    await generateCDKStack(config, env);
    await exec("npx cdk deploy --require-approval never");
  };
}
```

### 7.4 GCP CLI Provider

```typescript
// packages/cli/src/providers/gcp.provider.ts

export class GCPCLIProvider implements CLIProvider {
  readonly name = "gcp";

  dev = {
    start: async (config) => {
      await exec("docker compose -f docker-compose.dev.yml up -d postgres redis");
      await exec("npx tsx watch src/server.ts");
    },
    stop: async () => {
      await exec("docker compose -f docker-compose.dev.yml down");
    },
  };

  db = {
    migrate: async (config, opts) => {
      if (opts.remote) {
        // Connect via Cloud SQL Proxy
        await exec("cloud-sql-proxy --auto-iam-authn &");
        await exec("npx drizzle-kit migrate");
      } else {
        await exec("npx drizzle-kit migrate");
      }
    },
    // ...
  };

  deploy = {
    build: async (config) => {
      await exec("npx react-router build");
      if (config.gcp.mode === "cloud-run") {
        await exec(`gcloud builds submit --tag gcr.io/${config.gcp.projectId}/${config.projectName}`);
      } else if (config.gcp.mode === "cloud-functions") {
        await bundleCloudFunction(config);
      }
    },
    push: async (config, env) => {
      if (config.gcp.mode === "cloud-run") {
        await exec(`gcloud run deploy ${config.projectName} \
          --image gcr.io/${config.gcp.projectId}/${config.projectName} \
          --region ${config.gcp.region} \
          --allow-unauthenticated \
          --set-env-vars DATABASE_URL=${config.gcp.dbUrl}`);
      }
    },
    // ...
  };

  init = async (config, env) => {
    // Create Cloud SQL instance, Memorystore, GCS bucket, Pub/Sub topics
    await exec(`gcloud sql instances create ${config.projectName}-db --database-version=POSTGRES_15 --region=${config.gcp.region}`);
    await exec(`gcloud redis instances create ${config.projectName}-cache --region=${config.gcp.region}`);
    await exec(`gsutil mb gs://${config.projectName}-uploads`);
  };
}
```

### 7.5 Azure CLI Provider

```typescript
// packages/cli/src/providers/azure.provider.ts

export class AzureCLIProvider implements CLIProvider {
  readonly name = "azure";

  dev = {
    start: async (config) => {
      if (config.azure.mode === "functions") {
        await exec("func start"); // Azure Functions Core Tools
      } else {
        await exec("docker compose -f docker-compose.dev.yml up -d");
        await exec("npx tsx watch src/server.ts");
      }
    },
  };

  db = {
    migrate: async (config, opts) => {
      if (opts.remote) {
        // Azure Flexible Server Postgres
        await exec(`DATABASE_URL="${config.azure.dbUrl}" npx drizzle-kit migrate`);
      } else {
        await exec("npx drizzle-kit migrate");
      }
    },
  };

  deploy = {
    build: async (config) => {
      await exec("npx react-router build");
      if (config.azure.mode === "container-apps") {
        await exec(`az acr build --registry ${config.azure.acrName} --image ${config.projectName}:latest .`);
      } else if (config.azure.mode === "functions") {
        await bundleAzureFunction(config);
      }
    },
    push: async (config, env) => {
      if (config.azure.mode === "container-apps") {
        await exec(`az containerapp update \
          --name ${config.projectName} \
          --resource-group ${config.azure.resourceGroup} \
          --image ${config.azure.acrName}.azurecr.io/${config.projectName}:latest`);
      } else if (config.azure.mode === "functions") {
        await exec(`func azure functionapp publish ${config.azure.functionAppName}`);
      }
    },
  };

  init = async (config, env) => {
    const rg = config.azure.resourceGroup;
    // Create resource group, Postgres, Redis, Blob container, Service Bus
    await exec(`az group create --name ${rg} --location ${config.azure.region}`);
    await exec(`az postgres flexible-server create --resource-group ${rg} --name ${config.projectName}-db`);
    await exec(`az redis create --resource-group ${rg} --name ${config.projectName}-cache --sku Basic --vm-size C0`);
    await exec(`az storage account create --resource-group ${rg} --name ${config.projectName.replace(/-/g, "")}storage`);
    await exec(`az servicebus namespace create --resource-group ${rg} --name ${config.projectName}-bus`);
  };
}
```

### 7.6 DigitalOcean CLI Provider

```typescript
// packages/cli/src/providers/digitalocean.provider.ts

export class DigitalOceanCLIProvider implements CLIProvider {
  readonly name = "digitalocean";

  deploy = {
    build: async (config) => {
      await exec("npx react-router build");
      // DO App Platform builds from source or Dockerfile
      // Generate app spec
      await generateDOAppSpec(config);
    },
    push: async (config, env) => {
      // Update app via doctl
      await exec(`doctl apps update ${config.do.appId} --spec .do/app.yaml`);
    },
  };

  init = async (config, env) => {
    // Create managed database, Redis, Spaces bucket
    await exec(`doctl databases create ${config.projectName}-db --engine pg --size db-s-1vcpu-1gb`);
    await exec(`doctl databases create ${config.projectName}-cache --engine redis --size db-s-1vcpu-1gb`);
    // Spaces created via API
    await exec(`s3cmd mb s3://${config.projectName}-uploads`);
    // Create App Platform app
    await generateDOAppSpec(config);
    await exec(`doctl apps create --spec .do/app.yaml`);
  };
}
```

**Generated App Spec** (`.do/app.yaml`):
```yaml
name: my-cruz-app
services:
  - name: web
    source_dir: /
    dockerfile_path: Dockerfile
    http_port: 3000
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
      - key: REDIS_URL
        scope: RUN_TIME
        value: ${redis.DATABASE_URL}
databases:
  - name: db
    engine: PG
    version: "16"
  - name: redis
    engine: REDIS
    version: "7"
```

### 7.7 Docker CLI Provider

```typescript
// packages/cli/src/providers/docker.provider.ts

export class DockerCLIProvider implements CLIProvider {
  readonly name = "docker";

  dev = {
    start: async (config) => {
      await exec("docker compose up -d");
    },
    stop: async () => {
      await exec("docker compose down");
    },
  };

  db = {
    migrate: async (config, opts) => {
      if (opts.remote) {
        // SSH tunnel or direct connection to remote host
        await exec(`DATABASE_URL="${config.docker.remoteDbUrl}" npx drizzle-kit migrate`);
      } else {
        await exec("npx drizzle-kit migrate");
      }
    },
    query: async (config, sql, opts) => {
      if (opts.remote) {
        await exec(`psql "${config.docker.remoteDbUrl}" -c "${sql}"`);
      } else {
        await exec(`docker compose exec postgres psql -U cruz -d cruzdb -c "${sql}"`);
      }
    },
    studio: async () => {
      await exec("npx drizzle-kit studio");
    },
  };

  deploy = {
    build: async (config) => {
      await exec("npx react-router build");
      await exec(`docker build -t ${config.docker.imageName}:latest .`);
    },
    push: async (config, env) => {
      if (config.docker.registry) {
        // Push to any Docker registry
        await exec(`docker push ${config.docker.registry}/${config.docker.imageName}:latest`);
      }
      if (config.docker.host === "dokploy") {
        // Trigger Dokploy rebuild via webhook or API
        await exec(`curl -X POST ${config.docker.dokployWebhook}`);
      } else if (config.docker.host === "coolify") {
        // Trigger Coolify rebuild
        await exec(`curl -X POST ${config.docker.coolifyWebhook}`);
      } else {
        // SSH deploy: pull and restart on remote host
        await exec(`ssh ${config.docker.sshHost} "cd ${config.docker.remotePath} && docker compose pull && docker compose up -d"`);
      }
    },
  };

  init = async (config, env) => {
    // Generate docker-compose.yml, Dockerfile, .env
    await generateDockerCompose(config);
    await generateDockerfile(config);
    await generateEnvFile(config);
    console.log("Generated Docker deployment files. Run `docker compose up -d` to start.");
  };
}
```

---

## 8. Phase 5: Database Dialect Support

### 8.1 The Schema Challenge

Current schemas use SQLite-specific types everywhere:

```typescript
// Current: SQLite-only
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
});
```

### 8.2 Cross-Dialect Schema Solution

Introduce a `defineSchema` helper that generates dialect-appropriate schemas:

```typescript
// packages/core/src/database/define-schema.ts

import { getDialect } from "./dialect";

type DialectSchemaMap = {
  sqlite: ReturnType<typeof import("drizzle-orm/sqlite-core").sqliteTable>;
  postgres: ReturnType<typeof import("drizzle-orm/pg-core").pgTable>;
  mysql: ReturnType<typeof import("drizzle-orm/mysql-core").mysqlTable>;
};

export function defineSchema<T extends Record<string, TableDefinition>>(
  definitions: (helpers: SchemaHelpers) => T
): T {
  const dialect = getDialect();
  const helpers = createHelpers(dialect);
  return definitions(helpers);
}

function createHelpers(dialect: "sqlite" | "postgres" | "mysql"): SchemaHelpers {
  if (dialect === "postgres") {
    const { pgTable, text, integer, boolean, timestamp, uuid, jsonb } = require("drizzle-orm/pg-core");
    return {
      table: pgTable,
      id: () => uuid("id").defaultRandom().primaryKey(),
      text: (name) => text(name),
      integer: (name) => integer(name),
      boolean: (name) => boolean(name),
      timestamp: (name) => timestamp(name, { withTimezone: true }).defaultNow(),
      json: (name) => jsonb(name),
    };
  }
  if (dialect === "mysql") {
    const { mysqlTable, varchar, int, boolean, datetime, json } = require("drizzle-orm/mysql-core");
    return {
      table: mysqlTable,
      id: () => varchar("id", { length: 36 }).primaryKey(),
      text: (name) => varchar(name, { length: 65535 }),
      integer: (name) => int(name),
      boolean: (name) => boolean(name),
      timestamp: (name) => datetime(name),
      json: (name) => json(name),
    };
  }
  // Default: SQLite
  const { sqliteTable, text, integer } = require("drizzle-orm/sqlite-core");
  return {
    table: sqliteTable,
    id: () => text("id").primaryKey(),
    text: (name) => text(name),
    integer: (name) => integer(name),
    boolean: (name) => integer(name, { mode: "boolean" }),
    timestamp: (name) => integer(name, { mode: "timestamp" }),
    json: (name) => text(name, { mode: "json" }),
  };
}
```

### 8.3 Migration Strategy

Each dialect generates its own migrations:

```
apps/web/drizzle/
  sqlite/       -- D1/SQLite migrations (current location, renamed)
  postgres/     -- Postgres migrations
  mysql/        -- MySQL migrations
```

The CLI `cruz db generate` command generates migrations for the configured dialect:

```typescript
// cruz db generate
const dialect = config.provider === "cloudflare" ? "sqlite" : config.dbDialect;
await exec(`npx drizzle-kit generate --dialect=${dialect} --out=drizzle/${dialect}`);
```

### 8.4 Migration Across Providers

When migrating from one provider to another (e.g., Cloudflare → AWS):

1. `cruz migrate-provider --from cloudflare --to aws` (new command)
2. Generates new dialect migrations from current schema
3. Provides a data export/import script
4. Updates `cruz.config.ts`

---

## 9. Provider-Specific Adapter Deep Dives

### 9.1 AWS Deep Dive

#### Lambda Mode Architecture

```
┌──────────────────────────────────────────────┐
│              API Gateway v2 (HTTP)            │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│         Lambda Function (SSR + API)           │
│  ┌─────────────────────────────────────────┐  │
│  │  CruzJS App (React Router + tRPC)       │  │
│  │  → AWSLambdaAdapter                     │  │
│  └─────────────────────────────────────────┘  │
└──────┬─────────┬──────────┬─────────┬────────┘
       │         │          │         │
┌──────▼──┐ ┌───▼────┐ ┌───▼──┐ ┌───▼────────┐
│RDS Proxy│ │Elasti- │ │  S3  │ │EventBridge │
│(Postgres)│ │Cache   │ │      │ │ + SQS      │
└─────────┘ └────────┘ └──────┘ └────────────┘
```

**Key considerations**:
- Lambda cold starts: Use provisioned concurrency for production
- RDS connections: Must use RDS Proxy to avoid connection exhaustion
- Static assets: Serve from S3 + CloudFront, not through Lambda
- Bundle size: Tree-shake aggressively, Lambda has a 50MB zip limit (250MB unzipped)
- `waitUntil`: Not natively supported — use Lambda response streaming or process all work before responding

#### Fargate Mode Architecture

```
┌──────────────────────────────────────────────┐
│           Application Load Balancer           │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│        ECS Fargate Task (Docker)              │
│  ┌─────────────────────────────────────────┐  │
│  │  Node.js HTTP Server                    │  │
│  │  CruzJS App (React Router + tRPC)       │  │
│  │  + BullMQ Worker (optional)             │  │
│  │  → AWSFargateAdapter                    │  │
│  └─────────────────────────────────────────┘  │
└──────┬─────────┬──────────┬─────────┬────────┘
       │         │          │         │
┌──────▼──┐ ┌───▼────┐ ┌───▼──┐ ┌───▼──┐
│   RDS   │ │Elasti- │ │  S3  │ │ SQS  │
│(Postgres)│ │Cache   │ │      │ │      │
└─────────┘ └────────┘ └──────┘ └──────┘
```

**Key considerations**:
- Connection pooling: `pg.Pool` with persistent connections
- Health checks: ALB health check endpoint at `/health`
- Auto-scaling: ECS service auto-scaling based on CPU/memory
- Logging: stdout → CloudWatch Logs
- Secrets: AWS Secrets Manager → injected as environment variables

#### AWS Infrastructure-as-Code (CDK)

```typescript
// Generated by `cruz init aws-lambda`
// packages/cli/src/providers/aws/cdk-template.ts

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";

export class CruzStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Database
    const db = new rds.DatabaseCluster(this, "Database", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 4,
      writer: rds.ClusterInstance.serverlessV2("writer"),
    });

    // Cache
    const cache = new elasticache.CfnCacheCluster(this, "Cache", {
      engine: "redis",
      cacheNodeType: "cache.t3.micro",
      numCacheNodes: 1,
    });

    // Storage
    const bucket = new s3.Bucket(this, "Uploads", {
      cors: [{ allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT], allowedOrigins: ["*"] }],
    });

    // Queue
    const jobQueue = new sqs.Queue(this, "JobQueue", {
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(14),
    });

    // Lambda
    const handler = new lambda.Function(this, "Handler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "server.handler",
      code: lambda.Code.fromAsset("build"),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        DATABASE_URL: db.clusterEndpoint.socketAddress,
        REDIS_URL: `redis://${cache.attrRedisEndpointAddress}:${cache.attrRedisEndpointPort}`,
        S3_BUCKET: bucket.bucketName,
        QUEUE_URL_JOBS: jobQueue.queueUrl,
      },
    });

    // API Gateway
    const api = new apigateway.HttpApi(this, "Api");
    api.addRoutes({ path: "/{proxy+}", integration: new HttpLambdaIntegration("Lambda", handler) });

    // Queue consumer Lambda
    const queueConsumer = new lambda.Function(this, "QueueConsumer", { /* ... */ });
    queueConsumer.addEventSource(new SqsEventSource(jobQueue, { batchSize: 10 }));
  }
}
```

### 9.2 Google Cloud Deep Dive

#### Cloud Run Architecture

```
┌──────────────────────────────────────────────┐
│          Cloud Run Service (auto-scaling)      │
│  ┌─────────────────────────────────────────┐  │
│  │  Node.js HTTP Server on $PORT           │  │
│  │  CruzJS App                             │  │
│  │  → GCPCloudRunAdapter                   │  │
│  └─────────────────────────────────────────┘  │
└──────┬─────────┬──────────┬─────────┬────────┘
       │         │          │         │
┌──────▼──────┐ ┌▼────────┐ ┌▼──────┐ ┌▼───────┐
│Cloud SQL    │ │Memory-  │ │ GCS   │ │Pub/Sub │
│(Postgres)   │ │store    │ │       │ │        │
└─────────────┘ └─────────┘ └───────┘ └────────┘
```

**Key considerations**:
- Cloud Run scales to zero — cold starts matter (but less than Lambda)
- Cloud SQL: Use Unix socket connector for Cloud Run, or the Cloud SQL Auth Proxy
- CPU allocation: Set to "always allocated" for background processing (`waitUntil`)
- Max instances: Configure to prevent overwhelming Cloud SQL
- Cloud Build: Use for CI/CD (build container, deploy to Cloud Run)

#### Pub/Sub Queue Consumer

```typescript
// Separate Cloud Run service that receives Pub/Sub push messages

export function createPubSubConsumer(app: CruzApp) {
  return async (req: Request) => {
    const body = await req.json();
    const message = Buffer.from(body.message.data, "base64").toString();
    const parsed = JSON.parse(message);

    const queueMsg: QueueMessage = {
      id: body.message.messageId,
      body: parsed,
      timestamp: new Date(body.message.publishTime),
      ack: () => {}, // Ack by returning 200
      retry: () => { throw new Error("Nack by returning non-200"); },
    };

    await app.handleQueue(body.subscription, [queueMsg], runtimeCtx);
    return new Response("OK", { status: 200 });
  };
}
```

### 9.3 Azure Deep Dive

#### Azure Functions Architecture

```
┌──────────────────────────────────────────────┐
│         Azure Functions App (Flex Plan)        │
│  ┌─────────────────────────────────────────┐  │
│  │  HTTP Trigger (catch-all route)         │  │
│  │  CruzJS App → AzureFunctionsAdapter     │  │
│  ├─────────────────────────────────────────┤  │
│  │  Service Bus Trigger (queue consumer)   │  │
│  ├─────────────────────────────────────────┤  │
│  │  Timer Trigger (cron)                   │  │
│  └─────────────────────────────────────────┘  │
└──────┬─────────┬──────────┬─────────┬────────┘
       │         │          │         │
┌──────▼────┐ ┌──▼──────┐ ┌▼──────┐ ┌▼────────┐
│Flexible   │ │Azure    │ │Blob   │ │Service  │
│Server     │ │Cache    │ │Storage│ │Bus      │
│(Postgres) │ │(Redis)  │ │       │ │         │
└───────────┘ └─────────┘ └───────┘ └─────────┘
```

**Key considerations**:
- Azure Functions Flex Consumption plan: best for serverless (scale to zero)
- Azure Container Apps: better for long-running, WebSocket, or high-throughput
- Managed Identity: use for connecting to Azure services without secrets
- Azure Key Vault: for secrets management
- Azure Blob Storage: different API than S3, but similar concepts (containers ≈ buckets, blobs ≈ objects)

#### Azure Container Apps Architecture

```
┌──────────────────────────────────────────────┐
│       Azure Container Apps Environment        │
│  ┌─────────────────────────────────────────┐  │
│  │  Container: Node.js HTTP Server         │  │
│  │  CruzJS App                             │  │
│  │  → AzureContainerAppsAdapter            │  │
│  │  + BullMQ Worker (in-process)           │  │
│  └─────────────────────────────────────────┘  │
└──────┬─────────┬──────────┬─────────┬────────┘
       │         │          │         │
┌──────▼────┐ ┌──▼──────┐ ┌▼──────┐ ┌▼────────┐
│Flexible   │ │Azure    │ │Blob   │ │Service  │
│Server     │ │Cache    │ │Storage│ │Bus      │
│(Postgres) │ │(Redis)  │ │       │ │         │
└───────────┘ └─────────┘ └───────┘ └─────────┘
```

### 9.4 DigitalOcean Deep Dive

#### App Platform Architecture

```
┌──────────────────────────────────────────────┐
│       DO App Platform (auto-managed)          │
│  ┌─────────────────────────────────────────┐  │
│  │  Container: Node.js HTTP Server         │  │
│  │  CruzJS App → DOAppPlatformAdapter      │  │
│  │  + BullMQ Worker (in-process)           │  │
│  └─────────────────────────────────────────┘  │
└──────┬─────────┬──────────┬──────────────────┘
       │         │          │
┌──────▼────┐ ┌──▼──────┐ ┌▼──────┐
│Managed    │ │Managed  │ │Spaces │
│Postgres   │ │Redis    │ │(S3)   │
└───────────┘ └─────────┘ └───────┘
```

**Key considerations**:
- App Platform is the simplest deployment option — define an app spec YAML
- Managed Postgres and Redis are available
- Spaces uses S3-compatible API — reuse the S3 adapter
- No native queue service — use BullMQ over Redis
- No native AI service — use OpenAI or self-hosted
- No native cron service for serverless — use BullMQ repeatable jobs
- Cost-effective for small to medium workloads
- Limited scaling options compared to AWS/GCP/Azure

### 9.5 Self-Hosted (Docker) Deep Dive

#### Dokploy / Coolify Architecture

```
┌──────────────────────────────────────────────┐
│       VPS / Dedicated Server                  │
│  ┌─────────────────────────────────────────┐  │
│  │  Dokploy/Coolify (management layer)     │  │
│  │  ┌──────────────────────────────────┐   │  │
│  │  │  Docker Compose Stack             │   │  │
│  │  │  ┌────────────────────────────┐   │   │  │
│  │  │  │ app: Node.js + CruzJS      │   │   │  │
│  │  │  │ + BullMQ Worker            │   │   │  │
│  │  │  ├────────────────────────────┤   │   │  │
│  │  │  │ postgres: PostgreSQL 16    │   │   │  │
│  │  │  ├────────────────────────────┤   │   │  │
│  │  │  │ redis: Redis 7             │   │   │  │
│  │  │  ├────────────────────────────┤   │   │  │
│  │  │  │ minio: S3-compatible       │   │   │  │
│  │  │  └────────────────────────────┘   │   │  │
│  │  └──────────────────────────────────┘   │  │
│  └─────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**Key considerations**:
- Full control over infrastructure, lowest cost at scale
- Postgres + Redis + MinIO provides full feature parity
- BullMQ for queues (backed by Redis, in-process workers)
- node-cron for scheduled tasks
- Ollama or vLLM for self-hosted AI (optional)
- Caddy or Traefik for HTTPS termination (handled by Dokploy/Coolify)
- Backups: pg_dump + Redis RDB + MinIO mc mirror
- Health check endpoint for Dokploy/Coolify monitoring

---

## 10. Package Restructuring

### 10.1 New Monorepo Layout

```
packages/
  core/                          -- Framework runtime (INTERFACES ONLY)
    src/
      runtime/
        runtime-context.ts       -- RuntimeContext interface
        runtime-adapter.ts       -- RuntimeAdapter interface
        bindings/
          database.ts            -- DatabaseBinding interface
          cache.ts               -- CacheBinding interface
          storage.ts             -- StorageBinding interface (existing, promoted)
          queue.ts               -- QueueBinding interface
          ai.ts                  -- AIBinding interface
          scheduler.ts           -- SchedulerBinding interface
      database/
        define-schema.ts         -- Cross-dialect schema helpers
        dialect.ts               -- Dialect detection
      di/                        -- Unchanged (already provider-agnostic)
      trpc/                      -- Unchanged (already provider-agnostic)
      auth/                      -- Unchanged (already provider-agnostic)
      events/                    -- Unchanged (already provider-agnostic)
      queues/
        queue.service.ts         -- Uses QueueBinding interface (not CF directly)
      jobs/
        job.service.ts           -- Uses QueueBinding interface (not CF directly)
      ai/
        ai.service.ts            -- Uses AIBinding interface
      framework/
        create-cruz-app.ts       -- Takes RuntimeAdapter, returns platform-agnostic app

  adapter-cloudflare/            -- NEW PACKAGE
    src/
      index.ts                   -- CloudflareAdapter (RuntimeAdapter implementation)
      context.ts                 -- CloudflareRuntimeContext (from current CloudflareContext)
      bindings/
        d1-database.ts           -- D1DatabaseBinding
        kv-cache.ts              -- KVCacheBinding
        r2-storage.ts            -- R2StorageBinding (from current R2StorageDriver)
        cf-queue.ts              -- CFQueueBinding
        workers-ai.ts            -- WorkersAIBinding
      local/                     -- Local development facades
        local-kv.ts              -- LocalKVNamespace (from current)
        local-queue.ts           -- LocalQueue (from current)
        local-db.ts              -- LocalDb with better-sqlite3 (from current)
      cli/                       -- CLI provider for Cloudflare
        cloudflare.provider.ts
        wrangler-generator.ts    -- From current CLI

  adapter-aws/                   -- NEW PACKAGE
    src/
      index.ts                   -- Exports LambdaAdapter + FargateAdapter
      lambda/
        index.ts                 -- AWSLambdaAdapter
        sqs-consumer.ts          -- SQS queue consumer handler
        scheduled.ts             -- EventBridge scheduled handler
      fargate/
        index.ts                 -- AWSFargateAdapter
      bindings/
        postgres-database.ts     -- PostgresDatabaseBinding (shared)
        redis-cache.ts           -- RedisCacheBinding (shared)
        s3-storage.ts            -- S3StorageBinding
        sqs-queue.ts             -- SQSQueueBinding
        bedrock-ai.ts            -- BedrockAIBinding
        bullmq-queue.ts          -- BullMQQueueBinding (for Fargate)
      cli/
        aws.provider.ts
        cdk-template.ts          -- CDK stack generator

  adapter-gcp/                   -- NEW PACKAGE
    src/
      index.ts                   -- Exports CloudRunAdapter + CloudFunctionsAdapter
      cloud-run/
        index.ts
      cloud-functions/
        index.ts
      bindings/
        gcs-storage.ts           -- GCSStorageBinding
        pubsub-queue.ts          -- PubSubQueueBinding
        vertex-ai.ts             -- VertexAIBinding
      cli/
        gcp.provider.ts

  adapter-azure/                 -- NEW PACKAGE
    src/
      index.ts                   -- Exports FunctionsAdapter + ContainerAppsAdapter
      functions/
        index.ts
      container-apps/
        index.ts
      bindings/
        azure-blob-storage.ts
        service-bus-queue.ts
        azure-openai.ts
      cli/
        azure.provider.ts

  adapter-digitalocean/          -- NEW PACKAGE
    src/
      index.ts
      app-platform/
        index.ts
      cli/
        digitalocean.provider.ts

  adapter-docker/                -- NEW PACKAGE
    src/
      index.ts                   -- DockerAdapter
      node-handler.ts            -- Shared Node.js HTTP server
      bindings/
        postgres-database.ts     -- PostgresDatabaseBinding (shared with AWS)
        mysql-database.ts        -- MySQLDatabaseBinding
        sqlite-database.ts       -- SQLiteDatabaseBinding
        redis-cache.ts           -- RedisCacheBinding (shared)
        s3-storage.ts            -- S3StorageBinding (shared, for MinIO)
        local-storage.ts         -- LocalFilesystemStorageBinding
        bullmq-queue.ts          -- BullMQQueueBinding (shared)
        openai-ai.ts             -- OpenAICompatibleBinding
      cli/
        docker.provider.ts
      templates/
        Dockerfile
        docker-compose.yml
        docker-compose.dev.yml

  # Shared binding implementations (used by multiple adapters)
  adapter-shared/                -- NEW PACKAGE
    src/
      postgres-database.ts       -- PostgresDatabaseBinding
      mysql-database.ts          -- MySQLDatabaseBinding
      redis-cache.ts             -- RedisCacheBinding
      s3-storage.ts              -- S3StorageBinding (works for AWS S3, DO Spaces, MinIO)
      bullmq-queue.ts            -- BullMQQueueBinding
      openai-ai.ts               -- OpenAI-compatible AIBinding
      node-handler.ts            -- Node.js HTTP request → Web Request conversion

  start/                         -- Unchanged (UI components, provider-agnostic)
  pro/                           -- Unchanged
  cli/                           -- Refactored to use CLIProvider interface
    src/
      providers/
        provider.interface.ts    -- CLIProvider interface
        registry.ts              -- Provider registry (loads from adapter packages)
      commands/                  -- Commands delegate to resolved CLIProvider
  create-cruz-app/               -- Updated to ask which provider
```

### 10.2 Shared Bindings

Several binding implementations are identical across providers:

| Binding | Used By |
|---------|---------|
| `PostgresDatabaseBinding` | AWS, GCP, Azure, DigitalOcean, Docker |
| `MySQLDatabaseBinding` | AWS, GCP, Azure, Docker |
| `RedisCacheBinding` | AWS, GCP, Azure, DigitalOcean, Docker |
| `S3StorageBinding` | AWS, DigitalOcean (Spaces), Docker (MinIO) |
| `BullMQQueueBinding` | AWS (Fargate), DigitalOcean, Docker |
| `OpenAICompatibleBinding` | DigitalOcean, Docker |
| Node.js HTTP handler | AWS (Fargate), GCP, Azure (Container Apps), DigitalOcean, Docker |

These live in `@cruzjs/adapter-shared` and are imported by individual adapter packages.

---

## 11. Migration Path for Existing Apps

### 11.1 Config Changes

**Before** (`cruz.config.ts`):
```typescript
export default defineConfig({
  projectName: "my-app",
  d1: { name: "my-app-db" },
  kv: [{ binding: "KV", id: "..." }],
  r2: [{ binding: "R2", bucketName: "my-uploads" }],
  queues: {
    producers: [{ binding: "JOBS", name: "my-app-jobs" }],
  },
});
```

**After** (`cruz.config.ts`):
```typescript
import { cloudflare } from "@cruzjs/adapter-cloudflare";
// OR: import { awsLambda } from "@cruzjs/adapter-aws";
// OR: import { docker } from "@cruzjs/adapter-docker";

export default defineConfig({
  projectName: "my-app",

  // Provider configuration
  provider: cloudflare({
    d1: { name: "my-app-db" },
    kv: [{ binding: "KV", id: "..." }],
    r2: [{ binding: "R2", bucketName: "my-uploads" }],
    queues: {
      producers: [{ binding: "JOBS", name: "my-app-jobs" }],
    },
  }),

  // OR:
  // provider: awsLambda({
  //   region: "us-east-1",
  //   database: { type: "rds-postgres", instanceClass: "db.t3.micro" },
  //   cache: { type: "elasticache-redis" },
  //   storage: { type: "s3", bucket: "my-uploads" },
  //   queue: { type: "sqs" },
  // }),

  // OR:
  // provider: docker({
  //   database: { type: "postgres" },
  //   cache: { type: "redis" },
  //   storage: { type: "minio" },
  //   queue: { type: "bullmq" },
  // }),
});
```

### 11.2 Server Entry Changes

**Before** (`server.cloudflare.ts`):
```typescript
import { createCruzApp } from "@cruzjs/core";
export default createCruzApp({ modules, config });
```

**After**:
```typescript
// For Cloudflare (minimal change):
import { createCruzApp } from "@cruzjs/core";
import { CloudflareAdapter } from "@cruzjs/adapter-cloudflare";

export default createCruzApp({
  modules,
  config,
  adapter: new CloudflareAdapter(),
});

// For Docker:
import { createCruzApp } from "@cruzjs/core";
import { DockerAdapter } from "@cruzjs/adapter-docker";

createCruzApp({
  modules,
  config,
  adapter: new DockerAdapter(),
}).listen();
```

### 11.3 Service Code Changes

**Before** (services using CloudflareContext directly):
```typescript
import { CloudflareContext } from "@cruzjs/core";

class MyService {
  async doSomething() {
    const kv = CloudflareContext.kv;
    await kv.put("key", "value");
  }
}
```

**After** (services using injected RuntimeContext):
```typescript
import { inject, injectable } from "@cruzjs/core";
import type { CacheBinding } from "@cruzjs/core";
import { CACHE_BINDING } from "@cruzjs/core";

@injectable()
class MyService {
  constructor(@inject(CACHE_BINDING) private cache: CacheBinding) {}

  async doSomething() {
    await this.cache.put("key", "value");
  }
}
```

### 11.4 Automated Migration Tool

```bash
# New CLI command to help migrate
cruz migrate-provider --to aws-lambda

# This will:
# 1. Update cruz.config.ts to use the new provider
# 2. Update server entry file
# 3. Replace CloudflareContext imports with RuntimeContext
# 4. Generate new database migrations for the target dialect
# 5. Generate infrastructure-as-code files (CDK, Terraform, etc.)
# 6. Update Dockerfile / deployment configs
```

---

## 12. Implementation Order & Dependencies

### Phase 1: Core Interfaces (2-3 weeks)

```
1.1  Define RuntimeContext interface
1.2  Define all Binding interfaces (Database, Cache, Storage, Queue, AI, Scheduler)
1.3  Define RuntimeAdapter interface
1.4  Define CLIProvider interface
1.5  Refactor createCruzApp() to accept RuntimeAdapter
```

**Dependencies**: None. This is pure interface work.

### Phase 2: Extract Cloudflare Adapter (2-3 weeks)

```
2.1  Create @cruzjs/adapter-cloudflare package
2.2  Move CloudflareContext → CloudflareRuntimeContext (implements RuntimeContext)
2.3  Move D1, KV, R2, Queue bindings into adapter package
2.4  Move wrangler-generator and CF CLI commands into adapter
2.5  Update @cruzjs/core to import nothing from Cloudflare
2.6  Ensure all existing tests pass
```

**Dependencies**: Phase 1 complete.

### Phase 3: Docker Adapter (1-2 weeks)

```
3.1  Create @cruzjs/adapter-docker package
3.2  Create @cruzjs/adapter-shared package with Postgres, Redis, S3, BullMQ bindings
3.3  Implement DockerAdapter with Node.js HTTP handler
3.4  Implement Docker CLI provider (docker-compose generation)
3.5  Test full app lifecycle: dev → build → deploy (docker compose)
```

**Dependencies**: Phase 2 complete. Docker is the easiest non-CF adapter because it's the most flexible.

### Phase 4: AWS Adapter (2-3 weeks)

```
4.1  Create @cruzjs/adapter-aws package
4.2  Implement Lambda adapter + SQS consumer + EventBridge scheduler
4.3  Implement Fargate adapter
4.4  Implement AWS CLI provider (CDK stack generation)
4.5  Test Lambda deployment end-to-end
4.6  Test Fargate deployment end-to-end
```

**Dependencies**: Phase 3 complete (shares Postgres, Redis, S3 bindings from adapter-shared).

### Phase 5: GCP Adapter (1-2 weeks)

```
5.1  Create @cruzjs/adapter-gcp package
5.2  Implement Cloud Run adapter
5.3  Implement Cloud Functions adapter
5.4  Implement GCS storage + Pub/Sub queue + Vertex AI bindings
5.5  Implement GCP CLI provider
5.6  Test Cloud Run deployment end-to-end
```

**Dependencies**: Phase 3 complete.

### Phase 6: Azure Adapter (1-2 weeks)

```
6.1  Create @cruzjs/adapter-azure package
6.2  Implement Azure Functions adapter
6.3  Implement Azure Container Apps adapter
6.4  Implement Blob Storage + Service Bus + Azure OpenAI bindings
6.5  Implement Azure CLI provider
6.6  Test deployment end-to-end
```

**Dependencies**: Phase 3 complete.

### Phase 7: DigitalOcean Adapter (1 week)

```
7.1  Create @cruzjs/adapter-digitalocean package
7.2  Implement App Platform adapter (reuses Node handler + shared bindings)
7.3  Implement DO CLI provider (app spec generation)
7.4  Test deployment end-to-end
```

**Dependencies**: Phase 3 complete.

### Phase 8: Database Dialect Support (2-3 weeks, can parallel with 4-7)

```
8.1  Create defineSchema() cross-dialect helper
8.2  Create dialect-aware migration tooling in CLI
8.3  Migrate existing framework schemas to use defineSchema()
8.4  Test schema generation for SQLite, Postgres, MySQL
8.5  Create migrate-provider CLI command
```

**Dependencies**: Phase 2 complete. Can run in parallel with phases 4-7.

### Phase 9: Polish & Documentation (1-2 weeks)

```
9.1  Update create-cruz-app to prompt for provider choice
9.2  Update all KB docs in .claude/kb/
9.3  Create provider-specific getting-started guides
9.4  Performance testing across providers
9.5  Update CI/CD to test all adapters
```

### Dependency Graph

```
Phase 1 (Interfaces)
    │
    ▼
Phase 2 (Extract CF Adapter)
    │
    ├──────────────────────────┐
    ▼                          ▼
Phase 3 (Docker)          Phase 8 (DB Dialects)
    │                          │
    ├───────┬───────┬──────┐   │
    ▼       ▼       ▼      ▼   │
Phase 4  Phase 5  Phase 6  Phase 7
(AWS)    (GCP)    (Azure)  (DO)
    │       │       │      │   │
    └───────┴───────┴──────┴───┘
                    │
                    ▼
              Phase 9 (Polish)
```

### Total Estimated Effort

| Phase | Weeks |
|-------|-------|
| Phase 1: Core Interfaces | 2-3 |
| Phase 2: Extract CF Adapter | 2-3 |
| Phase 3: Docker Adapter | 1-2 |
| Phase 4: AWS Adapter | 2-3 |
| Phase 5: GCP Adapter | 1-2 |
| Phase 6: Azure Adapter | 1-2 |
| Phase 7: DO Adapter | 1 |
| Phase 8: DB Dialects | 2-3 |
| Phase 9: Polish | 1-2 |
| **Total (sequential)** | **13-21** |
| **Total (with parallelism)** | **8-14** |

---

## Appendix A: Provider Feature Matrix

| Feature | Cloudflare | AWS Lambda | AWS Fargate | GCP Cloud Run | GCP Functions | Azure Functions | Azure Container Apps | DigitalOcean | Docker |
|---------|-----------|-----------|------------|--------------|--------------|----------------|---------------------|-------------|--------|
| **Runtime** | Edge (V8) | Node.js | Node.js | Node.js | Node.js | Node.js | Node.js | Node.js | Node.js |
| **Database** | D1 (SQLite) | RDS Postgres | RDS Postgres | Cloud SQL | Cloud SQL | Flexible Server | Flexible Server | Managed PG | Postgres/MySQL/SQLite |
| **Cache** | KV | ElastiCache | ElastiCache | Memorystore | Memorystore | Azure Cache | Azure Cache | Managed Redis | Redis |
| **Storage** | R2 | S3 | S3 | GCS | GCS | Blob Storage | Blob Storage | Spaces (S3) | MinIO/Local FS |
| **Queue** | Queues | SQS | SQS/BullMQ | Pub/Sub | Pub/Sub | Service Bus | Service Bus | BullMQ | BullMQ |
| **AI** | Workers AI | Bedrock | Bedrock | Vertex AI | Vertex AI | Azure OpenAI | Azure OpenAI | OpenAI API | Ollama/OpenAI |
| **Cron** | Cron Triggers | EventBridge | BullMQ | Cloud Scheduler | Cloud Scheduler | Timer Trigger | BullMQ | BullMQ | node-cron/BullMQ |
| **waitUntil** | Native | No* | Native | Conditional** | No* | No* | Native | Native | Native |
| **Cold Start** | ~0ms | 100-500ms | None | 0-1000ms | 100-500ms | 100-500ms | None | None | None |
| **Scale to Zero** | Yes | Yes | No*** | Yes | Yes | Yes | Yes | No*** | No |
| **WebSockets** | Durable Objects | API Gateway WS | ALB | No | No | No | Yes | No | Yes |

\* Must complete all work before returning response
\** Only with "CPU always allocated" setting
\*** Can scale to zero with minimum instances = 0, but takes longer to cold start

## Appendix B: Environment Variable Mapping

Each provider uses different environment variables. The adapter handles mapping:

| Concept | Cloudflare (env binding) | AWS / GCP / Azure / DO / Docker |
|---------|------------------------|-------------------------------|
| Database | `env.DB` (D1 binding) | `DATABASE_URL` (connection string) |
| Cache | `env.KV` (KV binding) | `REDIS_URL` (connection string) |
| Storage | `env.R2` (R2 binding) | `S3_BUCKET` + `S3_ENDPOINT` or `GCS_BUCKET` or `AZURE_STORAGE_CONNECTION_STRING` |
| Queue | `env.JOBS` (Queue binding) | `QUEUE_URL_JOBS` (SQS URL) or `REDIS_URL` (BullMQ) |
| AI | `env.AI` (AI binding) | `OPENAI_API_KEY` / `AWS_REGION` (Bedrock) / `GCP_PROJECT_ID` (Vertex) |

## Appendix C: `cruz.config.ts` Full Type Definition

```typescript
import type { CloudflareProviderConfig } from "@cruzjs/adapter-cloudflare";
import type { AWSProviderConfig } from "@cruzjs/adapter-aws";
import type { GCPProviderConfig } from "@cruzjs/adapter-gcp";
import type { AzureProviderConfig } from "@cruzjs/adapter-azure";
import type { DigitalOceanProviderConfig } from "@cruzjs/adapter-digitalocean";
import type { DockerProviderConfig } from "@cruzjs/adapter-docker";

export interface CruzConfig {
  projectName: string;

  provider:
    | CloudflareProviderConfig
    | AWSProviderConfig
    | GCPProviderConfig
    | AzureProviderConfig
    | DigitalOceanProviderConfig
    | DockerProviderConfig;

  // Provider-agnostic options
  auth?: AuthConfig;
  email?: EmailConfig;
  features?: FeatureFlags;
}

// Example: AWS provider config
export interface AWSProviderConfig {
  type: "aws-lambda" | "aws-fargate";
  region: string;
  database: {
    type: "rds-postgres" | "aurora-serverless" | "rds-mysql";
    instanceClass?: string;
    // Connection string provided via env var at runtime
  };
  cache: {
    type: "elasticache-redis" | "dynamodb";
    nodeType?: string;
  };
  storage: {
    type: "s3";
    bucket: string;
  };
  queue: {
    type: "sqs";
    queues: { name: string; fifo?: boolean }[];
  };
  ai?: {
    type: "bedrock" | "openai";
  };
}

// Example: Docker provider config
export interface DockerProviderConfig {
  type: "docker";
  database: {
    type: "postgres" | "mysql" | "sqlite";
  };
  cache: {
    type: "redis" | "memory";
  };
  storage: {
    type: "s3" | "local";
    // S3-compatible: MinIO, Garage, etc.
    endpoint?: string;
    bucket?: string;
  };
  queue: {
    type: "bullmq";
  };
  ai?: {
    type: "openai" | "ollama";
    baseUrl?: string;
  };
  deploy?: {
    host: "dokploy" | "coolify" | "ssh" | "manual";
    webhook?: string;
    sshHost?: string;
    remotePath?: string;
    registry?: string;
  };
}
```
