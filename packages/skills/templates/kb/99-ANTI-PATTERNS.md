# CruzJS Anti-Patterns — Do Not Do These

If you find yourself doing any of these, stop and re-read the relevant KB file.

## Services

**DON'T:** Write services as plain classes.
```ts
// WRONG
export class ChatbotService {
  constructor(private db: DrizzleD1Database) {}
}
```

**DO:** `@injectable()` with DI tokens.
```ts
// RIGHT
@injectable()
export class ChatbotService {
  constructor(@inject(DRIZZLE_DB) private db: Database) {}
}
```

Read: `03-DI-INVERSIFY.md`

## API Endpoints

**DON'T:** Write `routes/api/chatbots.ts` for app data with auth.
```ts
// WRONG — bypasses tRPC, no type safety, custom auth wiring
export async function loader({ request, context }) {
  const env = (context as any).cloudflare?.env;
  const db = drizzle(env.DB);
  // ...
}
```

**DO:** tRPC procedure.
```ts
// RIGHT — auth + types + context automatic
list: protectedProcedure.query(({ ctx }) =>
  ctx.container.get(ChatbotService).list(ctx.user.id)
)
```

REST routes only for: public unauth endpoints (webhooks, embed widgets, health checks).

Read: `05-TRPC-ROUTERS.md`

## Auth

**DON'T:** Read or write `document.cookie` for auth. The cookie is HttpOnly — JavaScript cannot read it. That's the point.

**DON'T:** Store tokens in `localStorage` or `sessionStorage`. XSS would steal them.

**DON'T:** Manually attach `Authorization: Bearer <token>` headers in browser code. The cookie travels automatically with same-origin fetch.

**DON'T:** Call `storeSessionToken()` after login/register. Server already set the HttpOnly cookie via `Set-Cookie`.

**DON'T:** Roll your own session helper that fetches `/api/trpc/auth.session` over HTTP from a loader.

**DON'T:** Hardcode user IDs like `const userId = 'demo-user'`.

**DON'T:** Cast context: `(context as any).cloudflare?.env`.

**DO:** Use `protectedProcedure` (or `orgProcedure`) — `ctx.session.user.id` and `ctx.org.id` already populated from the cookie.

**DO:** For client-side page protection, use `useAuth()` + redirect in `useEffect`.

**DO:** Call `trpc.auth.logout.useMutation()` to clear the session — server clears the cookie via `Set-Cookie: auth_token=; Max-Age=0`.

Read: `06-AUTH-ORG-SCOPING.md`

## Database

**DON'T:** Call `drizzle(env.DB)` in service code or route handlers.

**DO:** Inject the db: `@inject(DRIZZLE_DB) private db: Database`.

Read: `04-DATABASE-DRIZZLE.md`

## Modules

**DON'T:** Skip module registration. Services that aren't in a `@Module()` won't be DI-resolvable.

**DO:** Every feature has a `*.module.ts`. Register modules in `app.server.ts` via `registerModules([])`.

**DON'T:** Mix module concerns. One feature per module.

Read: `11-FRAMEWORK-EXTENSIBILITY.md`

## Routes

**DON'T:** Hand-write `src/routes.ts` listing every route literally.

**DO:** Use `createCruzRoutes({ ... })` — it pulls in framework routes (auth, dashboard, OAuth) from `@cruzjs/start` and your module routes automatically.

**DON'T:** Override `entry.server.tsx` to intercept requests. That's the React Router SSR entry, not the worker fetch handler.

Read: `01-ARCHITECTURE.md`

## Types

**DON'T:** Use `as any`. Especially on `context`, request bodies, tRPC ctx.

**DO:** Use Zod for input validation. tRPC will infer types. For Cloudflare bindings, use the proper `CloudflareContext` type.

If you're casting, you're either fighting the framework or skipping schema validation. Re-read the relevant KB.

Read: `02-TYPESCRIPT.md`

## Tests

**DON'T:** Mock the DI container. Use real services with a test container.

**DO:** Test services directly with a test db. Test tRPC procedures via `createCaller`.

Read: `10-TESTING.md`

## Common red flags (you're going off the rails)

- You're importing `drizzle` from `drizzle-orm/d1` in a service
- You're writing a route in `routes/api/*.ts` that needs auth
- You see `(context as any)`
- You see `(env as any)` or `(request as any)`
- You have a hardcoded user ID
- You haven't created a `*.module.ts` for your feature
- You're writing `fetch('/api/trpc/...')` from inside a loader
- Your service has `new ChatbotService(db)` somewhere

Each one means you skipped a KB file. Stop. Read. Restart.
