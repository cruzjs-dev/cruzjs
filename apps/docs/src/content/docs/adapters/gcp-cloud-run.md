---
title: Google Cloud Run
description: Deploy CruzJS on Cloud Run with container-based auto-scaling, Cloud SQL, and background work via cpuAlwaysAllocated.
---

Cloud Run is the recommended GCP runtime for CruzJS apps with moderate-to-high traffic. It runs your app as a container with automatic scaling, request-based billing, and optional always-on CPU for background work.

## When to Use Cloud Run

- You need `waitUntil()` fire-and-forget (requires `cpuAlwaysAllocated`)
- Your app handles sustained traffic or long-running requests
- You want container-level control (custom binaries, system deps)
- You need WebSocket or streaming support

For simple event-driven workloads with low traffic, consider [Cloud Functions](/adapters/gcp-cloud-functions) instead.

## Full Adapter Configuration

```typescript
import { GCPCloudRunAdapter } from '@cruzjs/adapter-gcp';

export default createCruzApp({
  schema,
  modules: [/* your modules */],
  adapter: new GCPCloudRunAdapter({
    databaseUrl: process.env.DATABASE_URL,
    gcsBucket: process.env.GCS_BUCKET,
    redisUrl: process.env.REDIS_URL,
    pubsubTopic: process.env.PUBSUB_TOPIC,
    gcpProjectId: process.env.GCP_PROJECT_ID,
    cpuAlwaysAllocated: true,
  }),
  pages: () => import('virtual:react-router/server-build'),
});
```

## CPU Always Allocated

By default, Cloud Run only allocates CPU during request processing. Setting `cpuAlwaysAllocated: true` keeps CPU available between requests, which enables:

- **Fire-and-forget `waitUntil()`** -- background tasks continue after the response is sent
- Background health checks and keep-alive connections
- Scheduled in-process work

Without this flag, `waitUntil()` tasks are killed when the response completes.

## Concurrency and Scaling

```bash
gcloud run deploy my-cruz-app \
  --image=us-docker.pkg.dev/my-project/cruz-repo/cruz-app:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --concurrency=80 \
  --min-instances=1 \
  --max-instances=10 \
  --timeout=300 \
  --cpu=1 \
  --memory=512Mi \
  --cpu-boost \
  --no-cpu-throttling \
  --add-cloudsql-instances=my-project:us-central1:my-cruz-db \
  --vpc-connector=cruz-connector \
  --vpc-egress=private-ranges-only \
  --set-env-vars="DATABASE_URL=postgresql://cruzuser:pw@/cruzdb?host=/cloudsql/my-project:us-central1:my-cruz-db" \
  --set-env-vars="AUTH_SECRET=$(openssl rand -base64 32)" \
  --set-env-vars="GCS_BUCKET=my-cruz-uploads" \
  --set-env-vars="REDIS_URL=redis://10.0.0.3:6379"
```

Key flags:

| Flag | Purpose |
|------|---------|
| `--no-cpu-throttling` | Enables `cpuAlwaysAllocated` behavior |
| `--min-instances=1` | Keeps one instance warm (avoids cold starts) |
| `--concurrency=80` | Max concurrent requests per instance |
| `--cpu-boost` | Temporarily adds CPU during startup |
| `--timeout=300` | Request timeout in seconds (max 3600) |

## Cloud SQL Connection

Cloud Run has a built-in Cloud SQL connector that proxies connections over a Unix socket. No VPC required for database access.

```bash
# Unix socket path (recommended)
DATABASE_URL=postgresql://cruzuser:password@/cruzdb?host=/cloudsql/my-project:us-central1:my-cruz-db

# TCP via private IP (requires VPC connector)
DATABASE_URL=postgresql://cruzuser:password@10.x.x.x:5432/cruzdb
```

Use the Unix socket path unless you have a specific reason to use TCP. It handles connection pooling and IAM auth automatically.

## VPC Connector for Memorystore

Memorystore (Redis) runs inside a VPC. Cloud Run needs a VPC connector to reach it:

```bash
gcloud compute networks vpc-access connectors create cruz-connector \
  --region=us-central1 \
  --network=default \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=3
```

Then deploy with `--vpc-connector=cruz-connector --vpc-egress=private-ranges-only`.

## Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx cruz build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
ENV PORT=3000
EXPOSE 3000
CMD ["node", "build/server/index.js"]
```

## `waitUntil()` Behavior

| `cpuAlwaysAllocated` | Behavior |
|----------------------|----------|
| `true` (`--no-cpu-throttling`) | Fire-and-forget. Background tasks run after response. |
| `false` (default) | CPU is deallocated after response. Background tasks may be killed. |

For production apps using background jobs, event emission, or cache warming, always set `cpuAlwaysAllocated: true`.

## Auto-Scaling

Cloud Run scales based on concurrent requests, CPU utilization, or custom metrics. The defaults work well for most CruzJS apps:

- **Scale to zero**: Set `--min-instances=0` for dev/staging to save costs
- **Warm starts**: Set `--min-instances=1` (or higher) for production
- **Burst**: Cloud Run can spin up multiple instances simultaneously for traffic spikes

## Next Steps

- [Deploying to Google Cloud](/adapters/gcp-deploy) -- CI/CD, Terraform, and migration workflows
- [GCP Adapter Overview](/adapters/gcp) -- service mapping and environment variables
