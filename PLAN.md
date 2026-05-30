# CruzJS Framework Packaging Plan

Restructure the Aurora monorepo into publishable `@cruzjs/*` npm packages.

**Target packages:**
- `@cruzjs/core` — DI, auth, sessions, events, jobs, email, config, database, storage, tRPC, Cloudflare bindings
- `@cruzjs/start` — User profiles, API keys, dashboard, notifications, real-time, integrations, AI connections
- `@cruzjs/saas` — Stripe billing, org management, members, invitations, permissions, audit, admin
- `@cruzjs/ui` — Reusable React components
- `@cruzjs/cli` — Dev CLI (dev server, build, migrate, test)
- `@cruzjs/deploy` — Cloudflare deployment CLI
- `create-cruz-app` — Project scaffolding

**Dependency graph:**
```
@cruzjs/core          (no @cruz deps)
  ├── @cruzjs/saas     (depends on core)
  ├── @cruzjs/start   (depends on core + pro)
  └── @cruzjs/ui      (depends on pro for OrgRole type)
```

---

## Phase 1: Remove Dead Schema & Code ✅

Clean out deleted-feature artifacts before moving anything.

- [x] **1.1** Remove deleted-feature tables from `apps/web/src/database/schema.ts`
- [x] **1.2** Remove stale components: `components/project/ProjectSwitcher.tsx`, `components/project/ProjectTabs.tsx`
- [x] **1.3** Clean Navbar.tsx — remove any project/agent switcher references
- [x] **1.4** Verify `routes.ts` only references existing route files; remove any stale route files
- [x] **1.5** Delete old migrations
- [x] **1.6** Generate fresh baseline migration from clean schema
- [x] **1.7** Verify app builds cleanly

---

## Phase 2: Schema Ownership — Break Circular Dependency ✅

- [x] **2.1** Create `packages/core/src/database/schema.ts` with core tables
- [x] **2.2** Update all `packages/core/src/**` imports
- [x] **2.3** Create `packages/saas/src/database/schema.ts` with pro tables
- [x] **2.4** Update all `packages/saas/src/**` imports
- [x] **2.5** Update `packages/ui/src/components/types.ts`
- [x] **2.6** Update `packages/saas/src/index.ts` exports
- [x] **2.7** Update `packages/saas/src/orgs/utils.client.ts`
- [x] **2.8** Update `apps/web/src/database/schema.ts` to re-export
- [x] **2.9** Verify no circular imports remain
- [x] **2.10** Verify app builds cleanly

---

## Phase 3: Rename `@aurora/*` → `@cruzjs/*` ✅

- [x] **3.1-3.19** All rename tasks completed. 612 import paths updated, AuroraContainer → CruzContainer, packages/aurora-cli → packages/cli, .aurora/ → .cruz/

---

## Phase 4: Extract `@cruzjs/start` ✅

- [x] **4.1** Created `packages/start/package.json`
- [x] **4.2** Created `packages/start/src/database/schema.ts` with all START tables
- [x] **4.3-4.9** Moved backend files for all 7 features (user-profile, api-keys, dashboard, notifications, real-time, integrations, ai-connections)
- [x] **4.10** Created `packages/start/src/index.ts` barrel
- [x] **4.11** Created `StartProvider` composite service provider
- [x] **4.12** Updated `apps/web/src/database/schema.ts` to re-export from `@cruzjs/start`
- [x] **4.13** Updated `apps/web/src/trpc/router.ts` to import from `@cruzjs/start`
- [x] **4.14** Updated `apps/web/src/setup.server.ts` to use `StartProvider`
- [x] **4.15** Updated all import paths in moved files
- [x] **4.16** Added `@cruzjs/start` to tsconfig paths and vite aliases
- [x] **4.17** UI components remain in `apps/web/src/features/*/components/`, barrel files re-export from `@cruzjs/start`
- [x] **4.18** Type check passes (0 new errors)

---

## Phase 5: Make Packages Publishable ✅

- [x] **5.1** Added npm workspaces to root `package.json`
- [x] **5.2** Created `@cruzjs/core` package.json with exports, peer deps, deps
- [x] **5.3** Created `@cruzjs/saas` package.json
- [x] **5.4** Created `@cruzjs/start` package.json
- [x] **5.5** Created `@cruzjs/ui` package.json
- [x] **5.6** Updated `@cruzjs/cli` package.json with exports
- [x] **5.7** Updated `@cruzjs/deploy` package.json with exports
- [x] **5.10** Added `tsconfig.json` to each package with composite + declaration
- [x] **5.13** Added `"files"` to each package.json
- [x] **5.14** `npm install` resolves all workspace packages correctly
- [x] **5.15** Type check passes

**Note:** Tasks 5.8-5.9 (move deps from root to packages) and 5.11-5.12 (project references, tsup build) are deferred — the monorepo works with path aliases for now. Build pipeline can be added when packages are actually published to npm.

---

## Phase 6: `create-cruz-app` Scaffold ✅

- [x] **6.1** Created `packages/create-cruz-app/package.json` with bin entry
- [x] **6.2** Implemented CLI with `--with-pro` and `--core-only` flags
- [x] **6.3** Created default template (tsconfig, vite.config, wrangler.toml, react-router.config, root.tsx, routes.ts, entry.server.tsx)
- [x] **6.4** Template `setup.server.ts` wires up providers based on flags
- [x] **6.5** Template `schema.ts` re-exports from selected packages
- [x] **6.6** Tested: generates correct project structure

---

## Phase 7: Documentation & Publishing ✅

- [x] **7.1** `packages/core/README.md`
- [x] **7.2** `packages/saas/README.md`
- [x] **7.3** `packages/start/README.md`
- [x] **7.4** `packages/ui/README.md`
- [x] **7.5** `packages/cli/README.md`
- [x] **7.6** `packages/deploy-cli/README.md`
- [x] **7.7** Root `README.md`
- [x] **7.8** Installed `@changesets/cli`
- [x] **7.9** Added `changeset`, `version`, `release` scripts
- [x] **7.10** Configured `.changeset/config.json` with linked packages
- [x] **7.11** Final type check: 0 new errors (only 2 pre-existing oauth-providers.ts errors)

---

---

## Phase 22: `@cruzjs/ai` — Provider-Agnostic AI with MCP Bridge & tRPC Streaming

**Goal:** One package that beats Vercel AI SDK by being type-safe end-to-end (tRPC), DI-native, org-scoped, and MCP-aware.

**Current state:**
- `packages/core/src/ai/` — basic `AIService` (Cloudflare Gateway only, no streaming, no tool-calling, no provider abstraction)
- `packages/mcp/` — full MCP: `@McpTool`, `@McpResource`, `@McpPrompt`, registry, SSE + streamable-HTTP transports

**Target API:**
```typescript
// Simple chat
const ai = container.resolve(AIService);
const text = await ai.chat({ prompt: 'Hello', size: 'medium' });

// Streaming through tRPC subscription → React
const { text, isStreaming } = useStream(trpc.ai.chat.useSubscription({ prompt }));

// Org-scoped (resolves encrypted key + model for org)
const orgAI = await ai.forOrg(orgId);
const result = await orgAI.chat({ prompt });

// MCP tools automatically available as AI tools
@McpTool({ name: 'search_posts', parameters: searchSchema })
async searchPosts(args: SearchInput) { ... }

// AI can call this tool
await ai.chat({ prompt, tools: 'mcp' }); // auto-wires all @McpTool methods
```

### Sub-phase A: Package Scaffold & Provider Interface

- [ ] **22.A.1** Create `packages/ai/` with `package.json` (`@cruzjs/ai`), `tsconfig.json`, `src/index.ts`
- [ ] **22.A.2** Define `IAIProvider` interface (`src/providers/provider.interface.ts`): `chat()`, `stream()`, `embed()`, `complete()` — all return typed responses; `stream()` returns `AsyncIterable<StreamChunk>`
- [ ] **22.A.3** Define shared types: `StreamChunk`, `Message`, `ToolCall`, `ToolResult`, `ModelOptions`, `AIResponse`
- [ ] **22.A.4** Move `packages/core/src/ai/` → `packages/ai/src/core/` — update all imports in `packages/core`; re-export `AIService` from `@cruzjs/core` for backwards compat

### Sub-phase B: Provider Adapters

Each adapter in `packages/ai/src/providers/<name>/`.

- [ ] **22.B.1** `CloudflareGatewayProvider` — wraps existing `callGateway()` logic; adds streaming via `ReadableStream` → `AsyncIterable`
- [ ] **22.B.2** `AnthropicProvider` — `@anthropic-ai/sdk`; maps to `IAIProvider`; supports streaming + tool_use blocks
- [ ] **22.B.3** `OpenAIProvider` — `openai` SDK; maps to `IAIProvider`; supports streaming + function_call / tool_calls
- [ ] **22.B.4** `GoogleProvider` — `@google/generative-ai`; maps streaming + function declarations
- [ ] **22.B.5** `OpenRouterProvider` — OpenAI-compat endpoint; route to any model; pass-through streaming
- [ ] **22.B.6** `BedrockProvider` — `@aws-sdk/client-bedrock-runtime`; converse API + stream
- [ ] **22.B.7** `VertexProvider` — `@google-cloud/vertexai`; Gemini via Vertex
- [ ] **22.B.8** `AIProviderRegistry` service — register providers by name; resolve by `CRUZJS_AI_PROVIDER` env or per-call override
- [ ] **22.B.9** Unit tests: each provider adapter (mock HTTP); stream produces correct chunks; tool call round-trip

### Sub-phase C: Streaming via tRPC Subscriptions

- [ ] **22.C.1** Create `AITrpc` router (`src/ai.trpc.ts`) with: `chat` (mutation), `stream` (subscription returning `AsyncIterable<{chunk: string, done: boolean}>`), `embed` (mutation), `tools.list` (query)
- [ ] **22.C.2** Implement `stream` subscription — call provider `stream()`, yield each `StreamChunk` through tRPC observable; mark `done: true` on finish
- [ ] **22.C.3** Update tRPC transport in `packages/core/src/trpc/` to support subscriptions over SSE (already in place for MCP; verify wired for general tRPC)
- [ ] **22.C.4** Create `useStream(subscription): { text, isStreaming, error }` React hook in `packages/ai/src/hooks/use-stream.ts` — accumulates chunks, tracks streaming state
- [ ] **22.C.5** Create `useChat(options): { messages, send, isStreaming, reset }` hook — multi-turn chat state on top of `useStream`
- [ ] **22.C.6** Unit tests: subscription emits chunks in order, hook accumulates correctly, error chunk sets error state

### Sub-phase D: MCP Bridge — `@McpTool` as AI Tool Calls

- [ ] **22.D.1** Create `McpAIBridge` service (`src/mcp-bridge.ts`) — reads `McpRegistry`, converts `ToolDef` → provider-specific tool schema (Anthropic `tools[]`, OpenAI `functions[]`, Google `functionDeclarations[]`)
- [ ] **22.D.2** Add `tools: 'mcp' | ToolDef[] | 'none'` option to `IAIProvider.chat()` and `stream()`
- [ ] **22.D.3** Implement tool call loop: provider returns `tool_use` → bridge dispatches to `McpRegistry` executor → appends `tool_result` → continues generation
- [ ] **22.D.4** Add `maxToolRounds` option (default: 5) to prevent infinite loops
- [ ] **22.D.5** Unit tests: provider returns tool_use → bridge calls executor → result appended → final text returned; max rounds respected

### Sub-phase E: Org-Scoped Keys (`forOrg()`)

- [ ] **22.E.1** DB schema in `packages/ai/src/database/schema.ts`: `orgAiConfigs` table — `orgId`, `provider`, `encryptedApiKey`, `defaultModel`, `enabled`
- [ ] **22.E.2** `OrgAIConfigService` — CRUD for org AI configs; encrypt/decrypt keys via `@cruzjs/core/shared/encryption`
- [ ] **22.E.3** `AIService.forOrg(orgId): Promise<OrgScopedAI>` — resolves config, decrypts key, returns provider instance bound to org's key + model
- [ ] **22.E.4** `orgAi` tRPC procedure type in `AITrpc` — uses `orgProcedure`, auto-calls `forOrg(ctx.org.orgId)`
- [ ] **22.E.5** Admin UI tRPC: `ai.config.get`, `ai.config.set`, `ai.config.test` (send test prompt)
- [ ] **22.E.6** Unit tests: `forOrg()` decrypts key correctly, unknown org returns null, disabled org throws

### Sub-phase F: Middleware, Cost Tracking & React Hooks Export

- [ ] **22.F.1** `AIUsageMiddleware` — intercept all AI calls, log: `orgId`, `provider`, `model`, `inputTokens`, `outputTokens`, `durationMs`, `cost`
- [ ] **22.F.2** `ai.usage.summary` tRPC query — aggregate usage by org + model + date range
- [ ] **22.F.3** Rate limit AI calls per org: `AIRateLimiter` using existing rate-limiting module; configurable per-org limit
- [ ] **22.F.4** Export React hooks from `packages/ai/src/hooks/index.ts`: `useStream`, `useChat`, `useEmbed`, `useAIConfig`
- [ ] **22.F.5** Add `AIModule` to `packages/ai/src/ai.module.ts` — registers all services; import in app via `createCruzApp({ modules: [AIModule, ...] })`
- [ ] **22.F.6** Update docs: `apps/docs/src/content/docs/advanced/ai.md` — full rewrite covering providers, streaming, MCP tools, org keys, hooks
- [ ] **22.F.7** Add tutorial chapter `apps/docs/src/content/docs/tutorial/11-ai.md` — build a streaming chat feature end-to-end
- [ ] **22.F.8** Unit tests: usage middleware records calls, rate limiter blocks org over limit, cost calculation correct per provider

### Testing
- E2E: `tests/e2e/tests/ai.spec.ts` — chat endpoint returns text, stream endpoint yields chunks, MCP tool called via AI, org-scoped key used

---

## Known Issues / Future Work (resolved in Phase 8+)

1. **Core ↔ Pro circular dependency**: `@cruzjs/core` imports from `@cruzjs/saas` (org middleware, audit middleware, auth router references to MemberService/OrgService). Resolved in Phase 8.

2. **Build pipeline**: Packages don't have a tsup/unbuild build step yet. Resolved in Phase 8.

3. **Root dependency splitting**: Many deps are still in the root `package.json`. Resolved in Phase 8.

---

## Existing Feature Inventory

Many features the framework needs already exist in packages but lack tests, documentation, or DX polish. Before building new things, we verify what's there.

| Feature | Package | Status |
|---------|---------|--------|
| Health checks | `@cruzjs/core/health` | ✅ Exists — needs tests + E2E |
| Rate limiting | `@cruzjs/core/rate-limiting` | ✅ Exists — needs tests + E2E |
| Soft deletes | `@cruzjs/core/soft-delete` | ✅ Exists — needs tests |
| Broadcasting | `@cruzjs/core/broadcasting` | ✅ Exists — needs tests + E2E |
| Email (react-email) | `@cruzjs/core/email` | ✅ Exists — needs tests |
| Email verification | `@cruzjs/core/auth/pages` | ✅ VerifyEmailPage exists |
| Password reset | `@cruzjs/core/auth/pages` | ✅ ForgotPasswordPage + ResetPasswordPage exist |
| 2FA | `@cruzjs/core/two-factor` | ✅ Exists — needs tests + E2E |
| Notifications | `@cruzjs/start/notifications` | ✅ Exists — needs tests |
| Jobs | `@cruzjs/core/jobs` | ✅ Exists — needs tests + E2E |
| Scheduler | `@cruzjs/core/scheduler` | ✅ Exists — needs tests + E2E |
| Maintenance mode | `@cruzjs/core/maintenance` | ✅ Exists — needs E2E |
| Cache abstraction | `@cruzjs/core/shared/cache` | ✅ Exists — needs `cache.remember()` + tests |
| Search (FTS5) | `@cruzjs/core/search` | ✅ Exists — needs tests + E2E |
| Feature flags | `@cruzjs/core/feature-flags` | ✅ Exists — needs tests |
| Model factories | `@cruzjs/core/database/factories` | ✅ Exists — needs tests |
| DB seeding | `@cruzjs/core/database/seeding` | ✅ Exists — needs tests |
| File uploads | `@cruzjs/core/upload` | ✅ Exists — needs presigned URL DX |
| Magic links | `@cruzjs/core/magic-link` | ✅ Exists |
| Policies/RBAC | `@cruzjs/core/policies` | ✅ Exists |
| Pagination | `@cruzjs/core/pagination` | ✅ Exists |
| Webhooks | `@cruzjs/core/webhooks` | ✅ Exists |
| i18n | `@cruzjs/core/i18n` | ✅ Exists |
| API resources | `@cruzjs/core/resources` | ✅ Exists |
| API versioning | `@cruzjs/core/versioning` | ✅ Exists |
| Testing utilities | `@cruzjs/core/testing` | ✅ Exists — needs assertion helpers |
| CRUD generator | `packages/cli/commands/new-feature.tsx` | ✅ Exists — needs field-type args |
| Interactive console | `packages/cli/commands/console.command.ts` | ✅ Exists — needs polish |
| **`cruz routes`** | — | ❌ Missing |
| **Error DX** | — | ❌ Basic only — needs beautiful pages |
| **Model observers** | — | ❌ Missing |
| **Image processing** | — | ❌ Missing |
| **PDF generation** | — | ❌ Missing |
| **N+1 detection** | — | ❌ Missing |
| **Tutorial** | — | ❌ Missing |

---

## Phase 8: Build Pipeline & Circular Dependency Audit

Goal: packages can be built independently and published to npm.

- [ ] **8.1** Grep all runtime (non-comment) cross-package imports in `packages/core/src` — document every actual violation
- [ ] **8.2** For each violation: extract the referenced type/interface into `@cruzjs/core/di` or `@cruzjs/core/shared` so downstream packages can fulfill the interface instead of importing a concrete class
- [ ] **8.3** Install `tsup` as a root dev dep; add `build.ts` config for each package (`core`, `start`, `saas`, `ui`, `cli`)
- [ ] **8.4** Add `"build"` script to each package.json: `tsup src/index.ts --format esm,cjs --dts --clean`
- [ ] **8.5** Add `"build:all"` to root package.json that builds packages in dependency order: `core → saas → start → ui → cli`
- [ ] **8.6** Move critical runtime deps from root `package.json` into the owning package (`inversify` → core, `stripe` → saas, etc.)
- [ ] **8.7** Verify `npm run build:all` succeeds with zero type errors
- [ ] **8.8** Playwright E2E: run `create-cruz-app` scaffolder, verify generated project typechecks clean

---

## Phase 9: `cruz generate` — Field-Type Aware Scaffolding

Goal: `cruz g feature posts title:string body:text published:boolean` produces a fully typed, runnable feature.

Builds on the existing `new-feature.tsx` generator which already scaffolds modules, services, tRPC, validation, and routes.

- [ ] **9.1** Add `cruz g` as alias for `cruz new` in `packages/cli/src/index.tsx`
- [ ] **9.2** Add `--fields` flag to `new-feature` command: `cruz g feature posts --fields "title:string body:text published:boolean"`
- [ ] **9.3** Build field type mapper: `string→text`, `number/int→integer`, `float→real`, `boolean→integer(mode:'boolean')`, `date/datetime→integer(mode:'timestamp_ms')`, `json→text(mode:'json')`, `uuid→text`
- [ ] **9.4** Update `schemaTemplate()` to use field definitions instead of hardcoded `name` + `description` columns
- [ ] **9.5** Update `validationTemplate()` to generate correct Zod types per field
- [ ] **9.6** Update `modelsTemplate()` and `routePageTemplate()` to reference generated fields
- [ ] **9.7** Add `cruz g model <name> [field:type...]` — schema-only generator (no service/trpc/routes)
- [ ] **9.8** Add `cruz g migration <name>` — thin wrapper: runs `cruz db generate` with the given name
- [ ] **9.9** Update `new-feature.tsx` display to show generated fields in success output
- [ ] **9.10** E2E test (`tests/e2e/tests/generators.spec.ts`): run `cruz g feature posts title:string body:text`, assert all files exist with correct content, run `cruz typecheck`, assert 0 errors

---

## Phase 10: `cruz routes` — Route Inspector

Goal: `cruz routes` prints every registered tRPC procedure and React Router page route, like `rails routes` or `artisan route:list`.

- [ ] **10.1** Create `packages/cli/src/commands/routes.command.ts` — loads the app server entry, extracts RouteRegistry data via `getOrBuildContainer()`
- [ ] **10.2** Collect tRPC routers from `RouteRegistry.getTRPCRouters()` — recursively walk each router's procedure map to list `router.procedure` + type (`query`/`mutation`/`subscription`) + auth level (public/protected/org)
- [ ] **10.3** Collect React Router page routes from `RouteRegistry.getRoutes()` — print path + component file
- [ ] **10.4** Format as aligned table with columns: `METHOD | PATH | AUTH | HANDLER`
- [ ] **10.5** Add `--json` flag: output raw JSON (useful for tooling, IDE plugins)
- [ ] **10.6** Add `--filter <pattern>` flag: filter routes by name substring
- [ ] **10.7** Wire `routes` command in `packages/cli/src/index.tsx`
- [ ] **10.8** E2E test (`tests/e2e/tests/routes.spec.ts`): run `cruz routes` in `apps/web`, assert output contains known procedures (`auth.login`, `auth.register`, `userProfile.current`)

---

## Phase 11: Error DX — Beautiful Error Pages

Goal: dev errors look like Laravel Ignition; prod errors are clean and styled.

- [ ] **11.1** Create `packages/core/src/framework/components/DevErrorPage.tsx` — full-page error display with: exception class + message, stack trace with file:line links, request URL + method, tRPC procedure name (if applicable), React component tree (if render error)
- [ ] **11.2** Create `packages/core/src/framework/components/ProdErrorPage.tsx` — minimal styled 500 page, no stack traces, support for `SUPPORT_EMAIL` env var
- [ ] **11.3** Create `packages/core/src/framework/components/NotFoundPage.tsx` — styled 404 with back-link and home-link
- [ ] **11.4** Update `packages/core/src/framework/entry-handler.server.tsx` — catch render errors and return `DevErrorPage` (dev) or `ProdErrorPage` (prod) instead of bare HTML
- [ ] **11.5** Add error boundary to `apps/web/src/root.tsx` — catch client-side React errors, render `DevErrorPage` in dev or `ProdErrorPage` in prod
- [ ] **11.6** Update tRPC error formatter in `packages/core/src/trpc/` — structured error responses with `code`, `message`, `path`, `cause` (dev only)
- [ ] **11.7** Add `ErrorOverlay` React component for client-side runtime errors (dev only) — shows above the app without full-page navigation
- [ ] **11.8** Define `IErrorReporter` interface + Sentry adapter (`@sentry/cloudflare` for edge, `@sentry/node` for Docker) + generic webhook adapter; wire into tRPC handler and SSR entry
- [ ] **11.9** E2E test (`tests/e2e/tests/error-pages.spec.ts`): navigate to unknown route → assert 404 page; trigger tRPC error → assert structured error JSON; verify no raw HTML error strings

---

## Phase 12: `cruz console` Polish

The console already exists (`packages/cli/src/commands/console.command.ts`) with DB, container, schema, and service proxy. This phase improves DX and coverage.

- [ ] **12.1** Add `.tables` REPL command — query `sqlite_master` and print all tables with row counts
- [ ] **12.2** Add `.describe <table>` REPL command — show column names + types for a given table
- [ ] **12.3** Improve service proxy: auto-discover all `@Injectable()` classes registered in container; expose as `services.UserProfileService`, etc. with tab-completion
- [ ] **12.4** Add startup banner showing available variables: `db`, `schema`, `services`, `container`, `config`
- [ ] **12.5** Add `--eval` flag docs to CLI help text
- [ ] **12.6** Extend `tests/e2e/tests/console.spec.ts`: test `.tables`, service resolution, DB query via `db.select().from(schema.authIdentity).all()`, async/await expression

---

## Phase 13: Model Observers & Database Lifecycle Hooks

Goal: `class PostObserver implements ModelObserver<Post>` with `created()`, `updated()`, `deleted()` hooks — wired through DI.

- [ ] **13.1** Define `IModelObserver<T>` interface in `packages/core/src/database/observers/observer.interface.ts` with optional hooks: `creating?`, `created?`, `updating?`, `updated?`, `deleting?`, `deleted?`
- [ ] **13.2** Create `ObserverRegistry` service (`packages/core/src/database/observers/observer.registry.ts`) — maps table name → observer instances
- [ ] **13.3** Create `withObservers(db, registry)` Drizzle extension helper — wraps `insert`, `update`, `delete` operations to call observer hooks before/after
- [ ] **13.4** Add `@Observable(table)` class decorator for services — registers the observer automatically in the DI container
- [ ] **13.5** Wire `ObserverRegistry` into `SharedModule` so it's auto-loaded
- [ ] **13.6** Unit tests (`packages/core/src/database/observers/__tests__/`): creating fires before insert, created fires after, hooks can abort via thrown error, multiple observers for same table

---

## Phase 14: Image Processing & PDF Generation

Goal: `imageService.resize(file, { width: 800 })`, `pdfService.fromHtml(template, data)` — adapter-backed, works on Cloudflare and Docker.

### Image Processing
- [ ] **14.1** Define `IImageProcessor` interface in `packages/core/src/image/image.interface.ts`: `resize()`, `crop()`, `convert()`, `thumbnail()`
- [ ] **14.2** Cloudflare adapter: delegate to Cloudflare Images API (`/cdn-cgi/image/`)
- [ ] **14.3** Docker/Node adapter: `sharp` npm package
- [ ] **14.4** Wire into `RuntimeAdapter` — `adapter.imageProcessor` optional binding
- [ ] **14.5** `ImageModule` in core for DI registration
- [ ] **14.6** Unit tests: mock adapter, verify resize/crop calls

### PDF Generation
- [ ] **14.7** Define `IPdfGenerator` interface: `fromHtml(html: string, options?): Promise<Uint8Array>`
- [ ] **14.8** Browser-based adapter: `@react-pdf/renderer` (works edge + Node)
- [ ] **14.9** Node adapter: Puppeteer headless Chrome (Docker only)
- [ ] **14.10** `PdfModule` in core
- [ ] **14.11** Unit tests: render simple PDF, verify output is non-empty buffer

---

## Phase 15: N+1 Detection (Dev Mode)

Goal: dev-mode warning when a tRPC procedure issues > N identical or related queries in one request.

- [ ] **15.1** Create `N1Detector` Drizzle extension middleware in `packages/core/src/database/n1-detector.ts` — counts identical SQL query patterns per request context
- [ ] **15.2** When count exceeds threshold (default: 3), log `[N+1 Warning] query repeated N times in ${procedure}` with stack trace
- [ ] **15.3** Disable in production (`NODE_ENV !== 'development'`)
- [ ] **15.4** Wire into `DrizzleService` when dev mode active
- [ ] **15.5** Unit tests: run 5 identical queries, assert warning emitted; run same query once, assert no warning

---

## Phase 16: Cache DX — `cache.remember()` Pattern

The cache implementation exists (`packages/core/src/shared/cache/`). This phase adds the ergonomic `remember` pattern and tags.

- [ ] **16.1** Add `remember<T>(key, ttl, fn: () => Promise<T>): Promise<T>` method to `CacheService` — fetch from cache or execute fn and store result
- [ ] **16.2** Add `rememberForever<T>(key, fn)` — no TTL
- [ ] **16.3** Add tagged cache: `cache.tags(['orgs', orgId]).flush()` — invalidate all keys with given tags
- [ ] **16.4** Add `forget(key)` and `flush()` methods if missing
- [ ] **16.5** Unit tests: remember executes fn once on miss, returns cached on hit, TTL expiry, tag flush

---

## Phase 17: Testing Utilities — Assertion Helpers & Time Travel

Goal: `assertDatabaseHas(table, where)`, `Mail.fake()`, `Queue.fake()`, `travel(Date)` — eliminates boilerplate in unit tests.

The testing module exists (`packages/core/src/testing/`). This phase fills it out.

- [ ] **17.1** `assertDatabaseHas(db, table, where)` — query DB and fail if no matching row
- [ ] **17.2** `assertDatabaseMissing(db, table, where)` — opposite
- [ ] **17.3** `assertSoftDeleted(db, table, id)` — assert `deletedAt IS NOT NULL`
- [ ] **17.4** `Mail.fake()` / `Mail.restore()` — replaces `EmailService` with in-memory recorder; `Mail.assertSent(TemplateName, to)`
- [ ] **17.5** `Queue.fake()` / `Queue.restore()` — replaces job queue with sync in-memory queue; `Queue.assertDispatched(JobClass)`
- [ ] **17.6** `travel(date)` / `travelBack()` — overrides `Date.now()` and Drizzle `$defaultFn` timestamps for deterministic test assertions
- [ ] **17.7** Unit tests: each helper tested against real (in-memory) SQLite

---

## Phase 18: Upload DX — Presigned URLs & Validation

File upload infrastructure exists. This phase adds the ergonomic dev experience.

- [ ] **18.1** `UploadService.presign(filename, contentType, options)` — returns presigned R2 URL for direct browser → R2 upload
- [ ] **18.2** Validate on complete: max file size, allowed MIME types, virus scan hook
- [ ] **18.3** `UploadService.variants(key, transforms)` — generate image variants on upload complete (delegates to Phase 14 image processor)
- [ ] **18.4** `useUpload()` React hook in `@cruzjs/start` — manages presign → browser upload → confirm flow
- [ ] **18.5** E2E test: upload file via presigned URL flow, verify stored in R2, variant generated

---

## Phase 19: Tutorial — Build a Blog in CruzJS

Goal: a complete, production-grade multi-chapter tutorial that teaches the framework from zero. Written in `apps/docs/src/content/docs/tutorial/`.

### Structure

| Chapter | Title | Covers |
|---------|-------|--------|
| 00 | Introduction | What we're building, prerequisites |
| 01 | Installation | `create-cruz-app`, folder structure, `cruz dev` |
| 02 | Your First Feature | `cruz g feature posts`, DB migration, tRPC, page route |
| 03 | The Console | `cruz console`, querying DB, calling services interactively |
| 04 | Authentication | Auth pages, sessions, `protectedProcedure`, guards |
| 05 | Organizations | `orgProcedure`, multi-tenant data, org switcher |
| 06 | Permissions & RBAC | Roles, `requirePermission`, policy classes |
| 07 | File Uploads | Presigned URLs, R2 storage, image variants |
| 08 | Background Jobs & Email | `dispatch(new Job())`, email templates, queue retry |
| 09 | Testing Your App | Unit tests, `assertDatabaseHas`, `Mail.fake()`, E2E |
| 10 | Deploying to Cloudflare | `cruz deploy`, D1 remote migration, KV, environment config |

### Tasks

- [ ] **19.1** Create `apps/docs/src/content/docs/tutorial/` directory with `_index.md` overview
- [ ] **19.2** Write ch00: Introduction (what we build, link to finished repo)
- [ ] **19.3** Write ch01: Installation — `create-cruz-app blog`, folder walkthrough, `cruz dev`, visit localhost
- [ ] **19.4** Write ch02: First Feature — `cruz g feature posts title:string body:text published:boolean`, migration, page, tRPC query
- [ ] **19.5** Write ch03: Console — startup, `db.select()`, calling `services.PostsService.list()`, `.tables`
- [ ] **19.6** Write ch04: Auth — login, register, session, `protectedProcedure` on posts mutation, auth guard in UI
- [ ] **19.7** Write ch05: Organizations — enable org module, `orgProcedure`, scoping posts to org, org switcher component
- [ ] **19.8** Write ch06: RBAC — define roles, `requirePermission('posts:write')`, policy class
- [ ] **19.9** Write ch07: File Uploads — upload banner image to post, presigned URL, R2, display image
- [ ] **19.10** Write ch08: Jobs & Email — send welcome email on register, background job, retry on failure
- [ ] **19.11** Write ch09: Testing — unit test PostsService, `Mail.fake()`, E2E login flow
- [ ] **19.12** Write ch10: Deploy — `cruz deploy production`, remote DB migrate, env secrets
- [ ] **19.13** Add tutorial section to docs sidebar in `apps/docs/astro.config.mjs`
- [ ] **19.14** Each chapter includes: working code with copy buttons, callouts for common mistakes, links to API reference

---

## Phase 20: Comprehensive Unit Test Coverage

Every module in `packages/core/src` that has a `__tests__/` directory gets full coverage. New `__tests__/` directories added where missing. All tests use Vitest + real in-memory SQLite (no mocks of the database layer).

### DI System
- [ ] **20.1** `di/__tests__/container.test.ts`: bind singleton, bind transient, resolve by token, resolve by class, throw on unbound, detect circular dep at resolution time
- [ ] **20.2** `di/__tests__/module.test.ts`: @Module registers providers, wires tRPC routers, registers page routes, loads sub-modules
- [ ] **20.3** `di/__tests__/decorators.test.ts`: @Injectable, @Inject, @Router, @Route, @Singleton all set correct metadata

### Auth
- [ ] **20.4** `auth/__tests__/auth.service.test.ts`: register (hashes password), login (verifies hash), login wrong password rejects, session created on login, session invalidated on logout
- [ ] **20.5** `auth/__tests__/token.service.test.ts`: generate token, verify token, expired token rejects, token rotation
- [ ] **20.6** `auth/__tests__/session.service.test.ts`: create session, get session, destroy session, session expiry

### tRPC Procedures
- [ ] **20.7** `trpc/__tests__/procedures.test.ts`: `publicProcedure` allows unauthenticated, `protectedProcedure` rejects unauthenticated, `orgProcedure` rejects missing org context, `requirePermission` rejects wrong role

### Database
- [ ] **20.8** `database/__tests__/factories.test.ts`: define factory, create one, create many, state override, relationship factories
- [ ] **20.9** `database/__tests__/seeding.test.ts`: run seeder, idempotency, teardown
- [ ] **20.10** `database/__tests__/soft-delete.test.ts`: delete sets `deletedAt`, default queries exclude soft-deleted, restore clears `deletedAt`, force delete removes row
- [ ] **20.11** `database/__tests__/observers.test.ts` (Phase 13): observer hooks fire in order, creating can abort, multiple observers
- [ ] **20.12** `database/__tests__/scopes.test.ts`: global scope applied to all queries, local scope applied explicitly

### Events
- [ ] **20.13** `shared/events/__tests__/events.test.ts`: dispatch event, listener receives, async listeners await, multiple listeners, event propagation stops on stopPropagation()

### Jobs
- [ ] **20.14** `jobs/__tests__/job.test.ts`: dispatch job, consumer called, retry on failure (3 attempts), dead letter after max retries, job payload serialized correctly

### Rate Limiting
- [ ] **20.15** `rate-limiting/__tests__/sliding-window.test.ts`: under limit allows, over limit blocks, window resets after TTL
- [ ] **20.16** `rate-limiting/__tests__/token-bucket.test.ts`: tokens refill, burst allows, empty bucket blocks

### Email
- [ ] **20.17** `email/__tests__/email.test.ts`: render template to HTML, send queued, send immediate, template missing throws

### Notifications
- [ ] **20.18** `notifications/__tests__/notifications.test.ts` (start package): dispatch to DB channel, dispatch to email channel, multi-channel, mark read

### Broadcasting
- [ ] **20.19** `broadcasting/__tests__/broadcasting.test.ts`: publish to channel, subscriber receives, presence channel join/leave

### Cache
- [ ] **20.20** `shared/cache/__tests__/cache.test.ts`: get miss, set+get hit, TTL expiry, remember pattern, tagged flush

### Search
- [ ] **20.21** `search/__tests__/search.test.ts`: index document, query returns match, FTS5 ranking, delete from index

### Feature Flags
- [ ] **20.22** `feature-flags/__tests__/flags.test.ts`: flag on/off, percentage rollout, user override, environment override

### Health Checks
- [ ] **20.23** `health/__tests__/health.test.ts`: DB check passes, DB check fails gracefully, storage check, custom check registration, aggregate status (degraded if any unhealthy)

### Pagination
- [ ] **20.24** `pagination/__tests__/pagination.test.ts`: cursor-based paging, offset paging, empty page, last page detection

### Policies
- [ ] **20.25** `policies/__tests__/policy.test.ts`: allow rule passes, deny rule throws, policy composition, resource ownership check

### Webhooks
- [ ] **20.26** `webhooks/__tests__/webhooks.test.ts`: sign payload (HMAC), verify signature, invalid signature rejects, dispatch with retry, delivery log

### Resources
- [ ] **20.27** `resources/__tests__/resources.test.ts`: transform single resource, paginated collection, nested resource, field selection

### API Versioning
- [ ] **20.28** `versioning/__tests__/versioning.test.ts`: route to v1 handler, route to v2 handler, unknown version 404, deprecation header

### Scheduler
- [ ] **20.29** `scheduler/__tests__/scheduler.test.ts`: register cron, fire at scheduled time (mock clock), skip if already running, distributed lock (mock KV)

### Magic Links
- [ ] **20.30** `magic-link/__tests__/magic-link.test.ts`: generate link, verify valid link, expired link rejects, used link rejects

### Testing Utilities (Phase 17)
- [ ] **20.31** `testing/__tests__/assertions.test.ts`: assertDatabaseHas passes/fails, assertDatabaseMissing, assertSoftDeleted
- [ ] **20.32** `testing/__tests__/fakes.test.ts`: Mail.fake captures sends, Queue.fake captures dispatches, travel() freezes time

### CLI Generators
- [ ] **20.33** `cli/__tests__/new-feature.test.ts`: generate files match expected content exactly, wire inserts correct import, wire inserts module into modules array, field type mapping correct for all types
- [ ] **20.34** `cli/__tests__/routes.test.ts`: routes command output contains tRPC procedures, output contains page routes, JSON flag produces parseable output

### Console
- [ ] **20.35** `cli/__tests__/console.test.ts` (extends existing `console.spec.ts`): `.tables` lists tables, service resolution works, DB query returns rows, async/await eval, piped input mode

### Route Registry
- [ ] **20.36** `framework/__tests__/route-registry.test.ts`: register tRPC router, register page routes, overwrite warning, clear resets

### Soft Deletes
- [ ] **20.37** Extend existing `soft-delete/__tests__/` — restore, force delete, batch soft delete, query that bypasses soft delete filter

### Upload
- [ ] **20.38** `upload/__tests__/upload.test.ts`: presign returns URL, validate MIME passes/fails, validate size passes/fails, variant generation called on complete

---

## Phase 21: E2E Coverage Expansion

Run against the local dev server. Tests must be runnable with `cruz test:e2e`.

- [ ] **21.1** `generators.spec.ts`: `cruz g feature posts title:string body:text` → files exist, typecheck passes, app boots
- [ ] **21.2** `routes.spec.ts`: `cruz routes` output contains `auth.login`, `auth.register`, `userProfile.current`
- [ ] **21.3** `error-pages.spec.ts`: 404 page renders correctly, 500 page renders in prod mode, tRPC error returns structured JSON
- [ ] **21.4** `console.spec.ts` (extend): `.tables` lists `authIdentity`, `organizations`; service resolution; DB query
- [ ] **21.5** `soft-delete.spec.ts`: create record via API, delete via API, verify UI shows deleted, admin restore via console
- [ ] **21.6** `cache.spec.ts`: endpoint hits cache on second call (response time faster), flush cache via console, verify miss on third call
- [ ] **21.7** `observers.spec.ts`: create org, verify observer audit log entry written
- [ ] **21.8** `factories.spec.ts` (seeding): run `cruz db seed`, verify seeded records appear in UI
- [ ] **21.9** `upload.spec.ts` (extend): presigned URL returned, file uploaded directly to R2-equivalent
