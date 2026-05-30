---
title: Migrations
description: Generating, applying, and managing database migrations with Drizzle Kit and the CruzJS CLI.
---

CruzJS uses [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) for migration generation. Drizzle Kit generates SQL migration files from your schema definitions, and the CruzJS CLI applies them against your local database (SQLite for the Cloudflare adapter, PostgreSQL for all other adapters) or your remote production database.

## Migration workflow

The typical workflow when changing your database schema:

1. Edit your schema file (e.g., add a column, create a table)
2. Run `cruz db generate` to create a migration SQL file
3. Review the generated SQL
4. Run `cruz db migrate` to apply it locally
5. Test your application
6. Run `cruz db migrate --remote` to apply to production

## Generating migrations

After modifying any schema file, run:

```bash
cruz db generate
```

This compares your current schema definitions against the previous migration state and generates a new SQL migration file in `apps/web/src/database/migrations/`.

### What gets generated

Drizzle Kit reads all tables exported from `apps/web/src/database/schema.ts` (which re-exports from all framework packages) and generates the SQL diff. Schemas use the `DrizzleUniversalFactory` pattern so that the same definition works across both SQLite (Cloudflare/D1) and PostgreSQL dialects.

For example, adding a `priority` column to a table:

```typescript
// Before
export const createTaskSchema = DrizzleUniversalFactory.create((b) => {
  const tasksTable = b.table('Task', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    title: b.text('title').notNull(),
    status: b.text('status').notNull().default('TODO'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
  });
  return { tasks: tasksTable };
});

// After — added priority column
export const createTaskSchema = DrizzleUniversalFactory.create((b) => {
  const tasksTable = b.table('Task', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    title: b.text('title').notNull(),
    status: b.text('status').notNull().default('TODO'),
    priority: b.integer('priority').default(0).notNull(),  // new column
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
  });
  return { tasks: tasksTable };
});
```

Running `cruz db generate` produces a migration file that adds the new column. The exact SQL syntax varies by database dialect (SQLite vs PostgreSQL), but Drizzle Kit handles the dialect-specific generation automatically based on your adapter configuration.

### Migration file structure

Migrations live in `apps/web/src/database/migrations/` with this structure:

```
apps/web/src/database/migrations/
  0000_wide_genesis.sql       # Initial schema
  0001_add_task_priority.sql  # Subsequent migrations
  meta/
    0000_snapshot.json         # Schema snapshot after migration 0000
    0001_snapshot.json         # Schema snapshot after migration 0001
    _journal.json              # Migration journal tracking applied migrations
```

The `meta/` directory contains Drizzle Kit's internal state. These files should be committed to version control alongside the SQL files.

## Applying migrations locally

```bash
cruz db migrate
```

This applies all pending migrations to your local database. On Cloudflare adapter projects, this targets the local D1 emulation. On other adapters, it targets your local PostgreSQL instance (configured via `DATABASE_URL` in your `.env` file).

### Verifying local state

After migrating, you can open Drizzle Studio for a visual interface to inspect your tables and data:

```bash
cruz db studio
```

## Applying migrations remotely

```bash
cruz db migrate --remote
```

This applies pending migrations to your production database. For the Cloudflare adapter, this targets your remote D1 database. For other adapters, it connects to the remote database via `DATABASE_URL` or adapter-specific configuration.

### Production migration safety

Before applying migrations to production:

1. **Review the SQL** — Always read the generated migration file. Drizzle Kit can occasionally generate destructive migrations (dropping columns/tables) if it misinterprets a rename as a drop-and-create.
2. **Test locally first** — Apply the migration locally and run your application to verify it works.
3. **Back up if needed** — For critical changes, ensure you have a backup or point-in-time recovery available before applying.

## The initial migration

When you first set up a CruzJS project, `cruz db generate` creates the initial migration containing all framework tables. This is a large SQL file that creates tables for auth, organizations, jobs, uploads, notifications, and other framework features.

The initial migration for a standard CruzJS project creates tables including:

- `AuthIdentity`, `Account`, `Session`, `RefreshToken` (auth)
- `Organization`, `OrgMember`, `Invitation` (multi-tenancy)
- `Subscription` (billing)
- `AuditLog` (audit trail)
- `Job` (background jobs)
- `EmailLog`, `Upload` (infrastructure)
- `UserProfile`, `ApiKey`, `Notification`, `DashboardLayout` (starter kit)
- Plus any application-specific tables you've defined

## Handling migration conflicts

### Column rename vs. drop-and-create

Drizzle Kit may interpret a column rename as dropping the old column and creating a new one, which causes data loss. To safely rename a column:

1. Add the new column with a migration
2. Copy data from the old column to the new column using `cruz db query`
3. Remove the old column in a separate migration

```bash
# Step 1: Generate migration adding new column
cruz db generate
cruz db migrate

# Step 2: Copy data
cruz db query "UPDATE Task SET newColumnName = oldColumnName"

# Step 3: Remove old column (edit schema, generate, migrate)
cruz db generate
cruz db migrate
```

### ALTER TABLE differences by database

On **SQLite/D1** (Cloudflare adapter), `ALTER TABLE` support is limited. Some changes — such as renaming columns, changing column types, or modifying nullability — require Drizzle Kit to recreate the table entirely (create a new table, copy data, drop the old table, rename). Review the generated SQL carefully when you see this pattern.

On **PostgreSQL** (all other adapters), most `ALTER TABLE` operations work directly, including column renames, type changes, and nullability modifications.

## Hard reset (local only)

If your local database gets into an inconsistent state, reset it entirely:

```bash
cruz db hard-reset
```

This resets your local database. On the Cloudflare adapter, it removes the local D1 state. On other adapters, it drops and recreates the local database. After a hard reset, run `cruz db migrate` to recreate the schema and `cruz db seed` to repopulate development data.

Hard reset is only available for local development. It cannot be run against a remote database.

## Raw SQL queries

For ad-hoc queries or data inspection, use `cruz db query`:

```bash
cruz db query "SELECT COUNT(*) FROM AuthIdentity"
cruz db query "SELECT id, email FROM AuthIdentity LIMIT 5"

# Remote (production)
cruz db query "SELECT COUNT(*) FROM Organization" --remote
```

## Migration best practices

1. **One change per migration** — Keep migrations focused. A migration that adds a column should not also restructure indexes on unrelated tables.

2. **Always review generated SQL** — Drizzle Kit is good but not perfect. Review every migration before applying it, especially to production.

3. **Commit migration files** — Both the `.sql` files and the `meta/` directory should be in version control. They represent your database history.

4. **Test migrations on a fresh database** — Periodically run `cruz db hard-reset && cruz db migrate` to verify that all migrations apply cleanly from scratch.

5. **Use `cruz deploy`** — The deploy command runs migrations as part of the deployment pipeline, so you don't need to apply them manually in CI/CD. It runs `cruz db migrate --remote` before deploying the application.

6. **Non-destructive changes first** — When making breaking schema changes, split them across multiple deployments: add the new structure first, migrate data, then remove the old structure.
