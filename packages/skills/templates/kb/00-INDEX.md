# CruzJS Knowledge Base

This is the **single source of truth** for building CruzJS apps. AI systems must reference these docs when implementing features.

## Architecture Overview

CruzJS is a **modular monorepo** full-stack framework for Cloudflare Pages + D1 + KV + R2, built on React Router v7:

```
packages/
├── core/          # Framework foundation (auth, DI, tRPC, database, CF bindings)
├── pro/           # Commercial features (billing, admin, audit logging)
├── start/         # UI components, theming, orgs, members, permissions, RBAC
└── cli/           # Unified CLI (dev + deploy)

apps/
└── web/           # Your application (routes, features, providers)

external-processes/
└── <name>/        # Standalone Workers, Workflows, Queue consumers
```

## Quick Reference

| I want to... | Read this |
|--------------|-----------|
| Understand the architecture | `01-ARCHITECTURE.md` |
| Write TypeScript/React code | `02-TYPESCRIPT.md` |
| Create services with DI | `03-DI-INVERSIFY.md` |
| Work with the database | `04-DATABASE-DRIZZLE.md` |
| Build API endpoints | `05-TRPC-ROUTERS.md` |
| Handle auth/permissions | `06-AUTH-ORG-SCOPING.md` |
| Build UI components | `07-UI-PATTERNS.md` |
| Understand data ownership | `08-DATA-OWNERSHIP.md` (CRITICAL) |
| Emit/listen to events | `09-EVENTS.md` |
| Write tests | `10-TESTING.md` |
| Extend the framework | `11-FRAMEWORK-EXTENSIBILITY.md` |
| Create background jobs | `12-JOBS.md` |
| Deploy the application | `13-DEPLOYMENT.md` |
| Get started quickly | `14-QUICK-START.md` |
| Use runtime adapters (CF, AWS, Docker) | `15-RUNTIME-ADAPTERS.md` |
| Set up OAuth social login | `16-SOCIAL-AUTH.md` |
| Send push/SMS/webhook notifications | `17-NOTIFICATIONS.md` |
| Build CRUD resources (factory vs manual) | `18-CRUD.md` |
| Logging (Pino, LogContext, redaction, transports) | `19-LOGGING.md` |
| Advanced cache (remember, tagged invalidation) | `20-CACHE-ADVANCED.md` |
| Flash messages (cookie-based one-time messages) | `21-FLASH-MESSAGES.md` |
| Signed URLs (HMAC-SHA256 tamper-proof links) | `22-SIGNED-URLS.md` |
| Idempotency keys (prevent duplicate mutations) | `23-IDEMPOTENCY.md` |
| Object-level policies (per-record authorization) | `24-POLICIES.md` |
| Export & Import (CSV/Excel export, CSV import) | `25-EXPORT-IMPORT.md` |
| Encrypted columns (AES-256-GCM field encryption) | `26-ENCRYPTED-COLUMNS.md` |
| Database factories (test/seed data generation) | `27-FACTORIES.md` |

## Package Imports

```typescript
// Core framework
import { createCruzApp, getAppContainer } from '@cruzjs/core';
import { router, protectedProcedure, orgProcedure } from '@cruzjs/core';
import { DRIZZLE, DrizzleDatabase, AppEvent, EventEmitterService, Module } from '@cruzjs/core';

// Org features (from start)
import { OrgService, MemberService } from '@cruzjs/start/orgs';

// Pro features
import { BillingService } from '@cruzjs/saas';

// UI components
import { StatCard, SectionCard, PageHeader, ConfirmModal } from '@cruzjs/start';

// Runtime adapters
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';
import { DockerAdapter } from '@cruzjs/adapter-docker';

// Social auth
import { SocialAuthModule, OAUTH_PROVIDER, GitHubProvider, GoogleProvider } from '@cruzjs/start/social-auth';

// Core modules (examples)
import { TwoFactorModule } from '@cruzjs/core/two-factor';
import { FeatureFlagModule } from '@cruzjs/core/feature-flags';
import { AuditModule } from '@cruzjs/core/audit';
import { SearchModule } from '@cruzjs/core/search';
import { RateLimitModule } from '@cruzjs/core/rate-limiting';
import { SessionModule } from '@cruzjs/core/sessions';

// Monitoring
import { ErrorReportingModule } from '@cruzjs/monitor/error-reporting';
import { TracingModule } from '@cruzjs/monitor/tracing';

// App features (your code)
import { userProfileTrpc } from '@cruzjs/web/features/user-profile';
```

## Dev Server Management

The dev server runs on **port 5000** (`http://localhost:5000`).

### Start / Stop
```bash
cruz dev             # Start local dev server (background)
cruz dev stop        # Stop dev server
```

### When to restart
**Always restart after:**
- Adding or modifying entries in `routes.ts` (React Router v7 builds a route manifest at startup -- HMR does not update it)
- Changing `vite.config.ts`

## Critical Rules

1. **Never use Prisma** - This codebase uses **Drizzle ORM only**
2. **Always scope data** - Filter by `orgId` or `userId` (see `08-DATA-OWNERSHIP.md`)
3. **Use DI containers** - Services must be `@injectable()` and registered
4. **Extend via modules** - Use `@Module` and pass to `createCruzApp({ modules: [...] })`
5. **Routes use default exports** - All route files export default
6. **Everything else uses named exports** - Services, components, types
