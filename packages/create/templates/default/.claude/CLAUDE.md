# CruzJS App

Full-stack TypeScript on Cloudflare (Pages + D1 + KV + R2). Built on React Router v7.

## Architecture Docs

Read `.claude/kb/` before making changes:

| File | Topic |
|------|-------|
| `01-ARCHITECTURE.md` | Project structure, feature modules, bootstrap flow |
| `02-CONVENTIONS.md` | TypeScript, React, Zod, error handling |
| `03-DI.md` | Inversify DI: @Injectable, @Module, tokens |
| `04-DATABASE.md` | Drizzle ORM + D1/SQLite schema and queries |
| `05-TRPC.md` | tRPC routers, procedures, permissions |
| `06-AUTH.md` | Auth, sessions, roles, org context |
| `07-UI.md` | React + Tailwind + `@cruzjs/ui` components, route files |
| `08-DATA-OWNERSHIP.md` | User-specific vs org-scoped data (CRITICAL) |
| `09-EVENTS-JOBS.md` | Domain events, background jobs, queues |
| `10-PROVIDERS.md` | Feature modules, @Module, extensibility |
| `11-CLOUDFLARE.md` | CloudflareContext, D1/KV/R2, Workers |

## Bootstrap (how this app boots)

- `src/entry.server.tsx` — SSR entry; imports `./app.server` then re-exports the framework request handler.
- `src/app.server.ts` — calls `DrizzleService.setSchema(schema)` and `registerModules([StartModule, ...])`. **Register new feature modules here.**
- `src/routes.ts` — `createCruzRoutes({ ... })`; add feature/page routes and override framework routes here.
- `src/routes/api/trpc.$.ts` — `createTRPCLoaderHandler()` / `createTRPCActionHandler()`; env-bridging and `waitUntil` are handled by the framework.

There is no `server.cloudflare.ts` and you do not call `createCruzApp()` in this app — that is the adapter-based bootstrap for other runtimes.

## Key Rules

1. **Drizzle only** -- never use Prisma, TypeORM, or raw SQL
2. **Use DI decorators** -- `@Injectable()`, `@Inject(TOKEN)`, `@Module()`
3. **Routes inside features** -- `src/features/<name>/routes/`
4. **Always filter by ownership** -- every query must include `userId` or `orgId` in WHERE
5. **Never instantiate services** -- in a tRPC procedure use `ctx.container.get(Service)`; elsewhere `const c = await getAppContainer(); c.get(Service)`
6. **UI** -- build with Tailwind + `@cruzjs/ui` components; do not author pages in raw Chakra
7. **SQLite types** -- D1 is SQLite; use `sqliteTable`, `text`, `integer`

## Import Aliases

The `@` alias maps to `src/` (see `vite.config.ts`).

```typescript
// Framework packages (from node_modules)
import { Injectable, Inject, Module } from '@cruzjs/core/di';
import { getAppContainer } from '@cruzjs/core';
import { router, protectedProcedure, orgProcedure } from '@cruzjs/core/trpc/context';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { CloudflareContext } from '@cruzjs/core/shared/cloudflare/context';
import { runInBackground } from '@cruzjs/core/background';
import { requirePermission } from '@cruzjs/saas/orgs/auth.utils';

// Local project (from src/) — the '@' alias points at src/
import { trpc } from '@/trpc/client';
import * as schema from '@/database/schema';
import { MyService } from '@/features/my-feature';
```

## CLI Commands

```bash
cruz dev                    # Start local dev server
cruz build                  # Production build
cruz test                   # Run unit tests (vitest)
cruz typecheck              # Type check (tsc --noEmit)
cruz db generate            # Generate Drizzle migrations
cruz db migrate             # Apply migrations to local D1
cruz db migrate --remote    # Apply migrations to remote D1
cruz db studio              # Open Drizzle Studio
cruz db seed                # Seed database
cruz db hard-reset          # Delete local D1 data and re-migrate
cruz deploy <env>           # Deploy (build + migrate + ship)
cruz deploy preview         # Preview deploy from current branch
cruz new worker <name>      # Scaffold standalone Worker
cruz new workflow <name>    # Scaffold durable Workflow
cruz new queue-worker <n>   # Scaffold queue consumer
```

## Docs

https://cruzjs.com
