---
title: DigitalOcean Adapter
description: Deploy CruzJS on DigitalOcean App Platform with Managed Databases, Managed Redis, and Spaces.
---

## Installation

```bash
npm install @cruzjs/adapter-digitalocean
```

## Usage

```typescript
import { DigitalOceanAppPlatformAdapter } from '@cruzjs/adapter-digitalocean';

export default createCruzApp({
  schema,
  modules: [/* your modules */],
  adapter: new DigitalOceanAppPlatformAdapter({
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    spacesBucket: process.env.SPACES_BUCKET,
  }),
  pages: () => import('virtual:react-router/server-build'),
});
```

## Service Mapping

| CruzJS Binding | DigitalOcean Service |
|----------------|---------------------|
| Database | Managed Databases (Postgres, MySQL) |
| Cache | Managed Redis |
| Storage | Spaces (S3-compatible) |
| Queue | BullMQ over Redis |
| AI | OpenAI API |

## Database Setup (Managed Databases)

### Creating a Managed PostgreSQL Cluster

```bash
# Create a PostgreSQL cluster
doctl databases create my-cruz-db \
  --engine pg \
  --version 16 \
  --size db-s-1vcpu-1gb \
  --region nyc1 \
  --num-nodes 1

# Create a database
doctl databases db create <cluster-id> cruzdb

# Create an application user
doctl databases user create <cluster-id> cruzuser
```

### Connection String

DigitalOcean provides the connection string in the dashboard or via CLI:

```bash
# Get the connection string
doctl databases connection <cluster-id> --format URI

DATABASE_URL=postgresql://cruzuser:password@db-postgresql-nyc1-xxxxx-do-user-xxxxx.db.ondigitalocean.com:25060/cruzdb?sslmode=require
```

### Connection Pooling

DigitalOcean Managed Databases include built-in connection pooling. Enable it in the dashboard for your database cluster, then use the pool connection string instead of the direct connection.

### Trusted Sources

For security, restrict database access to your App Platform apps:

```bash
doctl databases firewalls append <cluster-id> \
  --rule app:<app-id>
```

## Cache Setup (Managed Redis)

### Creating a Managed Redis Cluster

```bash
doctl databases create my-cruz-cache \
  --engine redis \
  --version 7 \
  --size db-s-1vcpu-1gb \
  --region nyc1 \
  --num-nodes 1
```

### Configuration

```bash
# Get the connection string
doctl databases connection <cluster-id> --format URI

REDIS_URL=rediss://default:password@db-redis-nyc1-xxxxx-do-user-xxxxx.db.ondigitalocean.com:25061
```

The `rediss://` protocol indicates TLS, which DigitalOcean Managed Redis requires.

## Storage Setup (Spaces)

DigitalOcean Spaces is S3-compatible object storage that maps to CruzJS's storage binding.

### Creating a Space

```bash
# Create a Space via the dashboard or API
# Spaces are created in the DigitalOcean console under "Spaces Object Storage"
```

Or via the API:

```bash
doctl compute cdn create \
  --origin my-cruz-uploads.nyc3.digitaloceanspaces.com \
  --ttl 3600
```

### Configuration

```typescript
new DigitalOceanAppPlatformAdapter({
  databaseUrl: process.env.DATABASE_URL,
  spacesBucket: process.env.SPACES_BUCKET,
  spacesEndpoint: process.env.SPACES_ENDPOINT,
  spacesAccessKey: process.env.SPACES_ACCESS_KEY,
  spacesSecretKey: process.env.SPACES_SECRET_KEY,
  spacesRegion: process.env.SPACES_REGION,
})
```

```bash
SPACES_BUCKET=my-cruz-uploads
SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
SPACES_ACCESS_KEY=your-spaces-access-key
SPACES_SECRET_KEY=your-spaces-secret-key
SPACES_REGION=nyc3
```

### CORS Configuration

Configure CORS on your Space via the DigitalOcean console or API:

```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>https://myapp.com</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
```

### CDN

Enable the built-in CDN for Spaces to serve files from edge locations:

```bash
SPACES_CDN_ENDPOINT=https://my-cruz-uploads.nyc3.cdn.digitaloceanspaces.com
```

## Queue Setup (BullMQ over Redis)

The DigitalOcean adapter uses BullMQ with your Managed Redis for queue processing:

```typescript
new DigitalOceanAppPlatformAdapter({
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL, // Same Redis used for cache and queues
})
```

BullMQ provides reliable message processing with automatic retries, priority queues, and dead-letter handling -- all backed by your Managed Redis cluster.

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Managed PostgreSQL connection string |
| `REDIS_URL` | No | Managed Redis connection string |
| `SPACES_BUCKET` | No | Spaces bucket name |
| `SPACES_ENDPOINT` | No | Spaces endpoint URL |
| `SPACES_ACCESS_KEY` | No | Spaces access key |
| `SPACES_SECRET_KEY` | No | Spaces secret key |
| `SPACES_REGION` | No | Spaces region (e.g., `nyc3`) |
| `OPENAI_API_KEY` | No | OpenAI API key for AI features |
| `AUTH_SECRET` | Yes | Session encryption key |
| `PORT` | No | Server port (default: `8080` on App Platform) |

## Deployment with App Platform

### App Spec

Create an `.do/app.yaml` file for declarative deployment:

```yaml
name: my-cruz-app
region: nyc
services:
  - name: web
    github:
      repo: your-org/your-repo
      branch: main
      deploy_on_push: true
    build_command: npx cruz build
    run_command: node build/server/index.js
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
      - key: AUTH_SECRET
        scope: RUN_TIME
        type: SECRET
        value: your-secret-here
      - key: SPACES_BUCKET
        scope: RUN_TIME
        value: my-cruz-uploads
      - key: SPACES_ENDPOINT
        scope: RUN_TIME
        value: https://nyc3.digitaloceanspaces.com
      - key: SPACES_ACCESS_KEY
        scope: RUN_TIME
        type: SECRET
        value: your-key
      - key: SPACES_SECRET_KEY
        scope: RUN_TIME
        type: SECRET
        value: your-secret
    health_check:
      http_path: /api/health
      initial_delay_seconds: 10
      period_seconds: 30

databases:
  - name: db
    engine: PG
    version: "16"
    size: db-s-dev-database
    num_nodes: 1

  - name: redis
    engine: REDIS
    version: "7"
    size: db-s-dev-database
    num_nodes: 1
```

### Deploying with App Spec

```bash
# Create the app from spec
doctl apps create --spec .do/app.yaml

# Update an existing app
doctl apps update <app-id> --spec .do/app.yaml
```

### Deploying with `doctl`

```bash
# Build the app
cruz build

# Create an App Platform app (interactive)
doctl apps create

# Trigger a deployment
doctl apps create-deployment <app-id>

# List deployments
doctl apps list-deployments <app-id>

# View logs
doctl apps logs <app-id> --type run
```

### Database Migrations

Run migrations as a job in App Platform or as a pre-deploy command:

```yaml
# In app.yaml, add a job for migrations
jobs:
  - name: migrate
    github:
      repo: your-org/your-repo
      branch: main
    build_command: npm ci
    run_command: npx cruz db migrate
    kind: PRE_DEPLOY
    instance_size_slug: basic-xxs
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
```

## Dockerfile Deployment

If you prefer Docker over source-based deployment on App Platform:

```yaml
# .do/app.yaml with Dockerfile
services:
  - name: web
    dockerfile_path: Dockerfile
    github:
      repo: your-org/your-repo
      branch: main
    http_port: 3000
```

See the [Docker adapter docs](/adapters/docker) for a production-ready Dockerfile.

## Runtime Type

`container` -- Long-running process on App Platform. `waitUntil()` is fire-and-forget. Background jobs process via BullMQ over Managed Redis.
