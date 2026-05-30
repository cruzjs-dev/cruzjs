# CruzJS Cookbook — How to do common things

**Use this first.** Before writing any code, find your task here, then read the linked KB files.

## "I want to add a feature"

A feature = module + services + tRPC router + routes.

1. Read `11-FRAMEWORK-EXTENSIBILITY.md` — Module pattern, registration
2. Read `03-DI-INVERSIFY.md` — `@injectable()`, `@inject()`, providers
3. Read `05-TRPC-ROUTERS.md` — `protectedProcedure`, `orgProcedure`, context
4. Read `01-ARCHITECTURE.md` — folder structure for features

Skeleton:
```
src/features/{name}/
  {name}.module.ts      # @Module({ providers, trpcRouters })
  {name}.service.ts     # @injectable() class
  {name}.trpc.ts        # router with protectedProcedure
  {name}.routes.ts      # page routes (optional)
```

Register the module in `app.server.ts` via `registerModules([...])`.

## "I want to add an API endpoint"

**Default: tRPC, not REST.**

- App endpoint (auth required, called from your own UI) → tRPC `protectedProcedure`
- Org-scoped endpoint → tRPC `orgProcedure` (ctx.org.id available)
- Public unauth endpoint (webhook, embeddable widget, healthcheck) → React Router route in `routes/api/*.ts` with CORS

Read `05-TRPC-ROUTERS.md`.

## "I want database access"

Read `04-DATABASE-DRIZZLE.md`.

- Define schema in `src/database/schema.ts` (Drizzle tables)
- Inject `DRIZZLE_DB` in services: `@inject(DRIZZLE_DB) private db: Database`
- Don't `import { drizzle } from 'drizzle-orm/d1'` in services. DI gives you the db.
- Generate migrations: `cruz db generate`
- Apply: `cruz db migrate`

## "I want auth in a route loader or action"

Use a tRPC procedure instead. Loaders/actions can call tRPC server-side via `serverTRPC.someRouter.someProcedure(input)`.

If you must do route-level auth on a page (not API), use the client-side `useAuth()` hook + redirect in `useEffect`. See `@cruzjs/start/pages/DashboardPage.tsx` for the pattern.

## "How does auth work? Where do I store the token?"

You don't. CruzJS uses HttpOnly cookies — server sets `Set-Cookie: auth_token=...; HttpOnly; SameSite=Lax` on login/register. Browser sends it automatically on every request.

- ❌ Do not write `document.cookie` or `localStorage.setItem('auth_token', ...)` from client
- ❌ Do not add `Authorization: Bearer` headers in browser code
- ✅ Use `trpc.X.useQuery()` / `useMutation()` — cookie travels automatically
- ✅ Check auth state with `useAuth()` hook or `trpc.auth.session.useQuery()`
- ✅ Logout: `trpc.auth.logout.useMutation()` — server clears the cookie

For mobile/CLI/API clients that can't use cookies, use the JWT refresh-token flow + `Authorization: Bearer <jwt>`.

Read: `06-AUTH-ORG-SCOPING.md`

## "I want background jobs"

Read `12-JOBS.md`.

- Implement `JobHandler` interface
- Register via `{ provide: JOB_HANDLER, useClass: MyHandler, multi: true }` in a module
- Enqueue via `JobService` (inject it)

## "I want events / pub-sub"

Read `09-EVENTS.md`.

- Define event class extending `AppEvent`
- Emit via `EventEmitter` (injected)
- Listen via `@defineListener(EventClass)` in a module

## "I want a UI page"

Read `02-TYPESCRIPT.md` + `07-UI-PATTERNS.md`.

- React Router v7 route in `routes/`
- Use `getTRPC()` + `useQuery()` for data
- Use `useAuth()` for auth
- Use components from `@cruzjs/ui`

## "I want multi-tenant (org-scoped) data"

Read `06-AUTH-ORG-SCOPING.md` + `08-DATA-OWNERSHIP.md`.

- Add `orgId` column to schema
- Use `orgProcedure` in tRPC — `ctx.org.id` is set
- Index queries by `orgId`

## "I want to register routes"

Read `01-ARCHITECTURE.md`.

- `src/routes.ts` uses `createCruzRoutes({ route, index, layout, prefix, dir, framework, routes })`
- Framework registrars: `registerCruzStartRoutes`, `registerCruzSaasRoutes`
- Custom routes added to `routes` array
- Public REST routes go in `routes/api/`

## Anti-patterns (read these too)

`99-ANTI-PATTERNS.md` — explicit don'ts. Read before writing any service or route.
