---
title: Directory Structure
description: Understand the CruzJS project layout — features, database, routes, and external processes.
---

When you scaffold a project with `npm create @cruzjs my-app`, you get a flat project structure (not a monorepo). The `@cruzjs/core`, `@cruzjs/start`, and `@cruzjs/saas` packages are installed as regular npm dependencies from `node_modules`.

## Project Layout

```
my-app/
├── src/
│   ├── entry.server.tsx        # SSR entry point — handles each request
│   ├── entry.client.tsx        # Client-side hydration entry
│   ├── root.tsx                # Root React component with providers
│   ├── routes.ts               # React Router route config
│   ├── app.server.ts           # App bootstrap (registerModules + schema)
│   │
│   ├── database/
│   │   ├── schema.ts           # Central schema (re-exports from packages + your tables)
│   │   └── migrations/         # Generated Drizzle migrations
│   │
│   ├── features/               # Your feature modules
│   │   └── <feature-name>/
│   │       ├── index.ts                # Barrel exports
│   │       ├── <feature>.module.ts     # @Module (providers, trpcRouters, events)
│   │       ├── <feature>.router.ts     # tRPC router
│   │       ├── <feature>.service.ts    # Business logic (@Injectable)
│   │       ├── <feature>.schema.ts     # Drizzle table definition
│   │       ├── <feature>.validation.ts # Zod input schemas
│   │       ├── <feature>.models.ts     # TypeScript types
│   │       ├── routes/                 # Feature-specific React Router routes
│   │       │   ├── index.tsx
│   │       │   └── $id.tsx
│   │       └── events/                 # Domain events (optional)
│   │
│   ├── components/             # Shared React components
│   ├── contexts/               # React context providers
│   └── trpc/
│       ├── client.ts           # tRPC React client hooks
│       └── router.ts           # Combined AppRouter (all feature routers)
│
├── external-processes/         # Standalone Workers, Workflows, Queues
│   └── <name>/                 # Each with its own wrangler.toml
├── public/                     # Static assets served directly
├── cruz.config.ts              # CruzJS deployment configuration
├── wrangler.toml               # Generated Cloudflare config (do not edit manually)
├── vite.config.ts              # Vite build configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Has @cruzjs/core, @cruzjs/start, @cruzjs/saas as dependencies
└── .env                        # Local environment variables
```

## Key Files

### `cruz.config.ts`

Defines your app name, Cloudflare bindings (D1, KV, R2, AI), shared variables, and per-environment settings. The CLI reads this to generate `wrangler.toml` and provision infrastructure.

### `src/app.server.ts`

Bootstraps the application: sets the database schema with `DrizzleService.setSchema(schema)` and registers your modules with `registerModules([...])`. Imported by `entry.server.tsx` before any request is handled.

### `src/entry.server.tsx`

The actual entry point for every request. Imports `./app.server` (so schema and modules are registered), then re-exports the framework `handleRequest`, which initializes `CloudflareContext` from the React Router load context (extracting D1, KV, R2 bindings) and renders the app to a `ReadableStream`.

### `src/database/schema.ts`

The single source of truth for all database tables. Re-exports tables from `@cruzjs/core`, `@cruzjs/start`, and `@cruzjs/saas`, plus any app-specific tables you define in your features.

### `src/trpc/router.ts`

Combines all tRPC routers (from core, pro, and your features) into a single `AppRouter`. This type is exported and used by the tRPC client for end-to-end type safety.

### `src/routes.ts`

React Router route configuration. Routes point to files inside feature folders. For example, a forum feature's detail page at `src/features/forum/routes/$id.tsx` would be mapped to `/forums/:id` in this file.

## Feature Module Structure

Each feature in `src/features/` is a self-contained module. Routes live **inside** the feature folder, keeping all related code together.

| File | Purpose |
|------|---------|
| `index.ts` | Barrel exports for the feature |
| `<name>.module.ts` | `@Module` decorator -- declares providers, trpcRouters, pageRoutes, and event listeners |
| `<name>.router.ts` | tRPC router -- defines API endpoints (queries and mutations) |
| `<name>.service.ts` | Business logic -- `@Injectable()` class with database operations |
| `<name>.schema.ts` | Drizzle table definition -- columns, indexes, foreign keys |
| `<name>.validation.ts` | Zod schemas -- input validation for tRPC procedures |
| `<name>.models.ts` | TypeScript types and interfaces |
| `routes/` | React Router route components for this feature |
| `events/` | Domain events and listeners (optional) |

Features are registered by adding their module to the `registerModules([...])` array in `src/app.server.ts`.

## `@cruzjs/*` Packages

The framework is distributed as npm packages. You do **not** have a `packages/` folder in your project -- these are installed into `node_modules` like any other dependency.

| Package | Description |
|---------|-------------|
| `@cruzjs/core` | Framework runtime -- DI, auth, tRPC, database, Cloudflare bindings |
| `@cruzjs/start` | UI components, theming, starter templates, pre-built auth pages, organizations, roles, permissions |
| `@cruzjs/saas` | Billing, admin dashboard, audit logging |
| `@cruzjs/cli` | Development and deployment CLI (installed as a dev dependency) |

Your `package.json` lists them as regular dependencies:

```json
{
  "dependencies": {
    "@cruzjs/core": "^1.0.0",
    "@cruzjs/start": "^1.0.0",
    "@cruzjs/saas": "^1.0.0"
  },
  "devDependencies": {
    "@cruzjs/cli": "^1.0.0"
  }
}
```

### Key exports from `@cruzjs/core`

- `CloudflareContext` -- access D1, KV, R2, AI, Queues
- `DrizzleService` -- database initialization and schema management
- `ConfigService` -- typed environment variable access
- `@Injectable()`, `@Inject()`, `@Module()` -- dependency injection decorators
- `router`, `publicProcedure`, `protectedProcedure`, `orgProcedure` -- tRPC building blocks
- `getAppContainer()` -- resolve services from the DI container outside a request (jobs, scripts); inside a tRPC procedure use `ctx.container.get(Service)`

### Key exports from `@cruzjs/saas`

- `orgProcedure` -- tRPC procedure with organization context (`ctx.org.orgId`, `ctx.org.role`)
- `requirePermission()` -- role-based permission checks
- `OrgService`, `MemberService`, `BillingService` -- injectable services
- Organization, member, invitation, and subscription schemas

## external-processes/ -- Standalone Workers

For background processing that runs outside your main Pages application. Each directory is a standalone Cloudflare Worker with its own `wrangler.toml`:

```
external-processes/
├── email-worker/           # Example: email sending worker
│   ├── src/
│   │   └── index.ts        # Worker entry point
│   ├── wrangler.toml       # Worker-specific config
│   └── package.json
│
└── data-pipeline/          # Example: queue consumer
    ├── src/
    │   └── index.ts
    ├── wrangler.toml
    └── package.json
```

Scaffold new external processes with the CLI:

```bash
# Standalone Worker
cruz new worker email-sender

# Durable Workflow (retryable multi-step process)
cruz new workflow onboarding-flow

# Queue consumer Worker
cruz new queue-worker invoice-processor --queue invoices
```

External processes are automatically deployed alongside your main app when you run `cruz deploy`.

## Import Path Aliases

CruzJS configures TypeScript path aliases for clean imports:

```typescript
// Framework package imports (from node_modules)
import { CloudflareContext } from '@cruzjs/core/shared/cloudflare/context';
import { ConfigService } from '@cruzjs/core/shared/config/config.service';
import { orgProcedure } from '@cruzjs/core/trpc/context';
import { requirePermission } from '@cruzjs/start/orgs/auth.utils';

// Local project imports (from src/)
import { trpc } from '@/trpc/client';
import * as schema from '@/database/schema';
```

The `@` alias maps to your project's `src/` directory. The `@cruzjs/<package>` imports resolve to npm packages in `node_modules`.

## Next Steps

- [First Application](/getting-started/first-application) -- build a complete feature from database schema to UI
- [Configuration](/getting-started/configuration) -- customize your cruz.config.ts
- [Deployment](/getting-started/deployment) -- ship to Cloudflare Pages
