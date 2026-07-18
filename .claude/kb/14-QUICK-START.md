# Quick Start Guide

Complete guide to getting CruzJS up and running locally and deployed to Cloudflare.

## Local Development Setup

### Prerequisites

- Node.js 20+
- npm

### Step 1: Clone and Install

```bash
git clone <repository-url>
cd cruzjs
npm install
```

### Step 2: Database Setup

```bash
# Run migrations against local D1 (SQLite)
cruz db migrate

# Optional: Seed with test data
cruz db seed
```

### Step 3: Start Development

```bash
# Start dev server (runs in background)
cruz dev
```

Visit: http://localhost:5000

### Stop the Dev Server

```bash
cruz dev stop
```

## Common Development Tasks

### Database Operations

```bash
# Generate migration after schema changes
cruz db generate

# Apply migrations
cruz db migrate

# Apply migrations to remote D1
cruz db migrate --remote

# Open Drizzle Studio (database viewer)
cruz db studio

# Execute SQL
cruz db query "SELECT * FROM users"

# Hard reset (DELETES ALL LOCAL DATA)
cruz db hard-reset
```

### Running Tests

```bash
# Unit tests
cruz test

# Vitest UI mode
cruz test --ui

# E2E tests
cruz test:e2e

# Type check
cruz typecheck
```

### Build

```bash
# Production build
cruz build

# Start production server
cruz start
```

## Creating a New Feature

### Step 1: Create Feature Directory

```bash
mkdir -p apps/web/src/features/my-feature
```

### Step 2: Create Files

```bash
touch apps/web/src/features/my-feature/index.ts
touch apps/web/src/features/my-feature/my-feature.module.ts
touch apps/web/src/features/my-feature/my-feature.router.ts
touch apps/web/src/features/my-feature/my-feature.service.ts
touch apps/web/src/features/my-feature/my-feature.schema.ts
touch apps/web/src/features/my-feature/my-feature.validation.ts
```

### Step 3: Implement (see templates in KB docs)

Follow patterns in:
- `03-DI-INVERSIFY.md` for service/module
- `04-DATABASE-DRIZZLE.md` for schema
- `05-TRPC-ROUTERS.md` for router
- `11-FRAMEWORK-EXTENSIBILITY.md` for provider

### Step 4: Register Module

Add the module to `registerModules` in `src/app.server.ts`:

```typescript
// apps/web/src/app.server.ts
import 'reflect-metadata';
import { DrizzleService } from '@cruzjs/core/shared/database/drizzle.service';
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';
import * as schema from './database/schema';
import { MyFeatureModule } from './features/my-feature/my-feature.module';

DrizzleService.setSchema(schema);

registerModules([StartModule, MyFeatureModule]);
```

If the module defines `pageRoutes`, add it to `routes.ts` to activate its page routes:

```typescript
// apps/web/src/routes.ts
import { MyFeatureModule } from './features/my-feature/my-feature.module';

export default createCruzRoutes({
  // ...
  modules: [MyFeatureModule],
});
```

### Step 5: Export Schema

```typescript
// apps/web/src/database/schema.ts
export * from '../features/my-feature/my-feature.schema';
```

### Step 6: Generate Migration

```bash
cruz db generate
cruz db migrate
```

## Scaffolding External Processes

```bash
# Create a standalone Cloudflare Worker
cruz new worker my-worker

# Create a Workflow (durable, retryable steps)
cruz new workflow my-workflow

# Create a Queue consumer Worker
cruz new queue-worker my-consumer --queue my-queue
```

## Deployment

### First-Time Deployment

```bash
# Initialize environment (creates D1/KV/R2 resources)
cruz init staging

# Set secrets
cruz secrets set

# Deploy (build + migrate + ship)
cruz deploy staging
```

### Subsequent Deployments

```bash
cruz deploy staging
```

### Preview Deployments

```bash
cruz deploy preview
```

### Check Status

```bash
cruz status
```

### Deploy to Production

```bash
# First time
cruz init production

# Updates
cruz deploy production
```

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port 5000
lsof -i :5000
kill -9 <PID>
```

### Database Issues

```bash
# Hard reset local D1
cruz db hard-reset

# Re-run migrations
cruz db migrate

# Optionally seed
cruz db seed
```

### Type Errors

```bash
cruz typecheck
```

## Useful Commands Reference

| Task | Command |
|------|---------|
| Start dev server | `cruz dev` |
| Stop dev server | `cruz dev stop` |
| Run migrations | `cruz db migrate` |
| Run remote migrations | `cruz db migrate --remote` |
| Open DB studio | `cruz db studio` |
| Run tests | `cruz test` |
| Run E2E tests | `cruz test:e2e` |
| Type check | `cruz typecheck` |
| Build for prod | `cruz build` |
| Deploy staging | `cruz deploy staging` |
| Deploy preview | `cruz deploy preview` |
| Check status | `cruz status` |
| Init environment | `cruz init <env>` |
| Destroy environment | `cruz destroy <env>` |
