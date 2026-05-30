---
title: Database Getting Started
description: How CruzJS connects Drizzle ORM to your database — adapter-agnostic setup, CruzDatabase injection, and the CLI commands.
---

CruzJS uses [Drizzle ORM](https://orm.drizzle.team/) as its database layer. The framework is database-agnostic: the runtime adapter you choose determines which database dialect is used. Your application code, schemas, and queries work identically regardless of the underlying database.

| Adapter | Database | Dialect |
|---------|----------|---------|
| `@cruzjs/adapter-cloudflare` | Cloudflare D1 | SQLite |
| `@cruzjs/adapter-aws` | PostgreSQL (RDS, Aurora) | PostgreSQL |
| `@cruzjs/adapter-gcp` | PostgreSQL (Cloud SQL) | PostgreSQL |
| `@cruzjs/adapter-azure` | PostgreSQL (Flexible Server) | PostgreSQL |
| `@cruzjs/adapter-digitalocean` | PostgreSQL (Managed DB) | PostgreSQL |
| `@cruzjs/adapter-docker` | PostgreSQL | PostgreSQL |

The adapter sets the dialect automatically at startup. Application code never references a specific dialect directly.

## How the database connection works

Database initialization is handled by the `DrizzleService` class in `@cruzjs/core`. You never call it directly in application code -- the framework initializes it per-request in production and once at startup in local dev.

The active adapter provides the database connection to the framework. For example, the Cloudflare adapter supplies a D1 binding, while the Docker adapter supplies a PostgreSQL connection string. The framework wraps whichever connection it receives in a Drizzle instance, and your services interact with it through a single unified type.

## The CruzDatabase type

All database interactions use the `CruzDatabase` type. This is the framework's unified database type that abstracts over the underlying dialect. Whether you are running on D1 (SQLite) or PostgreSQL, the same type is used:

```typescript
import { DRIZZLE, type CruzDatabase } from '@cruzjs/core';
```

Always import `CruzDatabase` from the framework rather than using Drizzle's dialect-specific types directly. This keeps your application code portable across adapters.

## Injecting the database in services

CruzJS uses Inversify for dependency injection. The database is registered in the DI container under the `DRIZZLE` token. Inject it into any `@injectable()` service via constructor injection:

```typescript
import { injectable, inject } from 'inversify';
import { DRIZZLE, type CruzDatabase } from '@cruzjs/core';
import { eq } from 'drizzle-orm';
import { authIdentity } from '@cruzjs/core/database/schema';

@injectable()
export class UserService {
  constructor(@inject(DRIZZLE) private readonly db: CruzDatabase) {}

  async getById(id: string) {
    const [user] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.id, id))
      .limit(1);
    return user ?? null;
  }
}
```

The `DRIZZLE` token is a typed injection token created with `createToken<CruzDatabase>('CruzDatabase')`. The container resolves it to the current database instance, regardless of which adapter is active.

## Schema location

All database schemas are defined using the `DrizzleUniversalFactory` pattern, which produces dialect-agnostic table definitions. The framework packages each define their own schemas, which you import from npm:

| Package | Import Path | Tables |
|---------|-------------|--------|
| `@cruzjs/core` | `@cruzjs/core/database/schema` | AuthIdentity, Account, Session, RefreshToken, Job, EmailLog, Upload |
| `@cruzjs/start` | `@cruzjs/start/database/schema` | Re-exports core schemas, plus Organization, OrgMember, Invitation, UserProfile, ApiKey, DashboardLayout, Notification, and more |
| `@cruzjs/saas` | `@cruzjs/saas/database/schema` | Subscription, AuditLog |

Your application schema lives at `src/database/schema.ts`, which re-exports everything from the framework packages and is where you add your own tables:

```typescript
// src/database/schema.ts

// Re-exports all tables from @cruzjs/core, @cruzjs/saas, and @cruzjs/start
export * from '@cruzjs/start/database/schema';

// Add your own tables below
export * from '../features/my-feature/my-feature.schema';
```

## Database CLI commands

CruzJS provides a unified CLI for all database operations:

| Command | Description |
|---------|-------------|
| `cruz db generate` | Generate Drizzle migration files from schema changes |
| `cruz db migrate` | Apply migrations to the local database |
| `cruz db migrate --remote` | Apply migrations to the remote (production) database |
| `cruz db query "SQL"` | Execute raw SQL against the local database |
| `cruz db query "SQL" --remote` | Execute raw SQL against the remote database |
| `cruz db studio` | Open Drizzle Studio for visual database browsing |
| `cruz db seed` | Run the seed script |
| `cruz db hard-reset` | Delete local database data and start fresh |

See the [Migrations](/database/migrations/) and [Seeding](/database/seeding/) guides for detailed workflows.

## Column types

The `DrizzleUniversalFactory` provides a normalized set of column builders that produce the correct dialect-specific types at runtime. You never need to think about `{ mode: 'boolean' }` or JSON serialization -- the builder handles it.

| Builder | TypeScript type | SQLite (D1) | PostgreSQL |
|---------|----------------|-------------|------------|
| `b.text(name)` | `string` | `text` | `varchar` |
| `b.integer(name)` | `number` | `integer` | `integer` |
| `b.real(name)` | `number` | `real` | `double precision` |
| `b.boolean(name)` | `boolean` | `integer` (0/1) | `boolean` |
| `b.timestamp(name)` | `string` | `text` (ISO-8601) | `timestamp with time zone` |
| `b.json<T>(name)` | `T` | `text` (serialized) | `jsonb` |

These mappings are consistent across all framework packages. See the [Schema Definition](/database/schema-definition/) guide for full details on using each type.

## Local development

How local dev works depends on your adapter:

- **Cloudflare adapter**: The framework uses a local SQLite file as a D1 facade. The database lives in `.wrangler/state/v3/d1/`, which is what `cruz db migrate` targets by default.
- **PostgreSQL adapters** (AWS, GCP, Azure, DigitalOcean, Docker): The framework connects to a local PostgreSQL instance. Configure the connection string via `DATABASE_URL` in your `.dev.vars` or environment variables.

In both cases, the same schemas, queries, and migrations work without changes. The CLI detects your active adapter and runs migrations against the appropriate local database.
