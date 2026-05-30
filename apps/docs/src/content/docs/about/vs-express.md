---
title: CruzJS vs Express
description: Comparing CruzJS and Express -- a modern full-stack framework versus the most widely used Node.js server library.
---

Express is the foundation of the Node.js ecosystem. Nearly every Node.js developer has used it. CruzJS represents a different generation of web development -- opinionated, full-stack, and edge-native. Comparing them is less about which is better and more about how the JavaScript ecosystem has evolved.

## Overview

**Express** is a minimal, unopinionated web framework for Node.js. It provides routing, middleware, and HTTP utilities. Everything else -- database, auth, validation, templating, structure -- comes from npm packages that you choose and integrate yourself. It has been the default Node.js server framework since 2010.

**CruzJS** is a full-stack TypeScript framework built on React Router v7. It includes DI, tRPC, Drizzle ORM, built-in auth, org management, and a React frontend. It is opinionated about tooling and deploys to Cloudflare Workers/Pages.

## Key Differences

| Aspect | Express | CruzJS |
|--------|---------|--------|
| **Philosophy** | Minimal, middleware-based | Opinionated, batteries-included |
| **Scope** | HTTP server | Full-stack application framework |
| **Frontend** | None (serve static files or use template engine) | React Router v7 (SSR) |
| **UI Components** | No UI library | 124+ built-in components (forms, tables, layouts, marketing blocks) — zero deps |
| **Database** | Bring your own (Sequelize, Knex, Prisma, etc.) | Drizzle ORM -- D1 on Cloudflare (SQLite locally) |
| **Auth** | Passport.js or build your own | Built-in (email/password, 7 OAuth providers, 2FA, magic links, API keys, RBAC) |
| **Type safety** | Optional (JS or TS) | TypeScript-first, tRPC end-to-end |
| **DI** | None | Inversify with @Module() decorators |
| **Runtime** | Node.js | Cloudflare Workers/Pages (V8 isolates) |
| **API style** | REST (middleware + routes) | tRPC |
| **Structure** | You decide | Convention-based |
| **Ecosystem** | Largest in Node.js | Small, growing |
| **Maturity** | 14+ years | New framework |
| **Org management** | None | Built-in |

## Code Comparison

### Basic CRUD Endpoint

```typescript
// Express
const express = require("express");
const { body, validationResult } = require("express-validator");
const router = express.Router();

router.get("/users/:id", async (req, res) => {
  try {
    const user = await db.query("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/users",
  authMiddleware,
  body("email").isEmail(),
  body("name").isLength({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await db.query(
        "INSERT INTO users (email, name) VALUES (?, ?)",
        [req.body.email, req.body.name]
      );
      res.status(201).json(user);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
```

```typescript
// CruzJS
@injectable()
export class UsersService {
  constructor(@inject(DB) private db: DrizzleDB) {}

  async getById(id: string) {
    return this.db.select().from(users).where(eq(users.id, id)).get();
  }

  async create(data: { email: string; name: string }) {
    return this.db.insert(users).values(data).returning().get();
  }
}

export const usersRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input, ctx }) =>
      ctx.container.get(UsersService).getById(input.id)
    ),

  create: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().min(1),
    }))
    .mutation(({ input, ctx }) =>
      ctx.container.get(UsersService).create(input)
    ),
});
```

CruzJS provides type-safe input validation (Zod via tRPC), automatic error handling, and typed responses. Express requires manual validation, error handling, and has no built-in type safety for request/response shapes.

### Auth Middleware

```typescript
// Express
const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Usage
router.get("/dashboard", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});
```

```typescript
// CruzJS -- auth is built in
export async function loader({ context }: Route.LoaderArgs) {
  const user = context.auth.requireUser();
  return { user };
}

// Or in tRPC -- protectedProcedure handles it
export const dashboardRouter = router({
  getData: protectedProcedure.query(({ ctx }) => {
    // ctx.user is already authenticated and typed
    return { user: ctx.user };
  }),
});
```

### Project Structure

```
# Express -- you decide (this is one common pattern)
src/
  routes/
    users.js
    orders.js
  middleware/
    auth.js
    validation.js
  models/
    user.js
    order.js
  services/
    userService.js
  config/
    database.js
  app.js
  server.js

# CruzJS -- convention-based
apps/web/src/
  features/
    users/
      users.service.ts
      users.router.ts
      users.module.ts
  routes/
    dashboard/
      route.tsx
  database/
    schema.ts
```

With Express, you invent your own structure. With CruzJS, the structure is defined for you.

## Where Express Wins

- **Ecosystem.** Express has the largest middleware ecosystem of any Node.js framework. Rate limiting, CORS, compression, sessions, logging -- there is a package for everything.
- **Simplicity.** Express is easy to learn. A "Hello World" is five lines. The mental model (request in, middleware chain, response out) is straightforward.
- **Flexibility.** No opinions about structure, ORM, templating, or deployment. Build whatever you want, however you want.
- **Universal knowledge.** Almost every Node.js developer knows Express. Hiring is easy. Every tutorial starts with it.
- **Platform portability.** Runs anywhere Node.js runs -- any cloud, any VPS, any container.
- **Lightweight.** Express adds minimal overhead. No DI container, no ORM, no framework initialization.
- **Incremental adoption.** Add one route at a time. No framework to learn upfront.
- **WebSockets and real-time.** Easy integration with Socket.io and similar libraries. CruzJS's Cloudflare Workers environment has limited WebSocket support.

## Where CruzJS Wins

- **No assembly required.** Express gives you HTTP handling and says "good luck." CruzJS includes database, auth, orgs, API layer, frontend, and deployment -- all integrated.
- **Type safety end-to-end.** tRPC ensures your frontend and backend agree on types without API documentation or code generation. Express has no built-in type safety.
- **Modern architecture.** DI, services, modules, domain events -- patterns that Express developers bolt on after the project is already messy.
- **Full-stack.** Express serves JSON. CruzJS serves a complete React application with SSR, plus a type-safe API layer.
- **Built-in auth and orgs.** Social auth (7 OAuth providers: GitHub, Google, Discord, Twitter, LinkedIn, Microsoft, Apple), two-factor auth (TOTP + backup codes), magic links (passwordless), API keys, RBAC, team management, invitations. Express requires choosing and wiring up Passport.js, sessions, and building org logic from scratch.
- **Edge deployment.** Cloudflare Workers run globally with millisecond cold starts. Express on a single-region server has latency for distant users.
- **CRUD Factory.** `createCrud()` factory and `BaseCrudService` eliminate boilerplate for standard data operations.
- **Real-time.** BroadcastModule provides SSE and presence out of the box.
- **Security defaults.** CruzJS includes CSRF protection, secure session handling, and input validation by default. Express requires adding helmet, cors, csrf, and validation middleware manually.
- **Database tooling.** Migrations, seeding, and a visual studio through the CLI. Express developers stitch together Knex/Prisma/Sequelize CLI tools.

## When to Choose Express

- You are building a simple API or microservice.
- You want maximum flexibility and control over every architectural decision.
- You need to deploy to traditional Node.js hosting.
- You are prototyping quickly and want the fastest possible "request to response" setup.
- Your team knows Express well and has established patterns.
- You need WebSockets or real-time features.
- You are building something that does not fit the SaaS application mold.

## When to Choose CruzJS

- You are building a full-stack SaaS application.
- You want structure and conventions instead of inventing your own.
- You need auth, org management, RBAC, and multi-tenancy.
- You want type safety from database to browser.
- You are deploying to Cloudflare and want native platform integration.
- You prefer spending time on your product, not on wiring frameworks together.

## A Note on Express v5

Express v5 has been in development for years and brings some modernizations (promise support, better routing). However, it does not fundamentally change what Express is: a minimal HTTP framework. The gap between Express and CruzJS is not about Express's age -- it is about scope. Express is a foundation. CruzJS is a finished building.

## The Honest Take

Express is not a competitor to CruzJS in the traditional sense. It is an ancestor. Express proved that JavaScript could be a serious server-side language. Every framework that followed -- including CruzJS -- builds on ideas Express popularized.

Today, Express is best for developers who want full control, small APIs, or projects where the overhead of a full framework is not justified. CruzJS is for developers who have built Express applications before, grown tired of assembling the same packages over and over, and want a framework that provides the full stack out of the box.

If you are starting a new SaaS project and reaching for Express, Passport.js, Prisma, a React setup, and a deployment pipeline -- stop and consider whether a framework like CruzJS (or NestJS, or AdonisJS) would save you the assembly work. The Node.js ecosystem has matured past the point where everyone needs to build from raw middleware.
