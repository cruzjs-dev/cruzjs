---
title: Google Cloud Functions
description: Deploy CruzJS on Cloud Functions Gen2 with serverless scale-to-zero, Pub/Sub triggers, and Cloud SQL.
---

Cloud Functions Gen2 is GCP's serverless compute option. It scales to zero when idle and you pay only for invocation time. It is built on Cloud Run under the hood but abstracts away container management.

## When to Use Cloud Functions

- Low or unpredictable traffic (scale-to-zero saves money)
- Event-driven workloads (Pub/Sub, Cloud Storage triggers)
- Simple deployments without Docker
- You do not need `waitUntil()` fire-and-forget behavior

For sustained traffic, background work, or WebSocket support, use [Cloud Run](/adapters/gcp-cloud-run) instead.

## Full Adapter Configuration

```typescript
import { GCPCloudFunctionsAdapter } from '@cruzjs/adapter-gcp';

export default createCruzApp({
  schema,
  modules: [/* your modules */],
  adapter: new GCPCloudFunctionsAdapter({
    databaseUrl: process.env.DATABASE_URL,
    gcsBucket: process.env.GCS_BUCKET,
    redisUrl: process.env.REDIS_URL,
    pubsubTopic: process.env.PUBSUB_TOPIC,
    gcpProjectId: process.env.GCP_PROJECT_ID,
  }),
  pages: () => import('virtual:react-router/server-build'),
});
```

## Handler Entry Point

CruzJS exports a `handler` function that Cloud Functions invokes. The build output includes this entry point automatically. When deploying, set `--entry-point=handler`.

```bash
gcloud functions deploy my-cruz-app \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=handler \
  --source=./build \
  --set-env-vars="DATABASE_URL=postgresql://cruzuser:pw@/cruzdb?host=/cloudsql/my-project:us-central1:my-cruz-db" \
  --set-env-vars="AUTH_SECRET=$(openssl rand -base64 32)" \
  --set-env-vars="GCS_BUCKET=my-cruz-uploads" \
  --memory=512MB \
  --timeout=60s \
  --max-instances=10 \
  --min-instances=0
```

## `waitUntil()` Behavior

Cloud Functions runs as `serverless` runtime type. The function execution environment is frozen after the response is returned. This means:

- `waitUntil()` tasks **must flush before the response** is sent
- The adapter automatically awaits all pending `waitUntil()` promises before responding
- Long-running background work should use Pub/Sub or Cloud Tasks instead

If you need fire-and-forget `waitUntil()`, use Cloud Run with `cpuAlwaysAllocated: true`.

## Cold Starts

Cloud Functions instances are recycled after periods of inactivity. Cold starts add latency to the first request.

Mitigation strategies:

- **Set `--min-instances=1`** -- keeps one instance warm (costs more, but eliminates cold starts)
- **Reduce bundle size** -- smaller deployments start faster
- **Use `--cpu-boost`** -- temporarily adds CPU during cold start initialization

```bash
gcloud functions deploy my-cruz-app \
  --gen2 \
  --min-instances=1 \
  --cpu-boost \
  ...
```

## Memory and Timeout

| Setting | Default | Max | Notes |
|---------|---------|-----|-------|
| Memory | 256MB | 32GB | Set based on your app's needs |
| Timeout | 60s | 3600s (Gen2) | HTTP functions typically need 30-120s |
| Max instances | 100 | 1000 | Prevents runaway scaling |

Higher memory allocations also increase available CPU proportionally.

## Cloud SQL Connection

Cloud Functions Gen2 uses the same Cloud SQL connector as Cloud Run. Add the `--add-cloudsql-instances` flag:

```bash
gcloud functions deploy my-cruz-app \
  --gen2 \
  --add-cloudsql-instances=my-project:us-central1:my-cruz-db \
  ...
```

Then use the Unix socket connection string:

```bash
DATABASE_URL=postgresql://cruzuser:password@/cruzdb?host=/cloudsql/my-project:us-central1:my-cruz-db
```

### Connection Limits

Cloud Functions can create many instances, each opening database connections. Guard against connection exhaustion:

- Set `--max-instances` to cap total instances
- Use Cloud SQL connection pooling (PgBouncer via AlloyDB Omni or a sidecar)
- Keep connection pool size small per instance (2-5 connections)

## Trigger Types

### HTTP Trigger (default for CruzJS)

```bash
--trigger-http --allow-unauthenticated
```

This is what CruzJS uses for the web application handler.

### Pub/Sub Trigger (for background workers)

```bash
gcloud functions deploy my-cruz-worker \
  --gen2 \
  --trigger-topic=cruz-jobs \
  --entry-point=pubsubHandler \
  --runtime=nodejs20 \
  --region=us-central1
```

Pub/Sub-triggered functions are useful for processing background jobs published from your main CruzJS app.

## Limitations vs Cloud Run

| Feature | Cloud Functions | Cloud Run |
|---------|----------------|-----------|
| `waitUntil()` fire-and-forget | No | Yes (with `cpuAlwaysAllocated`) |
| WebSocket / SSE | No | Yes |
| Custom Dockerfile | No | Yes |
| Concurrency per instance | 1 (Gen1) / configurable (Gen2) | Configurable |
| Startup time | Slower (cold start) | Faster (min instances) |
| Deployment | Source-based | Container-based |

## Next Steps

- [Deploying to Google Cloud](/adapters/gcp-deploy) -- CI/CD, Terraform, and migration workflows
- [Cloud Run](/adapters/gcp-cloud-run) -- container-based alternative
- [GCP Adapter Overview](/adapters/gcp) -- service mapping and environment variables
