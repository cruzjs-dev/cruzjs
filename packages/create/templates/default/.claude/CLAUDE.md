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
| `07-UI.md` | React + Tailwind + Chakra, route files |
| `08-DATA-OWNERSHIP.md` | User-specific vs org-scoped data (CRITICAL) |
| `09-EVENTS-JOBS.md` | Domain events, background jobs, queues |
| `10-PROVIDERS.md` | Feature modules, @Module, extensibility |
| `11-CLOUDFLARE.md` | CloudflareContext, D1/KV/R2, Workers |

## Key Rules

1. **Drizzle only** -- never use Prisma, TypeORM, or raw SQL
2. **Use DI decorators** -- `@Injectable()`, `@Inject(TOKEN)`, `@Module()`
3. **Routes inside features** -- `src/features/<name>/routes/`
4. **Always filter by ownership** -- every query must include `userId` or `orgId` in WHERE
5. **Never instantiate services** -- use `getAppContainer().resolve(Service)`
6. **SQLite types** -- D1 is SQLite; use `sqliteTable`, `text`, `integer`

## Import Aliases

```typescript
// Framework packages (from node_modules)
import { Injectable, Inject, Module } from '@cruzjs/core/di';
import { getAppContainer } from '@cruzjs/core';
import { router, protectedProcedure, orgProcedure } from '@cruzjs/core/trpc/context';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { CloudflareContext } from '@cruzjs/core/shared/cloudflare/context';
import { requirePermission } from '@cruzjs/saas/orgs/auth.utils';

// Local project (from src/)
import { trpc } from '~/trpc/client';
import * as schema from '~/database/schema';
import { MyService } from '~/features/my-feature';
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
