---
title: CruzJS vs Remix / React Router
description: CruzJS is built on React Router v7 -- here is what it adds on top.
---

This comparison is a bit unusual because CruzJS is not an alternative to Remix or React Router -- it is built on top of React Router v7. The routing, SSR, data loading, and form handling you know from Remix/React Router are all still there. The question is what you need above that foundation.

## Overview

**Remix / React Router v7** is a web framework focused on routing, SSR, progressive enhancement, and web standards. Since Remix merged into React Router v7, they are effectively the same project. It handles routing, data loading, form mutations, and streaming SSR. Everything else -- database, auth, API layer, deployment -- is up to you.

**CruzJS** uses React Router v7 as its routing and SSR layer, then adds a full backend framework on top: dependency injection, tRPC, Drizzle ORM, built-in auth, org management, and Cloudflare deployment tooling.

## Key Differences

| Aspect | Remix / React Router v7 | CruzJS |
|--------|------------------------|--------|
| **Routing & SSR** | Core focus | Same (uses React Router v7) |
| **Backend patterns** | Loaders and actions | Loaders/actions + DI services + tRPC |
| **Database** | Bring your own | Drizzle ORM -- D1 on Cloudflare (SQLite locally) |
| **Auth** | Bring your own | Built-in (email/password, 7 OAuth providers, 2FA, magic links, API keys, RBAC) |
| **UI Components** | Bring your own (Radix, shadcn, MUI, etc.) | 124+ built-in components (forms, tables, layouts, marketing blocks) — zero deps |
| **API layer** | Loaders/actions or build your own | tRPC (type-safe, callable from client) |
| **DI** | None | Inversify with @Module() decorators |
| **Org management** | None | Built-in (teams, roles, invitations) |
| **CLI** | `npx react-router dev` | `cruz dev/deploy/db/new` |
| **Deploy targets** | Anywhere (Node, Cloudflare, Vercel, Deno) | Cloudflare Workers/Pages (V8 isolates) |
| **Philosophy** | Minimal, flexible, standards-first | Opinionated, batteries-included |

## What CruzJS Adds to React Router

If you have used Remix or React Router v7, the frontend layer of CruzJS will feel familiar. Here is what sits on top:

### 1. Dependency Injection and Services

React Router loaders talk directly to databases or external APIs. CruzJS adds a service layer with DI:

```typescript
// React Router v7 -- loader talks to DB directly
export async function loader({ context }: Route.LoaderArgs) {
  const db = getDb(context);
  const users = await db.select().from(usersTable);
  return { users };
}

// CruzJS -- loader uses an injected service
export async function loader({ context }: Route.LoaderArgs) {
  const usersService = context.container.get(UsersService);
  const users = await usersService.listAll();
  return { users };
}
```

### 2. tRPC for Client-Side API Calls

React Router's loaders and actions are great for server-rendered pages. But when you need client-side API calls (interactive UIs, polling, optimistic updates), you need an API layer. CruzJS provides tRPC:

```typescript
// CruzJS tRPC router
export const projectsRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    return ctx.container.get(ProjectsService).listForUser(ctx.user.id);
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(({ input, ctx }) => {
      return ctx.container.get(ProjectsService).create(ctx.user.id, input);
    }),
});

// Client-side usage with full type inference
const { data: projects } = trpc.projects.list.useQuery();
```

With plain React Router, you would build your own API routes or use server functions for this.

### 3. Built-In Auth and Org Management

React Router gives you cookie sessions and request handling. CruzJS adds the full auth stack:

```typescript
// CruzJS -- auth is already configured
export async function loader({ context }: Route.LoaderArgs) {
  const user = context.auth.requireUser(); // Throws redirect if not authenticated
  const org = context.auth.requireOrg();   // Ensures org context
  // ...
}
```

Social auth (7 OAuth providers: GitHub, Google, Discord, Twitter, LinkedIn, Microsoft, Apple), two-factor auth (TOTP + backup codes), magic links (passwordless), API keys, org management, RBAC, member invitations, and team switching are included -- not assembled from third-party packages.

### 4. Database with Drizzle ORM

CruzJS includes Drizzle ORM configured for D1 on Cloudflare (SQLite locally), with migrations, seeding, and a studio interface through the CLI:

```bash
cruz db generate   # Generate migration from schema changes
cruz db migrate    # Apply locally
cruz db studio     # Visual database browser
```

### 5. Unified CLI

Instead of assembling `wrangler`, `drizzle-kit`, and custom scripts, CruzJS provides one CLI for the full lifecycle.

## Where Remix / React Router Wins

- **Deploy anywhere.** Node.js, Cloudflare, Vercel, Deno, Netlify, Fly.io -- React Router adapts to your infrastructure. CruzJS targets Cloudflare today (multi-cloud is planned).
- **Flexibility.** You choose your ORM, auth library, API pattern, and deployment target. No lock-in to specific tools.
- **Smaller surface area.** Less framework to learn. If you just need routing and SSR, React Router is all you need.
- **Ecosystem compatibility.** Any React library, any Node.js package, any deployment platform. CruzJS's Cloudflare Workers runtime has compatibility constraints.
- **Maturity.** React Router has been around for over a decade. Its patterns are well-understood and widely documented.
- **Progressive enhancement.** React Router's core philosophy of working without JavaScript is preserved when you stay within loaders and actions. Adding tRPC pulls you toward more client-side patterns.

## Where CruzJS Wins

- **Full-stack SaaS in a box.** Auth (social auth, 2FA, magic links, API keys), orgs, RBAC, database, API layer, CRUD factory, real-time (BroadcastModule with SSE and presence), and deployment -- all integrated and working together from day one.
- **No assembly required.** With React Router, building a SaaS app means choosing and integrating an ORM, auth library, API layer, email service, and deployment pipeline. CruzJS makes those decisions for you.
- **Backend structure.** DI, services, and modules give your backend the same level of organization that React gives your frontend.
- **Type-safe API layer.** tRPC provides end-to-end type safety from database to UI without code generation or API specs.
- **Cloud-native.** Cloudflare D1, KV, R2, Queues, Workers, and Workflows are first-class citizens. The same binding abstractions are the foundation for the multi-cloud roadmap.
- **Single CLI.** Development, database management, scaffolding, and deployment through one tool.

## When to Choose React Router (Remix)

- You want maximum flexibility in your tech choices.
- You need maximum deployment platform flexibility beyond what CruzJS's adapter system supports.
- You are building a content-heavy site or marketing pages (not a SaaS app).
- You prefer assembling your own stack from best-of-breed tools.
- You want the smallest possible framework footprint.
- Your team already has established patterns for auth, database, and deployment.

## When to Choose CruzJS

- You are building a SaaS application with user accounts, organizations, and role-based access.
- You want the routing and SSR of React Router with a structured backend on top.
- You are deploying to Cloudflare (or another supported platform) and want native integration with platform services.
- You do not want to spend time choosing and wiring up auth, ORM, and API libraries.
- You prefer opinionated conventions over manual assembly.
- You want DI and service patterns to keep your backend organized as it grows.

## The Honest Take

React Router v7 is an excellent routing and SSR framework. If your backend is simple, or you have strong opinions about your tools, it gives you the freedom to build exactly what you want.

CruzJS exists because many teams building SaaS products on React Router end up assembling the same set of tools: an ORM, auth, org management, tRPC, and cloud bindings. CruzJS packages that assembly into a cohesive framework. The trade-off is real: you lose the freedom to swap out individual pieces. But if you are building a SaaS product and want an integrated experience on Cloudflare, CruzJS saves significant setup time.

Think of it this way: React Router is the engine. CruzJS is the car built around that engine, with seats, a dashboard, and a navigation system already installed.
