---
title: CruzJS vs NestJS
description: Comparing CruzJS and NestJS -- two DI-driven TypeScript frameworks with very different scopes.
---

CruzJS and NestJS share a love for dependency injection and modular architecture, but they solve different problems. NestJS is a mature, backend-only framework. CruzJS is a full-stack application framework that deploys to Cloudflare Workers/Pages.

## Overview

**NestJS** is the most popular enterprise Node.js framework. It brings Angular-style DI, decorators, and modules to the backend, supporting REST, GraphQL, WebSockets, and microservices. It runs on Express or Fastify and deploys to any Node.js environment.

**CruzJS** is a full-stack TypeScript framework built on React Router v7. It deploys to Cloudflare Workers/Pages. It uses Inversify-based DI with a flat container model, tRPC for type-safe APIs, and includes auth, org management, and a React frontend out of the box.

## Key Differences

| Aspect | NestJS | CruzJS |
|--------|--------|--------|
| **Scope** | Backend only | Full-stack (frontend + backend) |
| **DI system** | Custom DI with imports/exports | Inversify with flat container |
| **API layer** | REST, GraphQL, WebSockets, gRPC | tRPC (type-safe RPC) |
| **Frontend** | None (bring your own) | React Router v7 (SSR) |
| **UI Components** | No UI library | 124+ built-in components (forms, tables, layouts, marketing blocks) — zero deps |
| **Database** | TypeORM, Prisma, MikroORM, etc. | Drizzle ORM -- D1 on Cloudflare (SQLite locally) |
| **Auth** | Passport.js (assemble yourself) | Built-in (email/password, 7 OAuth providers, 2FA, magic links, API keys, RBAC) |
| **Runtime** | Node.js (Express/Fastify) | Cloudflare Workers/Pages (V8 isolates) |
| **Deploy target** | Any Node.js host | Cloudflare (multi-cloud planned) |
| **Org/team management** | Not included | Built-in with RBAC and invitations |
| **CLI** | `nest generate` scaffolding | `cruz dev/deploy/db/new` (full lifecycle) |
| **Maturity** | 7+ years, massive ecosystem | New framework, growing ecosystem |

## Module System Comparison

Both frameworks use modules to organize code, but the mechanics differ significantly.

### NestJS Modules

NestJS modules explicitly declare imports, exports, providers, and controllers. Services must be exported to be available to other modules:

```typescript
// NestJS
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Must export for other modules
})
export class UsersModule {}

@Module({
  imports: [UsersModule], // Must import to use UsersService
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
```

### CruzJS Modules

CruzJS uses a `@Module` decorator with a flat DI container -- all services registered in any module are available everywhere. No import/export ceremony:

```typescript
// CruzJS
@Module({
  providers: [UsersService],
  trpcRouters: { users: usersRouter },
})
export class UsersModule {}

@Module({
  providers: [OrdersService], // Can inject UsersService directly
  trpcRouters: { orders: ordersRouter },
})
export class OrdersModule {}
```

This is simpler but means you lose the encapsulation boundaries NestJS provides. Whether that's a trade-off you want depends on your team size and project complexity.

## API Layer Comparison

### NestJS Controller (REST)

```typescript
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
```

### CruzJS Router (tRPC)

```typescript
export const usersRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input, ctx }) => {
      return ctx.container.get(UsersService).findOne(input.id);
    }),

  create: protectedProcedure
    .input(createUserSchema)
    .mutation(({ input, ctx }) => {
      return ctx.container.get(UsersService).create(input);
    }),
});
```

With tRPC, the client gets full type inference -- no code generation, no OpenAPI specs. With NestJS, you get REST conventions, Swagger docs, and broader client compatibility.

## Where NestJS Wins

- **Maturity and stability.** NestJS has been in production at thousands of companies for years. It is battle-tested at scale.
- **Ecosystem.** Hundreds of official and community modules -- rate limiting, caching, scheduling, health checks, CQRS, and more.
- **API flexibility.** REST, GraphQL, WebSockets, gRPC, and microservice transports. CruzJS only offers tRPC out of the box.
- **Platform portability.** Deploy to AWS, GCP, Azure, any VPS, Docker, Kubernetes -- anywhere Node.js runs. CruzJS targets Cloudflare today (multi-cloud is planned), but its ecosystem is still maturing compared to NestJS's universal Node.js compatibility.
- **Encapsulation.** NestJS's import/export system enforces module boundaries, which matters for large teams.
- **Hiring.** Many developers know NestJS. Finding CruzJS developers means training them.
- **Backend complexity.** For complex backend-only systems (microservices, message queues, CQRS), NestJS has more patterns and tooling.

## Where CruzJS Wins

- **Full-stack in one framework.** Frontend (React), backend (services + tRPC), database (Drizzle), auth, and org management -- all integrated.
- **No assembly required.** NestJS gives you DI and decorators; you still need to choose and wire up an ORM, auth library, frontend framework, and deployment strategy. CruzJS makes those choices for you.
- **Edge deployment.** CruzJS deploys globally to Cloudflare's edge network. Cold starts are measured in milliseconds, not seconds.
- **Simpler DI.** `@Module` decorator with a flat container -- no imports/exports ceremony. Register a service, inject it anywhere.
- **Type-safe API layer.** tRPC gives you end-to-end type safety from database to UI with zero code generation.
- **Built-in auth and orgs.** Social auth (7 OAuth providers: GitHub, Google, Discord, Twitter, LinkedIn, Microsoft, Apple), two-factor auth (TOTP + backup codes), magic links (passwordless), API keys, RBAC, team management, and member invitations are included -- not bolted on.
- **CRUD Factory.** `createCrud()` factory and `BaseCrudService` eliminate boilerplate for standard data operations.
- **Real-time.** BroadcastModule provides SSE and presence out of the box.
- **Single CLI.** `cruz dev`, `cruz deploy`, `cruz db migrate` -- one tool for the full development lifecycle.

## When to Choose NestJS

- You are building a backend-only service or API (no frontend needed).
- You need REST APIs, GraphQL, or WebSocket support.
- You are deploying to AWS, GCP, or traditional servers.
- You need the safety of a mature, widely-adopted framework.
- Your team already knows NestJS.
- You are building microservices that communicate via message queues or gRPC.
- You need fine-grained module encapsulation for a large team.

## When to Choose CruzJS

- You are building a full-stack SaaS application.
- You want auth, orgs, RBAC, and database patterns out of the box.
- You want to deploy to Cloudflare's edge with minimal infrastructure management.
- You prefer tRPC's end-to-end type safety over REST or GraphQL.
- You want a single framework that handles frontend and backend together.
- You value convention over configuration and are comfortable with opinionated defaults.
- Your project is greenfield and you want to move fast with integrated tooling.

## The Honest Take

NestJS is the safer, more established choice. It has years of production use, a massive community, and flexibility to handle almost any backend architecture. If you are building something that needs to last and you want a large hiring pool, NestJS is hard to argue against.

CruzJS is for teams that want the DI and structure of NestJS but don't want to spend weeks assembling auth, a frontend, an ORM, and deployment infrastructure. It trades NestJS's flexibility and ecosystem size for an integrated, full-stack experience that deploys to Cloudflare's edge. If you are building a SaaS product, CruzJS gets you to a working application faster -- but you are betting on a younger framework with a smaller community.
