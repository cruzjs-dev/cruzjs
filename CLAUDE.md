# CruzJS

Full-stack framework for Cloudflare Pages + D1 + KV + R2, built on React Router v7.

## Monorepo Structure

```
packages/
  core/       - @cruzjs/core: framework runtime (DI, auth, tRPC, database, CF bindings)
  start/      - @cruzjs/start: UI components, theming, orgs, members, permissions, RBAC
  pro/        - @cruzjs/saas: billing, admin, audit logging
  cli/        - @cruzjs/cli: unified CLI (dev + deploy)
  create/     - @cruzjs/create: project scaffolding (npm create @cruzjs)
  adapter-cloudflare/ - @cruzjs/adapter-cloudflare: Cloudflare Workers/Pages runtime adapter
  adapter-aws/        - @cruzjs/adapter-aws: AWS Lambda + Fargate runtime adapters
  adapter-gcp/        - @cruzjs/adapter-gcp: Google Cloud Run + Functions runtime adapters
  adapter-azure/      - @cruzjs/adapter-azure: Azure Functions + Container Apps runtime adapters
  adapter-digitalocean/ - @cruzjs/adapter-digitalocean: DigitalOcean App Platform runtime adapter
  adapter-docker/     - @cruzjs/adapter-docker: Docker / self-hosted runtime adapter
apps/
  demo/       - reference/demo app (uses all packages)
external-processes/
  <name>/     - standalone Workers, Workflows, Queue consumers (scaffolded via `cruz new`)
```

## CLI Reference (`cruz` / `npx tsx packages/cli/src/index.tsx`)

### Development
| Command | Description |
|---------|-------------|
| `cruz dev` | Start local dev server (background) |
| `cruz dev stop` | Stop dev server |
| `cruz build` | Production build |
| `cruz start` | Start production server |
| `cruz test` | Run unit tests (vitest) |
| `cruz test --ui` | Vitest UI mode |
| `cruz test:e2e` | Run E2E tests (playwright) |
| `cruz typecheck` | Type check (tsc --noEmit) |

### Database
| Command | Description |
|---------|-------------|
| `cruz db generate` | Generate drizzle migrations |
| `cruz db migrate` | Apply migrations to local D1 |
| `cruz db migrate --remote` | Apply migrations to remote D1 |
| `cruz db query "SQL"` | Execute SQL against local D1 |
| `cruz db query "SQL" --remote` | Execute SQL against remote D1 |
| `cruz db studio` | Open Drizzle Studio |
| `cruz db seed` | Seed database |
| `cruz db hard-reset` | Delete local D1 data and re-migrate |

### Scaffold
| Command | Description |
|---------|-------------|
| `cruz new worker <name>` | Create standalone Cloudflare Worker |
| `cruz new workflow <name>` | Create Workflow (durable, retryable steps) |
| `cruz new queue-worker <name> --queue <q>` | Create queue consumer Worker |

Scaffolded apps go in `external-processes/<name>/` with their own `wrangler.toml`. They auto-deploy with `cruz deploy`.

### Deploy & Infrastructure
| Command | Description |
|---------|-------------|
| `cruz init <env>` | Initialize environment (creates D1/KV/R2 resources) |
| `cruz deploy <env>` | Deploy (build + migrate + ship) |
| `cruz deploy preview` | Preview deploy from current branch |
| `cruz status` | Show all environments |
| `cruz destroy <env>` | Tear down environment |
| `cruz queue create/list/delete` | Queue management |
| `cruz secrets set/list` | Secret management |
| `cruz kv create/list` | KV namespace operations |
| `cruz r2 create/list` | R2 bucket operations |

## Key Architectural Patterns

- **DI**: Inversify containers, `@injectable()` services, `ContainerModule` per feature
- **Database**: Drizzle ORM + D1 (prod) / SQLite (local), schema in `apps/demo/src/database/schema.ts`
- **API**: tRPC routers, `protectedProcedure` (user) or `orgProcedure` (org-scoped)
- **Config**: `apps/demo/cruz.config.ts` defines deployment bindings and env vars
- **CF Bindings**: `CloudflareContext` provides D1/KV/R2/AI with automatic local facades
- **Feature modules**: `@Module` pattern with `createCruzApp({ modules: [...] })` — see `.claude/kb/` for deep dives

## Knowledge Base

Detailed architecture docs live in `.claude/kb/`. Read them before making changes to the relevant area:

| File | Topic |
|------|-------|
| `01-ARCHITECTURE.md` | Folder structure, domain boundaries |
| `02-TYPESCRIPT.md` | TS + React conventions |
| `03-DI-INVERSIFY.md` | Dependency injection |
| `04-DATABASE-DRIZZLE.md` | Database patterns |
| `05-TRPC-ROUTERS.md` | API endpoints |
| `06-AUTH-ORG-SCOPING.md` | Auth, permissions, org context |
| `07-UI-PATTERNS.md` | UI components |
| `08-DATA-OWNERSHIP.md` | User-specific vs org-scoped data |
| `09-EVENTS.md` | Domain events |
| `10-TESTING.md` | Test coverage |
| `11-FRAMEWORK-EXTENSIBILITY.md` | Modules & extensibility |
| `12-JOBS.md` | Background jobs |
| `13-DEPLOYMENT.md` | Cloudflare deployment |
| `14-QUICK-START.md` | Getting started |
| `15-RUNTIME-ADAPTERS.md` | Provider-agnostic runtime adapters |
