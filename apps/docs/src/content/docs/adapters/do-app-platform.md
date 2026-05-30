---
title: DigitalOcean App Platform
description: Configure and run CruzJS on DigitalOcean App Platform with Managed PostgreSQL, Managed Redis, and Spaces.
---

App Platform is DigitalOcean's managed PaaS. CruzJS runs as a long-lived container with automatic builds, SSL, and scaling.

## Adapter Configuration

```typescript
import { DigitalOceanAppPlatformAdapter } from '@cruzjs/adapter-digitalocean';

export default createCruzApp({
  schema,
  modules: [/* your modules */],
  adapter: new DigitalOceanAppPlatformAdapter({
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    spacesBucket: process.env.SPACES_BUCKET,
    spacesEndpoint: process.env.SPACES_ENDPOINT,
    spacesAccessKey: process.env.SPACES_ACCESS_KEY,
    spacesSecretKey: process.env.SPACES_SECRET_KEY,
    spacesRegion: process.env.SPACES_REGION,
  }),
  pages: () => import('virtual:react-router/server-build'),
});
```

## Full App Spec

Create `.do/app.yaml` at the root of your repository. This is the declarative specification App Platform uses to build and deploy your app.

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
    instance_count: 2
    instance_size_slug: professional-xs
    health_check:
      http_path: /api/health
      initial_delay_seconds: 10
      period_seconds: 30
      timeout_seconds: 5
      failure_threshold: 3
    envs:
      - key: NODE_ENV
        scope: RUN_TIME
        value: production
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
      - key: REDIS_URL
        scope: RUN_TIME
        value: ${redis.DATABASE_URL}
      - key: AUTH_SECRET
        scope: RUN_TIME
        type: SECRET
        value: ENC[your-encrypted-secret]
      - key: SPACES_BUCKET
        scope: RUN_TIME
        value: my-cruz-uploads
      - key: SPACES_ENDPOINT
        scope: RUN_TIME
        value: https://nyc3.digitaloceanspaces.com
      - key: SPACES_ACCESS_KEY
        scope: RUN_TIME
        type: SECRET
        value: ENC[your-encrypted-key]
      - key: SPACES_SECRET_KEY
        scope: RUN_TIME
        type: SECRET
        value: ENC[your-encrypted-secret]

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

## Managed PostgreSQL

App Platform can provision a dev database inline (shown above). For production, create a Managed Database cluster separately and reference its connection string:

```yaml
envs:
  - key: DATABASE_URL
    scope: RUN_TIME
    value: "postgresql://user:pass@host:25060/cruzdb?sslmode=require"
```

The `DATABASE_URL` is automatically injected when you use the `${db.DATABASE_URL}` reference syntax with an inline database component. For standalone clusters, copy the URI from the dashboard or `doctl databases connection <cluster-id> --format URI`.

## Managed Redis

Same pattern -- inline dev databases use `${redis.DATABASE_URL}`. For production clusters, use the `rediss://` (TLS) connection string from the dashboard.

BullMQ queues and cache both run over the same Redis connection. No extra configuration is needed.

## Spaces (S3-Compatible Storage)

DigitalOcean Spaces uses the S3 protocol. Set the endpoint to your Spaces region:

```bash
SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
SPACES_BUCKET=my-cruz-uploads
SPACES_REGION=nyc3
```

Enable the built-in CDN for edge delivery:

```bash
SPACES_CDN_ENDPOINT=https://my-cruz-uploads.nyc3.cdn.digitaloceanspaces.com
```

## Health Check

The adapter exposes `/api/health` automatically. Configure it in the app spec under `health_check`. App Platform uses this to determine when your app is ready to receive traffic and to restart unhealthy instances.

## Auto-Deploy on Push

Set `deploy_on_push: true` in the app spec. Every push to the configured branch triggers a build and deployment. App Platform builds your app, runs the `PRE_DEPLOY` migration job, then rolls out the new version with zero-downtime deploys.

## Environment Variables

Manage environment variables in the app spec or the App Platform dashboard. Use `type: SECRET` for sensitive values -- these are encrypted at rest and masked in logs.

```bash
# Set a secret via the dashboard or doctl
doctl apps update <app-id> --spec .do/app.yaml
```

Variables with `scope: RUN_TIME` are available at runtime. Use `scope: BUILD_TIME` for variables needed during the build step. Use `scope: RUN_AND_BUILD_TIME` for both.

## Migrations

The recommended approach is a `PRE_DEPLOY` job (shown in the app spec above). This runs `npx cruz db migrate` before the new version receives traffic. If the migration fails, the deployment is rolled back.

Alternatively, run migrations manually:

```bash
doctl apps console <app-id> --command "npx cruz db migrate"
```

## Limitations

- **No persistent disk.** App Platform containers are ephemeral. Use Spaces for all file storage.
- **No WebSocket support on shared load balancers.** Use dedicated load balancers for WebSocket connections.
- **Build timeout is 30 minutes.** Keep your build fast with proper caching.
- **Dev databases are single-node.** Use standalone Managed Database clusters for production workloads with replication and automated failover.
