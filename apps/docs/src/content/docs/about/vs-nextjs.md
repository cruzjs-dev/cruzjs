---
title: CruzJS vs Next.js
description: Comparing CruzJS and Next.js -- two full-stack React frameworks with different platform targets and philosophies.
---

Next.js and CruzJS are both full-stack React frameworks, but they make very different bets on platform, architecture, and how much structure to provide. Next.js is the dominant React framework with a massive ecosystem. CruzJS is a newer, more opinionated framework that deploys to Cloudflare Workers/Pages.

## Overview

**Next.js** is the most popular React framework, maintained by Vercel. It features the App Router with React Server Components, Server Actions, API Routes, and a rich middleware system. It deploys best on Vercel but supports Node.js, Docker, and other platforms.

**CruzJS** is a full-stack TypeScript framework built on React Router v7. It provides DI, tRPC, Drizzle ORM, built-in auth, and org management. It deploys to Cloudflare Workers/Pages.

## Key Differences

| Aspect | Next.js | CruzJS |
|--------|---------|--------|
| **Rendering** | App Router + RSC + Server Actions | React Router v7 SSR |
| **API layer** | API Routes, Server Actions | tRPC |
| **Backend structure** | File-based routes, no DI | Inversify DI, @Module(), services |
| **Database** | Bring your own | Drizzle ORM -- D1 on Cloudflare (SQLite locally) |
| **Auth** | NextAuth.js or bring your own | Built-in (email/password, 7 OAuth providers, 2FA, magic links, API keys, RBAC) |
| **UI Components** | Bring your own (Radix, shadcn, MUI, etc.) | 124+ built-in components (forms, tables, layouts, marketing blocks) — zero deps |
| **Org management** | None | Built-in (teams, roles, invitations) |
| **Platform** | Vercel-optimized, Node.js compatible | Cloudflare Workers/Pages (V8 isolates) |
| **Runtime** | Node.js (or Edge Runtime) | V8 isolates on Cloudflare |
| **Caching** | ISR, on-demand revalidation, fetch cache | Cloudflare CDN + KV |
| **File storage** | External service needed | R2 built-in |
| **Ecosystem** | Massive | Small, growing |
| **React version** | React 19 + RSC | React 19 (no RSC) |

## Architecture Comparison

### Next.js: File-Based, Component-Centric

Next.js organizes code around the file system. Pages, layouts, and API routes are defined by file placement. Server Components and Server Actions blur the line between client and server:

```typescript
// Next.js -- app/users/page.tsx (Server Component)
export default async function UsersPage() {
  const users = await db.select().from(usersTable);
  return (
    <ul>
      {users.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}

// app/users/actions.ts
"use server";
export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  await db.insert(usersTable).values({ name });
  revalidatePath("/users");
}
```

### CruzJS: Service-Oriented, DI-Driven

CruzJS separates concerns into services, routers, and UI components. Business logic lives in injectable services, exposed through tRPC routers:

```typescript
// CruzJS -- service
@injectable()
export class UsersService {
  constructor(@inject(DB) private db: DrizzleDB) {}

  async listAll() {
    return this.db.select().from(usersTable);
  }

  async create(data: { name: string }) {
    return this.db.insert(usersTable).values(data);
  }
}

// tRPC router
export const usersRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.container.get(UsersService).listAll()
  ),
  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(({ input, ctx }) =>
      ctx.container.get(UsersService).create(input)
    ),
});

// Route component
export async function loader({ context }: Route.LoaderArgs) {
  const users = await context.container.get(UsersService).listAll();
  return { users };
}

export default function UsersPage({ loaderData }: Route.ComponentProps) {
  return <ul>{loaderData.users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

CruzJS has more files and more ceremony. The payoff is testable services, clear dependency graphs, and backend code that scales to complex business logic.

## Where Next.js Wins

- **Ecosystem.** Next.js has the largest React ecosystem. Thousands of tutorials, libraries, templates, and integrations. If something exists in the React world, it probably has a Next.js example.
- **React Server Components.** RSC reduces client JavaScript by rendering components on the server. CruzJS uses traditional SSR, which sends more JavaScript to the client.
- **Deployment flexibility.** While optimized for Vercel, Next.js runs on Node.js, Docker, AWS, and more. CruzJS targets Cloudflare today (multi-cloud is planned).
- **Static generation.** Next.js excels at ISR and static site generation for content-heavy sites. CruzJS is oriented toward dynamic applications.
- **Hiring and community.** Many more developers know Next.js. Documentation, Stack Overflow answers, and community resources are abundant.
- **Vercel platform.** If you are on Vercel, the integration is seamless -- preview deployments, analytics, edge middleware, and image optimization.
- **Flexibility.** Next.js does not prescribe your backend architecture. Use any ORM, any auth library, any API pattern.

## Where CruzJS Wins

- **Backend structure.** DI, services, and modules give your backend clear organization. Next.js API routes and Server Actions can become disorganized as apps grow.
- **Built-in auth and orgs.** Social auth (7 OAuth providers: GitHub, Google, Discord, Twitter, LinkedIn, Microsoft, Apple), two-factor auth (TOTP + backup codes), magic links (passwordless), API keys, RBAC, team management, and member invitations are included. Next.js requires NextAuth.js or a third-party service plus your own org logic.
- **CRUD Factory.** `createCrud()` factory and `BaseCrudService` eliminate boilerplate for standard data operations.
- **Real-time.** BroadcastModule provides SSE and presence out of the box.
- **Type-safe API layer.** tRPC provides end-to-end type safety without code generation. Next.js Server Actions offer type safety within a file but lack a structured API layer for client-side calls.
- **Cloudflare-native.** D1 database, KV cache, R2 file storage, Queues, and Workers are first-class. Next.js on Cloudflare is possible but not the primary target.
- **Edge-first.** Every request runs on Cloudflare's global edge network. Next.js edge functions exist but the default runtime is Node.js.
- **Opinionated conventions.** One way to do database access, auth, API calls, and deployment. Less decision fatigue for new projects.
- **Integrated CLI.** `cruz dev`, `cruz deploy`, `cruz db migrate`, `cruz new worker` -- one tool for everything.

## When to Choose Next.js

- You want the largest possible ecosystem and community support.
- You are deploying to Vercel or need Node.js compatibility.
- You are building a content-heavy site that benefits from ISR and static generation.
- You want React Server Components for minimal client JavaScript.
- Your backend is simple (CRUD, third-party APIs) and does not need heavy structure.
- Your team already knows Next.js.
- You need flexibility to choose your own backend tools.

## When to Choose CruzJS

- You are building a SaaS application with user accounts, organizations, and RBAC.
- You want backend structure (DI, services, modules) integrated with your React frontend.
- You are deploying to Cloudflare and want native D1, KV, R2, and Queues integration.
- You prefer a single opinionated framework over assembling libraries.
- You want auth and org management out of the box, not bolted on.
- You value type-safe APIs (tRPC) for client-server communication.

## The Honest Take

Next.js is the safe choice. It has the ecosystem, the community, the documentation, and the track record. If you are unsure, Next.js is probably the right call.

CruzJS makes sense when your application is a SaaS product that needs serious backend structure -- DI, services, auth, org management, RBAC -- and you want an integrated deployment story on Cloudflare's edge. Next.js can do all of those things, but you will assemble them yourself from different libraries and make them work together. CruzJS provides an integrated experience at the cost of ecosystem size.

The frameworks are also philosophically different. Next.js leans into React as the abstraction layer for everything (RSC, Server Actions). CruzJS separates frontend and backend more clearly, with React handling the UI and a service-oriented backend handling business logic. Which approach you prefer often comes down to how complex your backend is.
