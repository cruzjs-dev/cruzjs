# CruzJS Project

Full-stack TypeScript framework: React Router v7 + Drizzle ORM + tRPC + Inversify DI. Deploys to Cloudflare (D1, KV, R2, Workers AI) and other clouds via runtime adapters.

## ⚠ Mandatory reads (before writing ANY code)

The AI MUST read these. Skipping them produces framework-violating code.

| Before writing... | Read first |
|------------------|-----------|
| **ANY code** | `.cruzjs/knowledgebase/00-COOKBOOK.md` (find your task → linked KB files) |
| **ANY code** | `.cruzjs/knowledgebase/99-ANTI-PATTERNS.md` (explicit don'ts) |
| A service | `.cruzjs/knowledgebase/03-DI-INVERSIFY.md` — services MUST be `@injectable()` |
| A tRPC router | `.cruzjs/knowledgebase/05-TRPC-ROUTERS.md` — use `protectedProcedure`/`orgProcedure` |
| A feature module | `.cruzjs/knowledgebase/11-FRAMEWORK-EXTENSIBILITY.md` — `@Module()` pattern |
| Database access | `.cruzjs/knowledgebase/04-DATABASE-DRIZZLE.md` — inject `DRIZZLE_DB` |
| Auth/permissions | `.cruzjs/knowledgebase/06-AUTH-ORG-SCOPING.md` |
| Routes | `.cruzjs/knowledgebase/01-ARCHITECTURE.md` — `createCruzRoutes()` |
| Background jobs | `.cruzjs/knowledgebase/12-JOBS.md` |
| Events | `.cruzjs/knowledgebase/09-EVENTS.md` |
| UI components | `.cruzjs/knowledgebase/07-UI-PATTERNS.md` |
| Tests | `.cruzjs/knowledgebase/10-TESTING.md` |

## Hard rules

- **NO `as any`** on context, env, or request. If you're casting, you're skipping the framework.
- **NO `routes/api/*.ts`** for app endpoints. Use tRPC. REST routes only for public/unauth endpoints (webhooks, embed widgets, healthchecks).
- **NO plain-class services.** Every service is `@injectable()` and lives in a `@Module()`.
- **NO `fetch('/api/trpc/...')` from loaders.** Use server-side tRPC caller.
- **NO hardcoded user IDs.** Use `ctx.user.id` from `protectedProcedure`.
- **NO `drizzle(env.DB)` in services.** Use `@inject(DRIZZLE_DB)`.
- **NO overriding `entry.server.tsx`** to intercept requests. That's the SSR entry, not the worker handler.

If your code violates any of these, stop and re-read `99-ANTI-PATTERNS.md`.

## Monorepo / package layout

```
packages/
  core/       - @cruzjs/core: DI, auth, tRPC, database, CF bindings
  start/      - @cruzjs/start: UI, theming, orgs, members, permissions, RBAC
  saas/       - @cruzjs/saas: billing, admin, audit
  cli/        - @cruzjs/cli: unified CLI
  ui/         - @cruzjs/ui: 124+ React components
  ai/         - @cruzjs/ai: AI helpers, MCP
  adapter-*/  - runtime adapters (cloudflare, aws, gcp, azure, do, docker)
```

## CLI quick reference

| Command | Description |
|---------|-------------|
| `cruz dev` | Start local dev server |
| `cruz build` | Production build |
| `cruz typecheck` | tsc --noEmit |
| `cruz db generate` | Generate Drizzle migrations |
| `cruz db migrate` | Apply migrations to local D1 |
| `cruz db studio` | Open Drizzle Studio |
| `cruz deploy <env>` | Build + migrate + deploy |
| `cruz new worker <name>` | Scaffold standalone Worker |
| `cruz new workflow <name>` | Scaffold Workflow |

## Workflow when adding a feature

1. Read `.cruzjs/knowledgebase/00-COOKBOOK.md` → find your task
2. Read every KB file the cookbook links
3. Read `.cruzjs/knowledgebase/99-ANTI-PATTERNS.md`
4. Create `src/features/{name}/` with `{name}.module.ts`, `{name}.service.ts`, `{name}.trpc.ts`
5. Register module in `src/app.server.ts` via `registerModules([...])`
6. Use tRPC hooks from the client. No custom REST.

## Knowledge base location

Canonical KB lives at `.cruzjs/knowledgebase/` (harness-neutral). Same files also exist in your AI tool's preferred location (`.claude/kb/`, `.cursor/rules/`, etc.) but `.cruzjs/knowledgebase/` is the source of truth.

To update: `npx @cruzjs/skills update`.
