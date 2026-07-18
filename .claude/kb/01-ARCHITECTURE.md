# Architecture

## Package Structure

CruzJS is organized as a monorepo with layered packages. Cloudflare is the default deployment target, with runtime adapters for AWS, GCP, Azure, DigitalOcean, and Docker:

```
cruzjs/
├── packages/
│   ├── core/              # Framework foundation
│   │   └── src/
│   │       ├── auth/      # Authentication & sessions
│   │       ├── di/        # Dependency injection system
│   │       ├── email/     # Email service + templates
│   │       ├── events/    # Event system base
│   │       ├── framework/ # Bootstrap, providers, registry
│   │       ├── routing/   # React Router middleware
│   │       ├── shared/    # Infrastructure (DB, KV, R2, config)
│   │       ├── trpc/      # tRPC setup & procedures
│   │       └── upload/    # File upload handling
│   │
│   ├── pro/               # Commercial features
│   │   └── src/
│   │       ├── billing/   # Stripe subscriptions
│   │       ├── admin/     # Admin dashboard
│   │       └── orgs/      # Billing page only (non-billing org pages are in start)
│   │
│   ├── start/             # UI components, theming, orgs, permissions, RBAC
│   │   └── src/
│   │       ├── components/
│   │       └── orgs/      # Organizations, members, invitations, permissions, RBAC
│   │                      # (components/, pages/, services, events, hooks)
│   │
│   ├── cli/               # Unified CLI (dev + deploy)
│   ├── create/            # @cruzjs/create — project scaffolding
│   │
│   ├── adapter-cloudflare/  # Edge — Cloudflare Workers/Pages (D1, KV, R2, Workers AI)
│   ├── adapter-aws/         # AWSLambdaAdapter (serverless) + AWSFargateAdapter (container)
│   ├── adapter-gcp/         # GCPCloudRunAdapter + GCPCloudFunctionsAdapter
│   ├── adapter-azure/       # AzureFunctionsAdapter + AzureContainerAppsAdapter
│   ├── adapter-digitalocean/ # DigitalOceanAppPlatformAdapter (container)
│   └── adapter-docker/      # DockerAdapter — self-hosted (PostgreSQL/MySQL, Redis, S3)
│
├── apps/
│   └── web/               # Your application
│       └── src/
│           ├── components/     # App-specific components
│           ├── contexts/       # React contexts
│           ├── database/       # Schema + migrations
│           ├── features/       # Feature modules
│           ├── routes/         # React Router routes
│           └── trpc/           # tRPC client + router composition
│
├── external-processes/    # Standalone Workers, Workflows, Queue consumers
├── tests/                 # Unit and E2E tests
└── cruz.config.ts         # Deployment bindings and env vars
```

## Feature Module Pattern

New features in `apps/web/src/features/` follow this structure:

```
features/<feature-name>/
├── index.ts                    # Barrel exports
├── <feature>.module.ts         # @Module decorator (providers, trpcRouters, pageRoutes)
├── <feature>.routes.ts         # React Router route config (referenced by @Module)
├── <feature>.trpc.ts           # tRPC router
├── <feature>.service.ts        # Business logic (@Injectable)
├── <feature>.schema.ts         # Database schema (Drizzle)
├── <feature>.validation.ts     # Zod schemas
├── <feature>.models.ts         # TypeScript types
├── <feature>.hydrator.ts       # Data hydration (optional)
├── routes/                     # Route page components
│   ├── <feature>._index.tsx
│   └── <feature>.$id.tsx
└── events/                     # Domain events (optional)
    ├── index.ts
    └── <event-name>.event.ts
```

**Example: User Profile Feature**

```
features/user-profile/
├── index.ts
├── user-profile.module.ts      # @Module with providers, trpcRouters, pageRoutes
├── user-profile.routes.ts      # React Router route config
├── user-profile.trpc.ts        # current, get, update, changePassword
├── user-profile.service.ts     # Profile CRUD operations
├── user-profile.schema.ts      # userProfiles table
├── user-profile.hydrator.ts    # Implements IUserHydrator
├── routes/                     # Route page components
│   └── user-profile._index.tsx
└── events/
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Package | `@cruzjs/<name>` | `@cruzjs/core`, `@cruzjs/saas` |
| Feature directory | `kebab-case` | `user-profile`, `billing` |
| Service class | `PascalCase` + `Service` | `UserProfileService` |
| Router | `camelCase` + `Router` | `userProfileRouter` |
| Module class | `PascalCase` + `Module` | `UserProfileModule` |
| Schema table | `camelCase` | `userProfiles`, `orgMembers` |
| Validation | `camelCase` + `Schema` | `updateProfileSchema` |
| Events | `PascalCase` + `Event` | `ProfileUpdatedEvent` |
| Types/Models | `PascalCase` | `ProfileResponse`, `UpdateInput` |

## Import Path Aliases

```typescript
// Package imports (from packages/)
import { ... } from '@cruzjs/core';
import { ... } from '@cruzjs/saas';
import { ... } from '@cruzjs/start';

// App imports (from apps/web/src/)
import { ... } from '@cruzjs/web/features/user-profile';
import { ... } from '@cruzjs/web/trpc/client';
import { ... } from '@cruzjs/web/database/schema';
```

## Bootstrap Flow

```
1. src/entry.server.tsx  →  import './app.server'
   │
   └─ src/app.server.ts
       │
       ├─ DrizzleService.setSchema(schema)
       ├─ registerModules([StartModule, ...feature modules])
       ├─ Create CruzContainer
       ├─ Initialize RuntimeAdapter (Cloudflare, AWS, Docker, etc.)
       ├─ Load Core Modules (Auth, Email, Job, Upload, Shared)
       ├─ Load Start Modules (Org, Members, Permissions, Notifications, SocialAuth, etc.)
       ├─ Load Pro Modules (Billing, Admin, RichText)
       ├─ Load Infrastructure Modules (RateLimit, Scheduler, Search, Session, Audit, etc.)
       ├─ Load Monitoring Modules (ErrorReporting, Tracing)
       ├─ Load App Modules (UserProfile, etc.)
       ├─ Register tRPC Routers
       ├─ Register React Routes
       ├─ Register Event Listeners
       └─ Run Boot Phase (initialization)

2. root.tsx (Client)
   │
   ├─ OrgProvider           # Organization context
   ├─ OrgContextBridge      # Syncs context to tRPC headers
   ├─ trpc.Provider         # tRPC client
   ├─ QueryClientProvider   # React Query cache
   └─ CruzUIProvider         # UI components
```

## Request Flow

```
Browser Request
    │
    ▼
React Router Loader/Action
    │
    ▼
handleCruzLoader / handleCruzAction
    │
    ▼
/api/trpc/* endpoint
    │
    ▼
tRPC Router Procedure
    │
    ├─ publicProcedure       # No auth
    ├─ protectedProcedure    # Requires session
    └─ orgProcedure          # Requires org context
        │
        ▼
    requirePermission()      # Check permissions
        │
        ▼
    Service Class            # Business logic (from DI)
        │
        ▼
    Drizzle Query            # Database operation
        │
        ▼
    Response                 # JSON back to client
```

## Server / Client Boundary in Route Files

React Router v7 route files are shared between the server and client. The `loader` and `action` exports (and their exclusive imports) are stripped from the client bundle by the `@react-router/dev` Vite plugin — so **static top-level imports used only by loaders are safe and preferred**.

### Use static imports in loaders

```typescript
// ✅ CORRECT — static imports, clean and readable
import { handleCruzLoader } from '@cruzjs/core/routing/middleware';
import { SubredditsService } from '@/features/subreddits/subreddits.service';
import { PostsService } from '@/features/posts/posts.service';

export const loader = async (args: LoaderFunctionArgs) =>
  handleCruzLoader([args], async ({ params, container }) => {
    const subredditsService = container.resolve(SubredditsService);
    const postsService = container.resolve(PostsService);
    // ...
  });

// ❌ WRONG — dynamic imports are no longer necessary
export const loader = async (args: LoaderFunctionArgs) => {
  const [{ handleCruzLoader }, { SubredditsService }] = await Promise.all([
    import('@cruzjs/core/routing/middleware'),
    import('@/features/subreddits/subreddits.service'),
  ]);
  // ...
};
```

### How the guard works

`@cruzjs/core/routing/middleware` contains `import 'server-only'` at the top. The `serverOnlyPlugin()` in `vite.config.ts` intercepts this:

- **SSR build** → no-op, module loads normally
- **Client build** → throws a build-time error if the module ever reaches the client bundle

This means if the RR7 tree-shaking ever fails (e.g. due to a barrel export re-exporting both client and server code), you get a loud build error rather than silently shipping server internals to the browser.

### Marking your own modules as server-only

Add `import 'server-only'` to the top of any module that must never run in a browser:

```typescript
// features/my-feature/my-feature.service.ts
import 'server-only';

@injectable()
export class MyFeatureService { ... }
```

## Runtime Adapters

CruzJS is provider-agnostic through the `RuntimeAdapter` interface (see `packages/core/src/runtime/types.ts`). Each adapter package maps the framework's binding interfaces to a specific cloud provider:

```
packages/
├── adapter-cloudflare/    # Edge — Cloudflare Workers/Pages (D1, KV, R2, Workers AI)
├── adapter-aws/           # AWSLambdaAdapter (serverless) + AWSFargateAdapter (container)
├── adapter-gcp/           # GCPCloudRunAdapter (container) + GCPCloudFunctionsAdapter (serverless)
├── adapter-azure/         # AzureFunctionsAdapter (serverless) + AzureContainerAppsAdapter (container)
├── adapter-digitalocean/  # DigitalOceanAppPlatformAdapter (container)
└── adapter-docker/        # DockerAdapter — self-hosted with PostgreSQL/MySQL, Redis, S3-compatible storage
```

The adapter is passed to `createCruzApp()` and is optional (defaults to Cloudflare behavior). It provides implementations for `CacheBinding`, `QueueBinding`, `AIBinding`, and `StorageBucket`, plus optional bindings for rate limiting, scheduling, broadcasting, search, sessions, logging, tracing, error reporting, audit logging, two-factor auth, and multi-database support.

Each adapter package has a `bindings/` directory with provider-specific implementations (e.g. `audit.ts`, `broadcast.ts`, `rate-limit.ts`, `search.ts`, `sessions.ts`, `tracing.ts`, etc.). Cloudflare uses KV for rate limiting, sessions, broadcast presence, and scheduler locking; D1/FTS5 for search; and `KVSSEBackend` for SSE delivery. Non-Cloudflare adapters provide equivalent implementations using Redis, in-memory stores, or managed services.

Runtime types affect `waitUntil()` behavior:
- **edge** — delegates to Cloudflare `ExecutionContext`
- **serverless** — collects promises, flushed via `adapter.flushPendingWork()` before response
- **container** — fire-and-forget (long-lived process)

See `15-RUNTIME-ADAPTERS.md` for full interface details and usage examples.

## Key Files

| File | Purpose |
|------|---------|
| `packages/core/src/framework/application.server.ts` | Bootstrap & container management |
| `packages/core/src/di/` | DI system (@Module, @Injectable, etc.) |
| `packages/core/src/trpc/context.ts` | tRPC procedures & context |
| `packages/core/src/trpc/handler.ts` | tRPC request handling |
| `apps/web/src/entry.server.tsx` | SSR entry point |
| `apps/web/src/root.tsx` | Root component with providers |
| `apps/web/src/routes.ts` | Route definitions |
| `apps/web/src/trpc/router.ts` | Combined AppRouter |
| `apps/web/src/database/schema.ts` | Database schema exports |
