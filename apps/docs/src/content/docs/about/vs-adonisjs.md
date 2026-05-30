---
title: CruzJS vs AdonisJS
description: Comparing two opinionated, batteries-included TypeScript frameworks with different runtimes and rendering models.
---

CruzJS and AdonisJS are philosophically the closest frameworks on this list. Both are opinionated, batteries-included TypeScript frameworks with built-in auth, ORM, DI, and a CLI. The differences come down to runtime, rendering model, and deployment target.

## Overview

**AdonisJS** is a full-featured Node.js framework inspired by Laravel. It includes Lucid ORM, its own auth system, Edge templating (server-rendered HTML), Ace CLI, and a robust ecosystem of first-party packages. It deploys to traditional Node.js servers.

**CruzJS** is a full-stack TypeScript framework built on React Router v7. It includes Drizzle ORM, built-in auth with org management, Inversify DI, tRPC, and deploys to Cloudflare Workers/Pages.

## Key Differences

| Aspect | AdonisJS | CruzJS |
|--------|----------|--------|
| **Philosophy** | Laravel-inspired, convention over config | Batteries-included, edge-native |
| **Runtime** | Node.js | Cloudflare Workers/Pages (V8 isolates) |
| **Frontend** | Edge templates (server-rendered HTML) or separate SPA | React Router v7 (SSR) |
| **UI Components** | No UI library (Edge templates are HTML-only) | 124+ built-in components (forms, tables, layouts, marketing blocks) — zero deps |
| **ORM** | Lucid (Active Record) | Drizzle (Data Mapper) |
| **Database** | PostgreSQL, MySQL, SQLite, MSSQL | Drizzle ORM -- D1 on Cloudflare (SQLite locally) |
| **DI** | IoC container with `@inject` | Inversify with @Module() decorators |
| **API layer** | REST controllers, JSON:API | tRPC |
| **Auth** | Session-based, tokens, social auth | Email/password, 7 OAuth providers, 2FA (TOTP + backup codes), magic links, API keys, RBAC |
| **Org management** | Not included | Built-in (teams, roles, invitations) |
| **CLI** | Ace CLI (`node ace`) | Cruz CLI (`cruz`) |
| **Background jobs** | Bull/BullMQ integration | Cloudflare Queues |
| **File storage** | Drive (local, S3, GCS) | R2 |
| **Maturity** | 8+ years, v6 stable | New framework |

## Convention Comparison

Both frameworks value convention over configuration. Here is how similar tasks look in each.

### Defining a Model / Schema

```typescript
// AdonisJS -- Lucid Model (Active Record)
export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column()
  declare fullName: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}

// CruzJS -- Drizzle Schema (Data Mapper, dialect-agnostic)
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';
export const { users } = DrizzleUniversalFactory.create((b) => ({
  users: b.table('users', {
    id: b.text('id').primaryKey(),
    email: b.text('email').notNull().unique(),
    fullName: b.text('full_name').notNull(),
    createdAt: b.timestamp('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  }),
}))();
```

### Auth-Protected Route

```typescript
// AdonisJS
Route.get('/dashboard', async ({ auth, view }) => {
  const user = auth.user!
  return view.render('dashboard', { user })
}).middleware('auth')

// CruzJS
export async function loader({ context }: Route.LoaderArgs) {
  const user = context.auth.requireUser();
  return { user };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  return <DashboardView user={loaderData.user} />;
}
```

### Service with DI

```typescript
// AdonisJS
@inject()
export default class OrdersService {
  constructor(private usersService: UsersService) {}

  async createOrder(userId: number, items: OrderItem[]) {
    const user = await this.usersService.find(userId)
    // ...
  }
}

// CruzJS
@injectable()
export class OrdersService {
  constructor(
    @inject(UsersService) private usersService: UsersService
  ) {}

  async createOrder(userId: string, items: OrderItem[]) {
    const user = await this.usersService.find(userId);
    // ...
  }
}
```

The patterns are strikingly similar. The main differences are the ORM style and decorator syntax.

### CLI Comparison

```bash
# AdonisJS
node ace make:controller Users    # Scaffold controller
node ace make:model User          # Scaffold model
node ace migration:run            # Run migrations
node ace db:seed                  # Seed database
node ace serve --watch            # Dev server

# CruzJS
cruz dev                          # Dev server
cruz db generate                  # Generate migration from schema
cruz db migrate                   # Run migrations
cruz db seed                      # Seed database
cruz new worker notifications     # Scaffold Worker
cruz deploy production            # Deploy to Cloudflare
```

## Where AdonisJS Wins

- **Maturity.** AdonisJS has been refined over 8+ years. Its APIs are stable, well-documented, and battle-tested.
- **Database flexibility.** Lucid ORM supports PostgreSQL, MySQL, SQLite, and MSSQL. CruzJS uses Drizzle ORM with D1 on Cloudflare and PostgreSQL/MySQL/Aurora on other platforms, but Lucid's Active Record pattern and database support are more mature.
- **Server-side rendering.** Edge templates are fast and simple for server-rendered HTML. No client-side JavaScript framework overhead.
- **Traditional deployment.** Deploy to any Node.js host -- VPS, Docker, AWS, Railway, Render. CruzJS targets Cloudflare today (multi-cloud is planned) but AdonisJS's Node.js compatibility is more universal.
- **Background jobs.** Bull/BullMQ integration with Redis is more powerful and flexible than Cloudflare Queues.
- **Ecosystem of first-party packages.** Mail, social auth, bouncer (authorization), drive (file storage), health checks -- all maintained by the core team.
- **Active Record ORM.** Lucid's Active Record pattern is more productive for CRUD operations and feels natural for developers coming from Laravel or Rails.
- **Community.** Larger community, more tutorials, more Stack Overflow answers.

## Where CruzJS Wins

- **Integrated React frontend.** CruzJS includes React Router v7 for a modern SPA-like experience with SSR. AdonisJS separates backend and frontend -- you either use Edge templates or build a separate SPA.
- **Edge deployment.** Cloudflare's global edge network. No cold starts on Cloudflare, no server management, automatic global distribution.
- **Org management and RBAC.** Teams, roles, member invitations, and org-scoped data are built in. AdonisJS has auth but not multi-tenancy.
- **Comprehensive auth.** Social auth (7 OAuth providers: GitHub, Google, Discord, Twitter, LinkedIn, Microsoft, Apple), two-factor auth (TOTP + backup codes), magic links (passwordless), and API keys are all built-in.
- **CRUD Factory.** `createCrud()` factory and `BaseCrudService` eliminate boilerplate for standard data operations.
- **Real-time.** BroadcastModule provides SSE and presence out of the box.
- **Type-safe API layer.** tRPC gives full type inference from backend to frontend. No API documentation to maintain, no types to manually sync.
- **Cloudflare platform integration.** D1, KV, R2, Queues, Workers, and Workflows are first-class citizens. AdonisJS needs external services for cache, file storage, and background jobs.
- **Infrastructure as code.** `cruz init`, `cruz deploy`, and `cruz destroy` manage your entire Cloudflare infrastructure.
- **Cost at scale.** Cloudflare Workers pricing can be significantly cheaper than running Node.js servers, especially for bursty traffic.

## When to Choose AdonisJS

- You want a proven, mature framework with a stable API.
- You need a traditional SQL database (PostgreSQL, MySQL).
- You prefer server-rendered HTML over React SPAs.
- You are deploying to traditional servers, Docker, or PaaS platforms.
- You need powerful background job processing with Redis.
- You are coming from Laravel or Rails and want familiar conventions.
- You prefer a battle-hardened framework with a decade of production use.

## When to Choose CruzJS

- You are building a SaaS product with a React frontend.
- You want org management, RBAC, and team features out of the box.
- You are deploying to Cloudflare and want native platform integration.
- You want end-to-end type safety with tRPC.
- You prefer edge deployment over managing servers.
- You want frontend and backend in a single, cohesive framework.

## The Honest Take

AdonisJS and CruzJS share more DNA than any other pair on this comparison list. Both believe in opinionated frameworks that make decisions for you. Both provide auth, ORM, DI, and a CLI. If you like one, you will probably appreciate the other.

The real decision comes down to two questions:

1. **Do you want React?** If yes, CruzJS integrates it. AdonisJS requires a separate frontend project or Edge templates.
2. **Where are you deploying?** CruzJS targets Cloudflare today (multi-cloud is planned). If you need traditional Node.js server deployment with maximum hosting flexibility, AdonisJS is the more established choice.

AdonisJS has the advantage of maturity, database flexibility, and a larger community. CruzJS has the advantage of integrated React, edge deployment, and built-in org management. Both are excellent frameworks made by developers who believe the JavaScript ecosystem needs more structure.
