---
title: CruzJS vs Laravel
description: Comparing CruzJS with its biggest inspiration -- PHP's batteries-included framework
---

Laravel is the single biggest inspiration behind CruzJS. If you know Laravel, you will feel at home in CruzJS -- the service provider pattern, the CLI experience, the convention-over-configuration philosophy, and the "batteries included" approach were all borrowed directly from Laravel. This comparison is written with deep respect for a framework that has set the gold standard for developer experience.

## Philosophy

Laravel and CruzJS share the same core belief: **developers should spend time building features, not wiring together infrastructure.** Both frameworks are opinionated, provide sensible defaults, and include everything you need out of the box.

Laravel proved that an opinionated, full-stack framework with a unified CLI, built-in auth, an ORM, queue workers, events, and mail could make developers extraordinarily productive. CruzJS attempts to bring that same philosophy to the TypeScript and edge computing world.

| Principle | Laravel | CruzJS |
|-----------|---------|--------|
| Convention over configuration | Yes | Yes |
| Batteries included | Yes | Yes |
| Service Providers | Yes (core pattern) | Yes (borrowed from Laravel) |
| Unified CLI | Artisan | Cruz CLI |
| Opinionated structure | Yes | Yes |
| First-party packages | Extensive (Sanctum, Horizon, Nova, etc.) | Growing (auth, orgs, admin) |

## Key Differences

| Aspect | Laravel | CruzJS |
|--------|---------|--------|
| Language | PHP | TypeScript |
| Runtime | PHP-FPM / Octane | Cloudflare Workers/Pages (V8 isolates) |
| ORM | Eloquent (Active Record) | Drizzle (Data Mapper) |
| Database | MySQL, PostgreSQL, SQLite | Drizzle ORM -- D1 on Cloudflare (SQLite locally) |
| Views | Blade, Livewire, Inertia | React + React Router v7 (SSR) |
| UI Components | Blade components (manual), Jetstream starter kit | 124+ built-in components (forms, tables, layouts, marketing blocks) — zero deps |
| API layer | REST / JSON Resources | tRPC (end-to-end type safety) |
| DI container | Laravel IoC Container | Inversify |
| Auth | Laravel Breeze / Fortify / Sanctum | Built-in (email/password, 7 OAuth providers, 2FA, magic links, API keys, RBAC) |
| Deployment | Forge, Vapor, any PHP host | Cloudflare (multi-cloud planned) |
| File storage | Flysystem (S3, local, etc.) | Cloudflare R2 |
| Cache / KV | Redis, Memcached, file | Cloudflare KV |
| Queues | Redis, SQS, database | Cloudflare Queues |
| Type safety | Limited (PHP 8 types help) | Full stack via TypeScript + tRPC |
| Maturity | 10+ years | New framework |

## What CruzJS Borrows from Laravel

CruzJS does not hide its influences. Several core patterns were adopted directly:

**Service Providers.** Laravel's service provider pattern for bootstrapping application services is mirrored in CruzJS's `@Module()` decorators and container modules. Both use a register/boot lifecycle.

**Artisan-like CLI.** Laravel's `php artisan` maps to CruzJS's `cruz` CLI. The command structure is intentionally similar -- `cruz db migrate`, `cruz db seed`, `cruz new`, and `cruz deploy` all echo Artisan's ergonomics.

**Convention-over-configuration.** Like Laravel, CruzJS provides a standard project structure, naming conventions, and default behaviors that let you start building immediately without configuration decisions.

**Events and Jobs.** Laravel's event/listener and queue job patterns are present in CruzJS as domain events and background jobs.

**Migrations.** Both use a migration-based approach to database schema management, though CruzJS delegates to Drizzle Kit rather than building its own migration system.

## Where Laravel Wins

**Ecosystem maturity.** Laravel has over a decade of packages, tutorials, courses, Stack Overflow answers, and community knowledge. When you hit a problem in Laravel, someone has solved it before. CruzJS cannot match this today.

**First-party tooling.** Forge, Vapor, Nova, Horizon, Telescope, Pulse, Cashier, Socialite, Scout -- Laravel's first-party package ecosystem is unmatched. Each one is polished and well-documented.

**Hosting flexibility.** Laravel runs on any PHP host, from a $5 shared server to AWS Lambda via Vapor. CruzJS targets Cloudflare today (multi-cloud is planned), but the ecosystem is still maturing compared to Laravel's hosting options.

**Community size.** Laracasts, Laracon, thousands of packages, active forums, and a massive hiring market. Laravel developers are abundant and easy to find.

**Database flexibility.** Eloquent supports MySQL, PostgreSQL, SQLite, and SQL Server with a mature query builder. CruzJS uses Drizzle ORM with D1 on Cloudflare, but Drizzle's ecosystem is younger than Eloquent's.

**Battle-tested patterns.** Laravel's patterns have been refined over a decade of real-world production use across millions of applications. Edge cases are well-handled.

## Where CruzJS Wins

**End-to-end type safety.** TypeScript from database schema to UI component, with tRPC eliminating the API boundary entirely. Changes to a tRPC procedure are caught at build time in the frontend. Laravel's PHP type system cannot match this.

**Edge deployment by default.** CruzJS applications run on Cloudflare's global edge network. A user in Tokyo hits a nearby data center, not a server in Virginia. Laravel requires Vapor + CloudFront or similar to approach this.

**Single language stack.** TypeScript for frontend, backend, API, database schema, and infrastructure configuration. No context switching between PHP and JavaScript.

**Modern React SSR.** React Router v7 with server-side rendering, streaming, and nested layouts is a more interactive frontend story than Blade or even Livewire for complex UIs.

**Cold start performance.** Cloudflare Workers start in under 5ms. Even Laravel Octane has measurably higher cold start times, and traditional PHP-FPM is significantly slower.

**Comprehensive built-in auth.** Social auth (7 OAuth providers: GitHub, Google, Discord, Twitter, LinkedIn, Microsoft, Apple), two-factor auth (TOTP + backup codes), magic links (passwordless), and API keys are all built-in. Laravel has similar features across Breeze, Fortify, Sanctum, and Socialite, but CruzJS bundles them into a single integrated module.

**CRUD Factory.** `createCrud()` factory and `BaseCrudService` eliminate boilerplate for standard data operations, similar in spirit to Laravel's resource controllers but with full type safety.

**Real-time via BroadcastModule.** SSE and presence built-in without requiring a separate service like Pusher or Laravel Echo.

**Infrastructure as deployment.** `cruz deploy` provisions D1 databases, KV namespaces, R2 buckets, and deploys code in one command. No separate infrastructure management.

## When to Choose Each

**Choose Laravel when:**
- You need the safety of a battle-tested, mature ecosystem
- Your team knows PHP and values stability over novelty
- You need maximum hosting flexibility
- You want access to the richest first-party package ecosystem in any framework
- You need database flexibility (PostgreSQL, MySQL, etc.)
- Hiring PHP/Laravel developers is a priority

**Choose CruzJS when:**
- Your team is TypeScript-first and wants one language across the stack
- End-to-end type safety is a priority
- You want edge deployment without infrastructure management
- Low latency globally matters for your use case
- You value the Laravel philosophy but want it in the TypeScript world
- You are building a new SaaS and want built-in auth, orgs, and RBAC

## Honest Assessment

Laravel is the framework CruzJS wants to be when it grows up. Its developer experience is the benchmark, its ecosystem is the envy of every framework author, and its community is one of the best in software development.

CruzJS does not claim to replace Laravel. It aims to bring the same philosophy -- the same joy of development -- to teams that have chosen TypeScript and the edge. If Laravel had been built today, in TypeScript, for Cloudflare Workers, it might look something like CruzJS.

The gap in maturity is real and significant. But the combination of TypeScript type safety, edge performance, and Laravel-inspired conventions makes CruzJS a compelling choice for teams already in the TypeScript ecosystem who want that batteries-included experience without reaching for PHP.
