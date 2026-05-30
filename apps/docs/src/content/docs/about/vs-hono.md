---
title: CruzJS vs Hono
description: Comparing CruzJS and Hono -- a batteries-included framework versus a lightweight edge-native toolkit.
---

CruzJS and Hono both target Cloudflare Workers, but they sit at opposite ends of the spectrum. Hono is a lightweight, portable web framework. CruzJS is a batteries-included application framework. The choice between them depends on what you are building and how much structure you want.

## Overview

**Hono** is a small, fast web framework for the edge. It runs on Cloudflare Workers, Deno, Bun, Node.js, and more. It provides routing, middleware, and helpers -- everything else is up to you. Think of it as Express for the edge runtime era.

**CruzJS** is a full-stack TypeScript framework built on React Router v7. It provides DI, tRPC, Drizzle ORM, built-in auth, org management, and a React frontend. It deploys to Cloudflare Workers/Pages. It is opinionated about how you build applications.

## Key Differences

| Aspect | Hono | CruzJS |
|--------|------|--------|
| **Size** | ~14KB (minimal) | Full framework |
| **Scope** | Web framework (routing + middleware) | Full-stack application framework |
| **Frontend** | None (API-only or use JSX helper) | React Router v7 (SSR) |
| **UI Components** | No UI library | 124+ built-in components (forms, tables, layouts, marketing blocks) — zero deps |
| **Database** | Bring your own | Drizzle ORM -- D1 on Cloudflare (SQLite locally) |
| **Auth** | Bring your own | Built-in (email/password, 7 OAuth providers, 2FA, magic links, API keys, RBAC) |
| **DI** | None | Inversify with @Module() decorators |
| **API style** | REST routes, RPC mode | tRPC |
| **Portability** | Workers, Deno, Bun, Node, AWS Lambda | Cloudflare Workers/Pages (V8 isolates) |
| **Org management** | None | Built-in (teams, roles, invitations) |
| **Background jobs** | Manual Queues integration | Integrated via CLI |
| **CLI** | None (use wrangler directly) | `cruz dev/deploy/db/new` |
| **Learning curve** | Very low | Moderate |
| **Bundle size impact** | Minimal | Larger (framework overhead) |

## Code Comparison

### Basic API Endpoint

```typescript
// Hono
const app = new Hono<{ Bindings: Env }>();

app.get("/api/users/:id", async (c) => {
  const id = c.req.param("id");
  const db = drizzle(c.env.DB);
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .get();

  if (!user) return c.json({ error: "Not found" }, 404);
  return c.json(user);
});

export default app;
```

```typescript
// CruzJS -- service + tRPC router
@injectable()
export class UsersService {
  constructor(@inject(DB) private db: DrizzleDB) {}

  async getById(id: string) {
    return this.db.select().from(users).where(eq(users.id, id)).get();
  }
}

export const usersRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input, ctx }) =>
      ctx.container.get(UsersService).getById(input.id)
    ),
});
```

Hono is more concise for simple endpoints. CruzJS adds structure that pays off as the codebase grows.

### Auth Middleware

```typescript
// Hono -- you build it
const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  try {
    const payload = await verify(token, c.env.JWT_SECRET);
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

app.use("/api/*", authMiddleware);
```

```typescript
// CruzJS -- built in
export const usersRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    // ctx.user is already authenticated and typed
    return ctx.user;
  }),
});
```

### File Upload with R2

```typescript
// Hono
app.post("/api/upload", authMiddleware, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file") as File;
  const key = `uploads/${crypto.randomUUID()}/${file.name}`;
  await c.env.R2_BUCKET.put(key, file.stream());
  return c.json({ key });
});

// CruzJS
@injectable()
export class FileStorageService {
  constructor(@inject(CloudflareContext) private cf: CloudflareContext) {}

  async upload(file: File) {
    const key = `uploads/${crypto.randomUUID()}/${file.name}`;
    await this.cf.r2.put(key, file.stream());
    return key;
  }
}
```

Both work. Hono is more direct. CruzJS wraps it in a testable service.

## Where Hono Wins

- **Simplicity.** Hono is easy to learn and get started with. Read the docs in an afternoon, ship an API by evening.
- **Portability.** Write once, deploy to Cloudflare Workers, Deno Deploy, AWS Lambda, Bun, or Node.js with zero framework overhead. CruzJS targets Cloudflare today (multi-cloud is planned), but Hono's portability is more lightweight and mature.
- **Size.** Hono adds ~14KB to your bundle. CruzJS adds significantly more framework overhead.
- **Performance.** Less framework overhead means faster cold starts and lower memory usage per request.
- **Flexibility.** Choose your own ORM, auth, validation, and patterns. No framework opinions imposed.
- **Microservices.** For small, focused APIs (webhook handlers, proxy services, data transformers), Hono is the right size. CruzJS is too much framework for these use cases.
- **Learning curve.** Hono is approachable for any developer who knows JavaScript. CruzJS requires learning DI, tRPC, Drizzle, and React Router patterns.
- **RPC mode.** Hono's RPC mode provides type-safe client-server communication similar to tRPC but with less setup.

## Where CruzJS Wins

- **Full-stack applications.** CruzJS includes a React frontend with SSR. Hono serves APIs but does not render UI (its JSX helper is for simple HTML, not a React app).
- **Backend structure at scale.** DI, services, and modules keep complex business logic organized. Hono route files tend to grow unwieldy in large applications.
- **Built-in auth and orgs.** Social auth (7 OAuth providers: GitHub, Google, Discord, Twitter, LinkedIn, Microsoft, Apple), two-factor auth (TOTP + backup codes), magic links (passwordless), API keys, RBAC, org management, and member invitations. With Hono, you build all of this from scratch.
- **CRUD Factory.** `createCrud()` factory and `BaseCrudService` eliminate boilerplate for standard data operations.
- **Real-time.** BroadcastModule provides SSE and presence out of the box.
- **Database tooling.** Drizzle ORM configured for D1, with migrations, seeding, and studio through the CLI. Hono gives you raw D1 bindings.
- **SaaS features.** If you are building a multi-tenant SaaS, CruzJS has the patterns built in. With Hono, you are implementing multi-tenancy from the ground up.
- **Unified development experience.** One CLI for dev server, database, scaffolding, and deployment. With Hono, you use wrangler directly and assemble your own tooling.
- **Convention over configuration.** CruzJS answers "where does this code go?" for you. In Hono projects, every team invents their own structure.

## When to Choose Hono

- You are building an API, webhook handler, or microservice -- not a full-stack application.
- You need to deploy to multiple runtimes (not just Cloudflare).
- You want minimal framework overhead and maximum performance.
- You prefer choosing your own tools and patterns.
- Your project is small to medium and does not need DI or complex backend structure.
- You are building something that does not need auth, org management, or a database ORM.
- You want the fastest possible cold starts.

## When to Choose CruzJS

- You are building a full-stack SaaS application with a React frontend.
- You need auth, org management, RBAC, and multi-tenancy.
- You want an ORM with migrations and database tooling integrated.
- Your backend will have complex business logic that benefits from DI and services.
- You want one framework that handles frontend, backend, database, and deployment.
- You prefer opinionated structure over assembling your own patterns.

## Can You Use Both?

Yes. A common pattern is using CruzJS for your main application and Hono for standalone microservices. CruzJS even scaffolds external workers via `cruz new worker`, and those lightweight services could use Hono internally. They are complementary tools, not just competitors.

## The Honest Take

Hono and CruzJS solve different problems at different scales. Hono is the right choice when you need a web framework -- something to handle HTTP requests, route them, and send responses. It does this exceptionally well across multiple runtimes.

CruzJS is the right choice when you need an application framework -- something that provides the full structure for a production SaaS application. Auth, orgs, database, API layer, frontend, deployment -- all integrated.

Choosing between them is less about which is "better" and more about what you are building. A webhook processor? Hono. A SaaS platform? CruzJS. An API gateway? Hono. A multi-tenant application with user management? CruzJS.
