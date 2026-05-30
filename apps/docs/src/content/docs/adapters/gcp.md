---
title: Google Cloud Adapter
description: Deploy CruzJS on Cloud Run or Cloud Functions with Cloud SQL, Memorystore, GCS, and Pub/Sub.
---

## Installation

```bash
npm install @cruzjs/adapter-gcp
```

## Cloud Run

Best for: Containerized apps with auto-scaling, moderate-to-high traffic.

```typescript
import { GCPCloudRunAdapter } from '@cruzjs/adapter-gcp';

export default createCruzApp({
  schema,
  modules: [/* your modules */],
  adapter: new GCPCloudRunAdapter({
    databaseUrl: process.env.DATABASE_URL,
    gcsBucket: process.env.GCS_BUCKET,
    cpuAlwaysAllocated: true, // Enable background work
  }),
  pages: () => import('virtual:react-router/server-build'),
});
```

## Cloud Functions

Best for: Simple serverless APIs, event-driven workloads.

```typescript
import { GCPCloudFunctionsAdapter } from '@cruzjs/adapter-gcp';

export default createCruzApp({
  schema,
  modules: [/* your modules */],
  adapter: new GCPCloudFunctionsAdapter({
    databaseUrl: process.env.DATABASE_URL,
    gcsBucket: process.env.GCS_BUCKET,
  }),
  pages: () => import('virtual:react-router/server-build'),
});
```

## Service Mapping

| CruzJS Binding | GCP Service |
|----------------|------------|
| Database | Cloud SQL (Postgres/MySQL), AlloyDB |
| Cache | Memorystore (Redis) |
| Storage | Cloud Storage (GCS) |
| Queue | Pub/Sub, Cloud Tasks |
| AI | Vertex AI, Gemini API |

## Database Setup (Cloud SQL)

### Cloud SQL PostgreSQL

Create a Cloud SQL instance and configure the connection. For Cloud Run, use the built-in Cloud SQL connector:

```bash
DATABASE_URL=postgresql://cruzuser:password@/cruzdb?host=/cloudsql/project-id:region:instance-name
```

For Cloud Functions, use the same Unix socket path:

```bash
DATABASE_URL=postgresql://cruzuser:password@/cruzdb?host=/cloudsql/project-id:us-central1:my-cruz-db
```

### Creating a Cloud SQL Instance

```bash
# Create a PostgreSQL instance
gcloud sql instances create my-cruz-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=your-password

# Create the database
gcloud sql databases create cruzdb --instance=my-cruz-db

# Create an application user
gcloud sql users create cruzuser \
  --instance=my-cruz-db \
  --password=your-app-password
```

### AlloyDB

For production workloads requiring high performance:

```bash
DATABASE_URL=postgresql://cruzuser:password@10.x.x.x:5432/cruzdb
```

AlloyDB requires VPC access. Configure your Cloud Run service with a VPC connector.

## Cache Setup (Memorystore Redis)

Memorystore provides managed Redis that maps to CruzJS's `CacheBinding` interface.

### Creating a Memorystore Instance

```bash
gcloud redis instances create my-cruz-cache \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --network=default
```

### Configuration

```typescript
new GCPCloudRunAdapter({
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  // ...
})
```

```bash
REDIS_URL=redis://10.x.x.x:6379
```

### VPC Connector

Memorystore runs inside a VPC. Your Cloud Run service needs a VPC connector:

```bash
# Create a VPC connector
gcloud compute networks vpc-access connectors create cruz-connector \
  --region=us-central1 \
  --network=default \
  --range=10.8.0.0/28

# Deploy Cloud Run with the connector
gcloud run deploy my-cruz-app \
  --vpc-connector=cruz-connector \
  --vpc-egress=private-ranges-only
```

## Storage Setup (Cloud Storage)

GCS maps to CruzJS's storage binding for file uploads and media.

### Creating a Bucket

```bash
gcloud storage buckets create gs://my-cruz-uploads \
  --location=us-central1 \
  --uniform-bucket-level-access
```

### Configuration

```typescript
new GCPCloudRunAdapter({
  databaseUrl: process.env.DATABASE_URL,
  gcsBucket: process.env.GCS_BUCKET,
  // ...
})
```

```bash
GCS_BUCKET=my-cruz-uploads
```

### CORS Configuration

For direct client uploads, configure CORS on the bucket:

```json
[
  {
    "origin": ["https://myapp.com"],
    "method": ["GET", "PUT", "POST"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

```bash
gcloud storage buckets update gs://my-cruz-uploads --cors-file=cors.json
```

## Queue Setup (Pub/Sub)

Pub/Sub maps to CruzJS's `QueueBinding` interface for asynchronous message processing.

### Creating a Topic and Subscription

```bash
# Create a topic
gcloud pubsub topics create cruz-jobs

# Create a push subscription (for Cloud Run)
gcloud pubsub subscriptions create cruz-jobs-sub \
  --topic=cruz-jobs \
  --push-endpoint=https://my-cruz-worker-xxxx.run.app/process \
  --ack-deadline=60

# Or create a pull subscription (for Cloud Functions)
gcloud pubsub subscriptions create cruz-jobs-sub \
  --topic=cruz-jobs \
  --ack-deadline=60
```

### Configuration

```typescript
new GCPCloudRunAdapter({
  databaseUrl: process.env.DATABASE_URL,
  pubsubTopic: process.env.PUBSUB_TOPIC,
  gcpProjectId: process.env.GCP_PROJECT_ID,
  // ...
})
```

```bash
PUBSUB_TOPIC=cruz-jobs
GCP_PROJECT_ID=my-gcp-project
```

### Cloud Tasks (Alternative)

For task-level control with retries and scheduling:

```bash
gcloud tasks queues create cruz-tasks \
  --max-dispatches-per-second=10 \
  --max-concurrent-dispatches=5 \
  --max-attempts=3
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Cloud SQL connection string (with Unix socket path) |
| `REDIS_URL` | No | Memorystore Redis endpoint |
| `GCS_BUCKET` | No | Cloud Storage bucket name |
| `PUBSUB_TOPIC` | No | Pub/Sub topic for background jobs |
| `GCP_PROJECT_ID` | No | GCP project ID (auto-detected on GCP) |
| `GOOGLE_CLOUD_REGION` | No | Region for API calls |
| `OPENAI_API_KEY` | No | OpenAI API key (or use Vertex AI) |
| `AUTH_SECRET` | Yes | Session encryption key |

## Deployment with `gcloud` CLI

### Cloud Run

```bash
# Build the CruzJS app
cruz build

# Build the Docker image
docker build -t gcr.io/my-project/cruz-app .

# Push to Container Registry
docker push gcr.io/my-project/cruz-app

# Deploy to Cloud Run
gcloud run deploy my-cruz-app \
  --image=gcr.io/my-project/cruz-app \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances=my-project:us-central1:my-cruz-db \
  --set-env-vars="DATABASE_URL=postgresql://cruzuser:password@/cruzdb?host=/cloudsql/my-project:us-central1:my-cruz-db" \
  --set-env-vars="GCS_BUCKET=my-cruz-uploads" \
  --set-env-vars="AUTH_SECRET=$(openssl rand -base64 32)" \
  --vpc-connector=cruz-connector \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1
```

### Cloud Functions

```bash
# Build the CruzJS app
cruz build

# Deploy as a Cloud Function
gcloud functions deploy my-cruz-app \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=handler \
  --source=./build \
  --set-env-vars="DATABASE_URL=postgresql://..." \
  --memory=512MB \
  --timeout=60s
```

### Dockerfile for Cloud Run

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
EXPOSE 3000
CMD ["node", "build/server/index.js"]
```

## Runtime Type

- **Cloud Run**: `container` -- Auto-scaling containers. `waitUntil()` is fire-and-forget when `cpuAlwaysAllocated` is true.
- **Cloud Functions**: `serverless` -- Scale-to-zero functions. `waitUntil()` must be flushed before response returns.
