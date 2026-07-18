---
title: Installation
description: Set up a new CruzJS project or add CruzJS to an existing application.
---

CruzJS is a full-stack TypeScript framework built on React Router v7 with tRPC, Drizzle ORM, and Inversify dependency injection. It deploys to Cloudflare Workers/Pages with D1, KV, R2, Queues, and Workers AI. (Multi-cloud is on the [roadmap](/adapters/overview).)

## Prerequisites

Before you begin, make sure you have:

- **Node.js 20+** -- CruzJS uses modern Node.js features
- **npm** (or your preferred package manager) -- no monorepo or workspace setup required
- **A Cloudflare account** (if deploying to Cloudflare) -- free tier is sufficient for development and small projects. Other deployment targets have their own prerequisites.

## Create a New Project

The fastest way to get started is with `@cruzjs/create`:

```bash
npm create @cruzjs my-app
```

This scaffolds a complete CruzJS application with the core framework and UI components pre-configured. The `@cruzjs/core`, `@cruzjs/start`, and `@cruzjs/saas` packages are installed as regular npm dependencies.

### Scaffold Options

```bash
# Default: core + start (UI components and theming)
npm create @cruzjs my-app

# Include pro features (organizations, billing, permissions, admin)
# Include billing (Stripe), admin dashboard, and audit logging
npm create @cruzjs my-app -- --with-pro

# Core only (no UI package, no pro features)
npm create @cruzjs my-app -- --core-only
```

After scaffolding, install dependencies and start developing:

```bash
cd my-app
npm install
cp .env.example .env
cruz dev
```

Your `package.json` will include the CruzJS packages as dependencies:

```json
{
  "dependencies": {
    "@cruzjs/core": "^1.0.0",
    "@cruzjs/start": "^1.0.0",
    "react-router": "^7.0.0",
    "drizzle-orm": "^0.30.0",
    "inversify": "^6.0.0",
    "reflect-metadata": "^0.2.0",
    "zod": "^3.0.0",
    "@trpc/client": "^11.0.0",
    "@trpc/react-query": "^11.0.0",
    "@trpc/server": "^11.0.0",
    "@tanstack/react-query": "^5.0.0"
  },
  "devDependencies": {
    "@cruzjs/cli": "^1.0.0",
    "drizzle-kit": "^0.21.0",
    "@cloudflare/workers-types": "^4.0.0",
    "typescript": "^5.0.0",
    "wrangler": "^3.0.0"
  }
}
```

## Manual Setup in an Existing Project

If you have an existing React Router v7 project on Cloudflare Pages, you can add CruzJS packages manually.

### 1. Install Packages

Install the core framework:

```bash
npm install @cruzjs/core @react-router/cloudflare react-router drizzle-orm inversify reflect-metadata zod @trpc/client @trpc/react-query @trpc/server @tanstack/react-query
```

Add UI components (optional but recommended):

```bash
npm install @cruzjs/start
```

Add pro features for organizations, billing, and admin (optional):

:::tip
`@cruzjs/saas` adds billing (Stripe), admin dashboard, and audit logging to your app.
:::

```bash
npm install @cruzjs/saas
```

Install dev dependencies:

```bash
npm install -D @cruzjs/cli drizzle-kit @cloudflare/workers-types typescript wrangler
```

### 2. Create the Server Entry

Create `src/app.server.ts` to register your database schema and application modules:

```typescript
import 'reflect-metadata';
import { DrizzleService } from '@cruzjs/core/shared/database/drizzle.service';
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';
import * as schema from './database/schema';

DrizzleService.setSchema(schema);

registerModules([
  StartModule,
  // Add your feature modules here
]);
```

### 3. Create the Schema File

Create `src/database/schema.ts` to export all database tables:

```typescript
/**
 * Application Database Schema
 */

// Re-export all tables from @cruzjs/start (includes core and pro)
export * from '@cruzjs/start/database/schema';

// Add your app-specific tables below
```

If you are not using `@cruzjs/start`, export from the packages you have installed:

```typescript
export * from '@cruzjs/core/database/schema';
// export * from '@cruzjs/saas/database/schema';  // if using @cruzjs/saas
```

### 4. Update Entry Server

`src/entry.server.tsx` is the actual entry point. It imports `./app.server` (so your schema and modules register before any request is handled) and re-exports the framework request handler -- all the SSR and bootstrap logic lives inside `handleRequest`, so no boilerplate is needed:

```typescript
import './app.server';
import { handleRequest } from '@cruzjs/core/framework/entry-handler.server';
export default handleRequest;
```

## Environment Setup

Create a `.env` file in your project root with the required variables:

```env
# Database — local database for development (SQLite for Cloudflare, PostgreSQL for other adapters)
# DATABASE_URL=  # Adapter-specific; Cloudflare adapter auto-configures via D1 bindings

# Auth — generate a secure random string (openssl rand -base64 32)
AUTH_SECRET=change-me-in-production

# OAuth (optional — configure for social login)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Encryption key for sensitive data
SCM_ENCRYPTION_KEY=

# Stripe (only if using @cruzjs/saas billing)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

The `AUTH_SECRET` is used for session encryption and must be a strong random value in production. Generate one with:

```bash
openssl rand -base64 32
```

## First Run

Start the development server:

```bash
cruz dev
```

This starts a local development server with:

- Hot module replacement via Vite
- Local database -- SQLite via D1 emulation (Cloudflare adapter) or PostgreSQL (other adapters)
- In-memory KV namespace for caching
- Full tRPC endpoint at `/api/trpc/*`

Visit [http://localhost:5000](http://localhost:5000) to see your application.

### Database Setup

Generate and apply your initial database migration:

```bash
# Generate migration files from your schema
cruz db generate

# Apply migrations to local database
cruz db migrate

# Optional: seed with test data
cruz db seed
```

### Verify Everything Works

Open Drizzle Studio to inspect your database:

```bash
cruz db studio
```

Run the type checker to confirm there are no issues:

```bash
cruz typecheck
```

## Next Steps

- [Configuration](/getting-started/configuration) -- customize `cruz.config.ts` and environment settings
- [Directory Structure](/getting-started/directory-structure) -- understand the project layout
- [First Application](/getting-started/first-application) -- build your first feature end-to-end
- [Deployment](/getting-started/deployment) -- deploy to Cloudflare Pages
