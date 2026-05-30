---
title: Introduction
description: What is CruzJS, its philosophy, and when to use it.
---

CruzJS is a full-stack TypeScript framework for building and deploying web applications on **Cloudflare's edge network** — Workers/Pages, D1, KV, R2, Queues, and Workers AI. It combines React Router v7, tRPC, Drizzle ORM, and Inversify into an opinionated, production-ready stack that handles everything from database migrations to multi-tenant auth to one-command deploys.

> **Multi-cloud is on the [roadmap](/adapters/overview).** A runtime-adapter layer is in place and adapter packages for AWS, GCP, Azure, DigitalOcean, and Docker exist in the monorepo, but Cloudflare is the only supported, documented target today.

## Philosophy

### Opinionated by design

CruzJS makes decisions so you don't have to. The database ORM, API layer, DI container, auth system, and deployment target are all chosen and integrated for you. This isn't a collection of loosely coupled libraries — it's a framework where every piece is designed to work with every other piece.

This trades flexibility for velocity. You won't swap Drizzle for Prisma or tRPC for GraphQL. In exchange, you get a stack where the service you inject in a tRPC router uses the same database instance that your migration CLI targets, your auth middleware populates the same context your permission checks read, and your deploy command knows about your D1 databases, KV namespaces, and R2 buckets.

### Built for Cloudflare

CruzJS targets Cloudflare's edge: D1, KV, R2, Queues, and Workers AI, with a runtime adapter that wires those bindings into your application. Infrastructure is accessed through abstract bindings (database, cache, queue, storage, AI) rather than cloud SDKs — the same abstraction that makes the [multi-cloud roadmap](/adapters/overview) possible, but today every target is Cloudflare.

Local development uses transparent facades: a local SQLite database, local file storage that mirrors R2's API, and in-memory caching that acts like KV. You write code once and it works identically in dev and on the edge.

### Type-safe end-to-end

Types flow from your database schema to your API response to your React component without a single manual type annotation in between. Drizzle infers types from your schema definition. tRPC carries those types across the network boundary. Your React component destructures the response and TypeScript knows every field.

When you rename a database column, the compiler tells you every query, every API procedure, and every component that needs updating. When you add a required field to an input schema, the compiler tells you every call site that's missing it.

## Key Features

- **React Router v7** — File-based routing, SSR, streaming, loaders, and actions running on Cloudflare Pages
- **tRPC** — End-to-end type-safe APIs with Zod validation. Three procedure types: public, protected (authenticated), and org-scoped
- **Drizzle ORM** — Type-safe SQL queries with automatic migration generation, studio UI, and remote execution against D1 (SQLite locally)
- **Inversify DI** — `@Injectable()` services, `@Module()` composition, constructor injection, multi-binding, and factory providers
- **Multi-tenant auth** — Session-based authentication with `@cruzjs/core`. Organization scoping, role-based permissions (Owner/Admin/Member/Viewer), and invitation flows are provided by `@cruzjs/start`
- **Domain events** — Synchronous and queued event listeners for decoupled side effects
- **Background jobs** — Priority-based job queue with retry logic, exponential backoff, and lookup keys
- **Unified CLI** — `cruz dev`, `cruz db migrate`, `cruz deploy production`, `cruz new worker`, and more
- **Module pattern** -- Register feature modules via `createCruzApp({ modules: [...] })` without modifying framework code. Each feature owns its schema, service, router, and events
- **Cloudflare bindings** -- D1, KV, R2, Queues, and Workers AI with automatic local facades for development
- **Runtime adapter layer** -- The binding abstraction behind the [multi-cloud roadmap](/adapters/overview) (Cloudflare is the supported target today)

## Architecture Overview

```
Request Flow:

  Browser
    |
    v
  Cloudflare Pages (React Router v7)
    |
    ├── SSR Route (loader/action)
    |     |
    |     v
    |   handleCruzLoader / handleCruzAction
    |     |
    |     v
    |   React Component (server-rendered)
    |
    └── /api/trpc/* (API endpoint)
          |
          v
        tRPC Router
          |
          ├── publicProcedure     (no auth)
          ├── protectedProcedure  (session required)
          └── orgProcedure        (org context required)
                |
                v
              requirePermission()
                |
                v
              Service Class (from DI container)
                |
                v
              Drizzle Query → Database (D1, PostgreSQL, etc.)
                |
                v
              JSON Response → Client
```

```
Package Structure:

  packages/
    core/       @cruzjs/core     Framework runtime: DI, auth, tRPC, database, events, jobs
    start/      @cruzjs/start    Theming, shared layouts, organizations, roles, permissions
    pro/        @cruzjs/saas      Billing, admin dashboard, audit logging
    ui/         @cruzjs/ui       UI component library (RichTextEditor, DataTable, AppShell, etc.)
    cli/        @cruzjs/cli      Unified CLI for dev, db, deploy, scaffold

  apps/
    web/        Your application: features, routes, components, database schema

  external-processes/
    <name>/     Standalone Workers, Workflows, Queue consumers
```

## How CruzJS Compares

### vs. Next.js

Next.js is a React framework focused on rendering strategies (SSR, SSG, ISR) and routing. It doesn't include a database layer, API framework, DI container, or auth system — you bring your own. CruzJS is a full-stack framework that includes all of these, integrated and ready to deploy. If you want maximum flexibility in choosing your backend stack, use Next.js. If you want a complete, opinionated stack that deploys to Cloudflare's edge, use CruzJS.

### vs. NestJS

NestJS is a backend framework with DI, modules, and decorators — similar patterns to CruzJS. But NestJS is backend-only (you pair it with a separate frontend), uses Express/Fastify, and doesn't include a database ORM or frontend rendering. CruzJS covers the full stack from database to UI, runs natively on Cloudflare Workers, and uses tRPC instead of REST/GraphQL for type-safe client-server communication.

### vs. Laravel

Laravel is the closest philosophical match. Like Laravel, CruzJS is opinionated, includes DI, modules, database migrations, auth, events, jobs, and a CLI. The difference is the technology: CruzJS is TypeScript end-to-end (not PHP + JS), deploys to Cloudflare's edge (not traditional PHP servers), and uses React for the frontend (not Blade templates). If you love Laravel's developer experience but want a TypeScript stack, CruzJS is the answer.

### vs. Remix / React Router v7

CruzJS is built *on top of* React Router v7 (the framework formerly known as Remix). React Router provides the routing and SSR. CruzJS adds everything else: the DI system, tRPC integration, database layer, auth, organizations, events, jobs, and the deployment CLI. Think of CruzJS as "React Router v7 + a complete backend framework."

## When to Use CruzJS

CruzJS is a good fit when you:

- Want a **full-stack TypeScript** application with SSR
- Are deploying to **Cloudflare** (Workers/Pages + D1/KV/R2)
- Need **multi-tenant** features (organizations, roles, permissions) -- provided by `@cruzjs/start`
- Value **type safety** across the entire stack
- Prefer an **opinionated framework** over assembling libraries
- Want **one CLI** for development, database management, and deployment

CruzJS is not a good fit when you:

- Prefer GraphQL or REST over tRPC
- Need a backend-only framework without frontend opinions
- Want maximum flexibility in choosing each layer of the stack
