# Deployment

CruzJS deploys to Cloudflare Pages with D1 (database), KV (caching), and R2 (file storage).

## Architecture

```
Local Development:
  cruz dev → Vite dev server (port 5000)
           → Local SQLite (D1 facade)
           → Local KV/R2 facades

Staging/Production:
  Cloudflare Pages → React Router SSR
  Cloudflare D1    → SQLite database
  Cloudflare KV    → Key-value caching
  Cloudflare R2    → Object storage
  External Workers → Standalone Workers, Workflows, Queue consumers
```

## Configuration

### cruz.config.ts

The `cruz.config.ts` file in `apps/web/` defines deployment bindings and environment variables:

```typescript
// apps/web/cruz.config.ts
import { defineConfig } from '@cruzjs/cli';

export default defineConfig({
  d1Databases: ['DB'],
  kvNamespaces: ['CACHE'],
  r2Buckets: ['STORAGE'],
  vars: {
    APP_URL: 'https://myapp.example.com',
  },
});
```

## CLI Commands

### Environment Setup

```bash
# Initialize a new environment (creates D1/KV/R2 resources)
cruz init staging

# Check all environments
cruz status
```

### Deploying

```bash
# Full deployment (build + migrate + ship)
cruz deploy staging

# Preview deploy from current branch
cruz deploy preview

# Deploy to production
cruz deploy production
```

### Database

```bash
# Generate migration after schema changes
cruz db generate

# Apply migrations to local D1
cruz db migrate

# Apply migrations to remote D1
cruz db migrate --remote

# Execute SQL against local or remote D1
cruz db query "SELECT * FROM users"
cruz db query "SELECT * FROM users" --remote

# Open Drizzle Studio
cruz db studio

# Seed database
cruz db seed

# Hard reset local D1
cruz db hard-reset
```

### Secrets Management

```bash
# Set secrets for an environment
cruz secrets set

# List secrets
cruz secrets list
```

### Infrastructure Resources

```bash
# Queue management
cruz queue create
cruz queue list
cruz queue delete

# KV namespace operations
cruz kv create
cruz kv list

# R2 bucket operations
cruz r2 create
cruz r2 list
```

## External Processes

Standalone Workers, Workflows, and Queue consumers live in `external-processes/`:

```bash
# Scaffold a standalone Cloudflare Worker
cruz new worker my-worker

# Scaffold a Workflow (durable, retryable steps)
cruz new workflow my-workflow

# Scaffold a Queue consumer Worker
cruz new queue-worker my-consumer --queue my-queue
```

Scaffolded processes go in `external-processes/<name>/` with their own `wrangler.toml`. They auto-deploy with `cruz deploy`.

## Cloudflare Bindings

The `CloudflareContext` service provides typed access to D1, KV, R2, and AI bindings:

```typescript
import { Injectable, Inject, CloudflareContext } from '@cruzjs/core';

@Injectable()
export class MyService {
  constructor(@Inject(CloudflareContext) private readonly cf: CloudflareContext) {}

  async getData() {
    // D1 is accessed via Drizzle ORM (preferred)
    // KV
    const cached = await this.cf.kv.get('my-key');
    // R2
    const file = await this.cf.r2.get('uploads/file.pdf');
  }
}
```

In local development, automatic facades provide local equivalents for all CF bindings.

## Deployment Workflow

### First-Time Setup

```bash
# 1. Initialize environment (creates D1, KV, R2 resources on Cloudflare)
cruz init staging

# 2. Set secrets
cruz secrets set

# 3. Deploy
cruz deploy staging
```

### Subsequent Deployments

```bash
# Build, migrate, and deploy
cruz deploy staging
```

### Preview Deployments

```bash
# Deploy from current branch for review
cruz deploy preview
```

## Tear Down

```bash
# Destroy an environment and its resources
cruz destroy staging
```

## Troubleshooting

### Database Issues

```bash
# Check local D1
cruz db query "SELECT 1"

# Hard reset local database
cruz db hard-reset

# Re-run migrations
cruz db migrate
```

### Build Issues

```bash
# Run type check
cruz typecheck

# Clean build
cruz build
```
