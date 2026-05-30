---
title: CruzJS vs Ruby on Rails
description: Comparing CruzJS with the framework that pioneered convention over configuration
---

Ruby on Rails changed web development forever. Its convention-over-configuration philosophy, emphasis on developer happiness, and "omakase" approach to framework design influenced every full-stack framework that followed -- including CruzJS. This comparison explores how the two frameworks relate, where they differ, and when each makes sense.

## Philosophy

Rails and CruzJS share a fundamental belief: **the framework should make decisions so developers can focus on building.** Rails calls this the "omakase" approach -- a curated, opinionated set of defaults chosen by the framework authors. CruzJS embraces the same idea.

| Principle | Rails | CruzJS |
|-----------|-------|--------|
| Convention over configuration | Pioneered it | Adopted it |
| Opinionated defaults | "Omakase" | Batteries included |
| Developer happiness | Core value | Core value |
| Generators / scaffolding | `rails generate` | `cruz new` |
| Unified CLI | `rails` / `rake` | `cruz` |
| MVC / structured architecture | Yes (MVC) | Yes (Service-Router-React) |
| "Don't repeat yourself" | Core principle | Core principle |
| Monolith first | Yes | Yes |

## Architecture Comparison

Rails follows **Model-View-Controller (MVC)**. CruzJS follows a **Service-Router-React** pattern with dependency injection, though the spirit is similar -- clear separation of data, logic, and presentation.

| Layer | Rails | CruzJS |
|-------|-------|--------|
| Data | ActiveRecord models | Drizzle schema + service classes |
| Business logic | Controllers + service objects | tRPC routers + injected services |
| Presentation | ERB / Hotwire / Turbo | React components (SSR) |
| Routing | `routes.rb` (resource-based) | React Router v7 (file-based) + tRPC |
| Background work | ActiveJob + Sidekiq | Cloudflare Queues + Workers |
| DI / IoC | Rare (Ruby's open classes) | Explicit (Inversify, `@Module()`) |

## Key Differences

| Aspect | Rails | CruzJS |
|--------|-------|--------|
| Language | Ruby | TypeScript |
| Runtime | Puma / Passenger (MRI, JRuby) | Cloudflare Workers/Pages (V8 isolates) |
| ORM | ActiveRecord (Active Record pattern) | Drizzle (Data Mapper pattern) |
| Database | PostgreSQL, MySQL, SQLite | Drizzle ORM -- D1 on Cloudflare (SQLite locally) |
| Frontend | ERB + Hotwire / Turbo / Stimulus | React + React Router v7 (SSR) |
| UI Components | ViewComponent / Stimulus (minimal, BYO design system) | 124+ built-in components (forms, tables, layouts, marketing blocks) — zero deps |
| API | REST (Jbuilder, ActiveModel Serializers) | tRPC (end-to-end typed) |
| Type safety | Limited (Sorbet, optional) | Native (TypeScript throughout) |
| Deployment | Heroku, Render, Fly.io, any server | Cloudflare (multi-cloud planned) |
| File storage | ActiveStorage (S3, GCS, Azure, local) | Cloudflare R2 |
| Cache | Redis, Memcached, file | Cloudflare KV |
| WebSockets | ActionCable | Cloudflare Durable Objects |
| Maturity | 20+ years | New framework |
| Community | Large, passionate | Early stage |

## Where Rails Wins

**Rapid prototyping speed.** Rails remains one of the fastest frameworks for going from idea to working application. `rails new`, `rails generate scaffold`, and ActiveRecord migrations let you have a functional CRUD app in minutes. Two decades of refinement have made this workflow exceptionally smooth.

**Maturity and ecosystem.** RubyGems has thousands of well-maintained gems for nearly every use case. Devise for auth, Sidekiq for jobs, Pundit for authorization, RSpec for testing -- these libraries have years of production hardening.

**ActiveRecord.** Love it or not, ActiveRecord is one of the most productive ORMs ever built. Associations, scopes, callbacks, validations, and query chaining make data access concise and expressive. Drizzle is capable but younger.

**Hotwire / Turbo.** Rails' answer to modern frontend interactivity is elegant. Turbo Frames and Turbo Streams provide SPA-like experiences without writing JavaScript. For applications that do not need complex client-side state, this is a compelling approach.

**Community culture.** The Rails community values craft, readability, and developer happiness. RailsConf, RubyConf, a wealth of books (Agile Web Development with Rails, Rails Way), and thoughtful leaders make it a welcoming ecosystem.

**Hosting flexibility.** Rails runs on Heroku, Render, Fly.io, AWS, bare metal, or any server with Ruby. CruzJS targets Cloudflare today (multi-cloud is planned), but Rails' hosting ecosystem is more universal.

**Job market.** Rails developers are established professionals, and many companies have large Rails codebases that need maintenance and growth.

## Where CruzJS Wins

**End-to-end type safety.** TypeScript types flow from Drizzle schema through tRPC routers to React components without a seam. Rename a database column and your editor shows every place that needs updating. Rails with Ruby is dynamically typed -- Sorbet helps but adoption is partial and the type coverage is not comparable.

**Single language.** CruzJS uses TypeScript for frontend, backend, API, database schema, and deployment. Rails uses Ruby for the backend and, despite Hotwire's minimal-JS approach, complex frontends still require JavaScript. The language boundary is unavoidable for rich client-side applications.

**Edge deployment.** CruzJS applications run on Cloudflare's edge network in 300+ locations globally. Every user gets low-latency responses from a nearby node. Rails runs on centralized servers, and getting to the edge requires CDN layers and careful architecture.

**Type-safe API layer.** tRPC eliminates the gap between client and server. No serializers, no schema files, no code generation -- call server functions from the client with full autocomplete and type checking. Rails API development, while productive, lacks this level of type integration.

**Cold start performance.** Cloudflare Workers start in under 5ms. Rails applications have notoriously slow boot times (seconds to tens of seconds), which affects deployment strategies, testing speed, and serverless viability.

**Built-in multi-tenancy.** CruzJS includes organizations, team management, RBAC, and member invitations out of the box. In Rails, multi-tenancy requires gems like Apartment or Acts As Tenant, plus manual auth and authorization setup.

**Comprehensive built-in auth.** Social auth (7 OAuth providers: GitHub, Google, Discord, Twitter, LinkedIn, Microsoft, Apple), two-factor auth (TOTP + backup codes), magic links (passwordless), and API keys are all built-in. Rails requires Devise plus multiple gems (omniauth, devise-two-factor) to achieve the same.

**CRUD Factory.** `createCrud()` factory and `BaseCrudService` eliminate boilerplate for standard data operations, similar in spirit to Rails scaffolding but with full type safety and runtime DI.

**Real-time via BroadcastModule.** SSE and presence built-in without requiring ActionCable's Redis dependency.

**Infrastructure as code.** `cruz deploy` provisions databases, KV stores, R2 buckets, and deploys application code. Rails deployment typically involves provisioning servers, configuring Nginx/Puma, setting up databases, and managing process supervisors -- or paying for Heroku/Render to abstract this.

## Convention Comparison

Both frameworks use conventions to reduce boilerplate. Here is how they compare:

| Convention | Rails | CruzJS |
|------------|-------|--------|
| Project structure | Standardized (`app/models`, `app/controllers`) | Standardized (`src/database`, `src/features`) |
| Database migrations | `rails db:migrate` | `cruz db migrate` |
| Scaffolding | `rails generate scaffold Post` | `cruz new worker/workflow/queue-worker` |
| Console | `rails console` | `cruz db query` |
| Seed data | `rails db:seed` | `cruz db seed` |
| Environment config | `config/environments/*.rb` | `cruz.config.ts` |
| Asset pipeline | Sprockets / Propshaft / esbuild | Vite (via React Router v7) |

## The "Omakase" Comparison

Rails describes its stack as an omakase meal -- the chef (framework author) picks the best combination. CruzJS takes the same approach for a different audience.

| Course | Rails Omakase | CruzJS Omakase |
|--------|---------------|----------------|
| Language | Ruby | TypeScript |
| ORM | ActiveRecord | Drizzle |
| Views | ERB + Hotwire | React (SSR) |
| API | REST + Jbuilder | tRPC |
| Database | PostgreSQL | D1 (Cloudflare), PostgreSQL/MySQL/Aurora (other platforms) |
| Jobs | ActiveJob + Sidekiq | Cloudflare Queues |
| Storage | ActiveStorage | R2 |
| Cache | Redis | KV |
| Deploy | Kamal / Heroku | Cloudflare (multi-cloud planned) |
| DI | Convention (rare in Ruby) | Inversify |

## When to Choose Each

**Choose Rails when:**
- Rapid prototyping speed is your top priority
- Your team knows Ruby and values its expressiveness
- You want the largest ecosystem of full-stack framework gems
- Hotwire/Turbo fits your frontend needs (server-rendered with sprinkles of interactivity)
- You need database flexibility (PostgreSQL features, complex queries)
- You want maximum hosting provider choice
- You prefer dynamic typing and Ruby's flexibility

**Choose CruzJS when:**
- Your team is TypeScript-first and wants a single language across the stack
- End-to-end type safety is important to your development workflow
- You want global edge deployment without managing infrastructure
- Low latency worldwide matters for your users
- You want convention-over-configuration but in the TypeScript world
- You are building a SaaS with teams, roles, and permissions as core features
- You prefer explicit dependency injection and compile-time safety

## Honest Assessment

Rails created the playbook that nearly every opinionated framework follows. Convention over configuration, DRY, developer happiness, rapid prototyping -- these ideas came from Rails and its community. CruzJS stands on those shoulders.

The maturity gap is real. Rails has twenty years of gems, patterns, blog posts, books, and battle-tested production deployments. CruzJS is new, its ecosystem is small, and its community is just forming.

What CruzJS offers is the Rails philosophy rebuilt for a different era -- one where TypeScript is the dominant full-stack language, edge computing removes latency, and type safety across the entire stack catches bugs before they reach production. For teams already committed to TypeScript who miss the productivity and joy of a framework like Rails, CruzJS aims to fill that gap.

Rails is not going anywhere, and it should not. It remains one of the best ways to build web applications. CruzJS simply offers a similar experience for a different technology stack and deployment model.
