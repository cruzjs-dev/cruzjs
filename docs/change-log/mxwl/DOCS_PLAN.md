# CruzJS Documentation Site — Page Checklist

## Tech Stack
- **Astro Starlight** — purpose-built docs framework, static HTML output
- **Location**: `apps/docs/`
- **Deploy**: Cloudflare Pages (static)

---

## Navigation Structure

### Prologue
- [ ] **Introduction** — What is CruzJS, philosophy, key features, comparison to NestJS/Laravel/Next.js
- [ ] **Quick Start** — Install, create app, run locally in 5 minutes
- [ ] **Upgrade Guide** — Version migration notes
- [ ] **Contributing** — How to contribute, dev setup, PR guidelines

### Getting Started
- [ ] **Installation** — Prerequisites (Node 20+, pnpm), `npx create-cruz-app`, project setup
- [ ] **Configuration** — `cruz.config.ts`, environment variables, `.env` files
- [ ] **Directory Structure** — Monorepo layout, packages, apps, external-processes
- [ ] **First Application** — Build a simple feature end-to-end (schema → service → router → UI)
- [ ] **Deployment** — `cruz deploy production`, environments, preview deploys

### Architecture Concepts
- [ ] **Request Lifecycle** — HTTP request → React Router → tRPC → service → response
- [ ] **Dependency Injection** — Inversify basics, `@Injectable()`, `@Inject()`, why DI matters
- [ ] **Modules** — `@Module()` decorator, ContainerModule, feature modules
- [ ] **Service Providers** — `BaseServiceProvider`, register(), registerRouters(), registerRoutes(), lifecycle
- [ ] **Data Ownership** — User-specific vs org-scoped data, decision matrix, security rules

### The Basics
- [ ] **Routing** — React Router v7 routes, file-based routing, loaders, actions
- [ ] **Controllers (tRPC Routers)** — Router definition, procedures, input validation, response types
- [ ] **Services** — Business logic layer, `@Injectable()`, injecting dependencies, CRUD patterns
- [ ] **Validation** — Zod schemas, input validation, error messages, reusable schemas
- [ ] **Middleware** — Session middleware, org context, permission checks, custom middleware
- [ ] **Error Handling** — TRPCError, error codes, client-side error handling, error boundaries
- [ ] **Logging** — Logger service, log levels, structured logging

### Database
- [ ] **Getting Started** — Drizzle ORM overview, D1 (production) vs SQLite (local)
- [ ] **Schema Definition** — Tables, columns, types, CUID IDs, timestamps, indexes, relations
- [ ] **Queries** — Select, insert, update, delete, joins, aggregations, subqueries
- [ ] **Transactions** — Transaction patterns, error handling within transactions
- [ ] **Migrations** — `cruz db generate`, `cruz db migrate`, migration workflow
- [ ] **Seeding** — `cruz db seed`, seed file patterns
- [ ] **Drizzle Studio** — `cruz db studio`, visual database inspection

### Authentication & Security
- [ ] **Authentication** — Registration, login, sessions, JWT tokens, refresh tokens
- [ ] **Authorization** — Role-based access (OWNER, ADMIN, MEMBER, VIEWER), `requirePermission()`
- [ ] **Organizations** — Multi-tenancy, org creation, member management, invitations
- [ ] **Sessions** — Session management, token refresh, session middleware
- [ ] **OAuth** — Google OAuth, adding OAuth providers, linking accounts
- [ ] **Email Verification** — Verification flow, tokens, resending verification
- [ ] **Password Reset** — Reset flow, tokens, security considerations
- [ ] **CSRF Protection** — CSRF middleware, token generation, form integration
- [ ] **Rate Limiting** — Rate limit middleware, configuration, per-route limits
- [ ] **Encryption & Hashing** — Password hashing, token generation

### Digging Deeper
- [ ] **Events** — Domain events, creating events, emitting, listeners, built-in events
- [ ] **Background Jobs** — JobService, handlers, dispatch, retry, priority levels, idempotency
- [ ] **Queues** — Cloudflare Queues, QueueService, sending messages, queue consumers
- [ ] **File Storage** — StorageService, R2 (production), local driver (dev), upload/download
- [ ] **File Uploads** — Upload router, multipart handling, validation, storage integration
- [ ] **Email** — EmailService, templates, queue integration, provider configuration
- [ ] **Caching** — KV namespace, CacheService, cache patterns, local KV facade
- [ ] **Configuration Service** — ConfigService, typed config, environment-specific values
- [ ] **Health Checks** — Health check router, custom checks, monitoring integration
- [ ] **AI Integration** — Workers AI binding, AI service, extraction capabilities

### UI & Frontend
- [ ] **Overview** — React + Chakra UI + Tailwind, component philosophy
- [ ] **Components** — @cruzjs/ui library, StatCard, PageHeader, SectionCard, modals
- [ ] **tRPC Client** — Client setup, useQuery, useMutation, optimistic updates, invalidation
- [ ] **Layouts** — Dashboard layout, org layout, public layout, nested layouts
- [ ] **Forms** — Form handling, Zod validation, error display, submit patterns
- [ ] **Loading & Error States** — Loading spinners, skeletons, error boundaries, empty states
- [ ] **Permissions in UI** — Permission-based rendering, role checks, hiding/showing elements

### CLI
- [ ] **Overview** — `cruz` command, global options, help
- [ ] **Development** — `cruz dev`, `cruz build`, `cruz start`, `cruz test`, `cruz typecheck`
- [ ] **Database Commands** — `cruz db generate/migrate/query/studio/seed/hard-reset`
- [ ] **Scaffolding** — `cruz new worker/workflow/queue-worker`, templates, customization
- [ ] **Deploy & Infrastructure** — `cruz init/deploy/status/destroy`, environments
- [ ] **Resource Management** — `cruz queue/secrets/kv/r2` commands

### Cloudflare Platform
- [ ] **Overview** — Why Cloudflare, edge computing, V8 isolates, global deployment
- [ ] **D1 Database** — SQLite at the edge, local dev, remote access
- [ ] **KV Storage** — Key-value storage, caching patterns, TTL
- [ ] **R2 Object Storage** — S3-compatible storage, upload/download, public access
- [ ] **Workers** — Standalone workers, when to use, scaffolding, deployment
- [ ] **Workflows** — Durable execution, steps, retries, status tracking
- [ ] **Queues** — Message queues, producers, consumers, dead letter queues
- [ ] **AI** — Workers AI, AI Gateway, model binding

### Pro Features
- [ ] **Organizations** — Org CRUD, settings, avatars, slug-based routing
- [ ] **Members & Roles** — Member management, role assignment, invitation system
- [ ] **Permissions** — Permission system, built-in permissions, custom permissions
- [ ] **Billing (Stripe)** — Subscription management, payment processing, webhooks
- [ ] **Admin Dashboard** — Admin panel, user management, system overview
- [ ] **Audit Logging** — Audit log service, what to log, querying audit logs

### Testing
- [ ] **Getting Started** — Vitest setup, test structure, running tests
- [ ] **Unit Tests** — Service tests, router tests, mocking DI, test factories
- [ ] **E2E Tests** — Playwright setup, page objects, authentication in tests
- [ ] **Database Tests** — Test database, seeding, cleanup, transaction rollback

### Recipes
- [ ] **CRUD Feature** — Step-by-step: build a complete CRUD feature from scratch
- [ ] **Adding a New Package** — Creating a new package in the monorepo
- [ ] **Custom Service Provider** — Extending the framework with a provider
- [ ] **Real-time Features** — Server-sent events, polling patterns
- [ ] **Multi-tenant SaaS** — Building a SaaS with org isolation
- [ ] **API Keys** — API key management, authentication via API keys
- [ ] **Notifications** — Building a notification system

### API Reference
- [ ] **@cruzjs/core** — All exported classes, functions, types, decorators
- [ ] **@cruzjs/saas** — Organization, billing, admin, audit APIs
- [ ] **@cruzjs/start** — UI modules and page components
- [ ] **@cruzjs/ui** — Component props and usage
- [ ] **@cruzjs/cli** — Command reference (auto-generated)

---

## Total: ~85 pages across 14 sections

## Priority Order
1. Prologue + Getting Started (entry point)
2. Architecture Concepts (foundational understanding)
3. The Basics (daily usage)
4. Database (core feature)
5. Auth & Security (core feature)
6. CLI (developer tooling)
7. Digging Deeper (advanced features)
8. UI & Frontend
9. Cloudflare Platform
10. Pro Features
11. Testing
12. Recipes
13. API Reference
