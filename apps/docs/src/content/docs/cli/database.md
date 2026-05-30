---
title: Database Commands
description: Managing Drizzle ORM migrations and Cloudflare D1 databases with the Cruz CLI.
---

CruzJS uses [Drizzle ORM](https://orm.drizzle.team/) for database access. The underlying database engine depends on your runtime adapter (D1/SQLite on Cloudflare, PostgreSQL on AWS/GCP/Azure, etc.). The `cruz db` commands handle schema migrations, data seeding, direct SQL queries, and database tooling.

## cruz db generate

Generates migration SQL files from changes to your Drizzle schema. Run this after modifying table definitions in `apps/web/src/database/schema.ts`.

```bash
cruz db generate
```

This runs `drizzle-kit generate` and creates new migration files in the `drizzle/` directory at the project root. Each migration is a numbered SQL file:

```
drizzle/
  0000_initial.sql
  0001_add_projects_table.sql
  0002_add_status_column.sql
  meta/
    _journal.json
```

### Example Workflow

```bash
# 1. Edit your schema
# apps/web/src/database/schema.ts
# Add a new table or modify an existing one

# 2. Generate the migration
cruz db generate

# 3. Review the generated SQL
cat drizzle/0002_add_status_column.sql

# 4. Apply the migration locally
cruz db migrate
```

### Schema Example

```typescript
// apps/web/src/database/schema.ts
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';

const f = DrizzleUniversalFactory.create((b) => ({
  projects: b.table('projects', {
    id: b.text('id').primaryKey(),
    name: b.text('name').notNull(),
    description: b.text('description'),
    orgId: b.text('org_id').notNull(),
    status: b.text('status').notNull().default('active'),
    createdAt: b.timestamp('created_at').notNull(),
    updatedAt: b.timestamp('updated_at').notNull(),
  }),
}));

export const projects = f.projects;
```

## cruz db migrate

Applies pending migrations to the database. By default, this targets the local development database.

```bash
# Apply migrations to local D1 (development)
cruz db migrate

# Apply migrations to remote D1 (production/staging)
cruz db migrate --remote
```

### Local vs Remote

| Flag | Target | Use Case |
|------|--------|----------|
| *(none)* | Local development database | Development |
| `--remote` | Remote database (e.g., Cloudflare D1, RDS) | Production, staging |

The local database location depends on your adapter. For Cloudflare, it lives in `apps/web/.wrangler/state/v3/d1/`. Remote migrations connect to the database configured in your environment.

### Running During Deployment

`cruz deploy` automatically runs `cruz db migrate --remote` as part of the deployment pipeline. You can skip this with `--skip-migrate`:

```bash
# Deploy without running migrations
cruz deploy production --skip-migrate
```

## cruz db query

Executes raw SQL against the database. Useful for debugging, one-off data fixes, and inspection.

```bash
# Query local database
cruz db query "SELECT * FROM projects LIMIT 10"

# Query remote database
cruz db query "SELECT count(*) FROM users" --remote
```

### Examples

```bash
# Count records
cruz db query "SELECT count(*) as total FROM projects WHERE org_id = 'org_abc'"

# Update a record
cruz db query "UPDATE projects SET status = 'archived' WHERE id = 'proj_123'"
```

:::note
The exact SQL syntax available depends on your database engine. For example, `PRAGMA table_info(...)` and `sqlite_master` are SQLite/D1-specific. PostgreSQL uses `information_schema` instead.
:::

### Safety Note

Use `--remote` with caution. Queries against the remote database affect production data. There is no undo for destructive SQL statements.

## cruz db studio

Opens [Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview), a visual database browser, in your web browser. This lets you inspect tables, run queries, and browse data with a graphical interface.

```bash
cruz db studio
```

Drizzle Studio connects to your local development database by default. It runs on `https://local.drizzle.studio` and stays open until you stop it with `Ctrl+C`.

This is the fastest way to inspect your data during development without writing SQL.

## cruz db seed

Runs the database seed script at `apps/web/src/database/seed.ts`. Use this to populate your local database with test data after a fresh migration.

```bash
cruz db seed
```

### Seed File Example

```typescript
// apps/web/src/database/seed.ts
import { drizzle } from '@cruzjs/core/shared/database/drizzle.service';
import * as schema from './schema';

async function seed() {
  const db = drizzle(/* local database binding */);

  // Insert test users
  await db.insert(schema.users).values([
    { id: 'user_1', email: 'alice@example.com', name: 'Alice' },
    { id: 'user_2', email: 'bob@example.com', name: 'Bob' },
  ]);

  // Insert test organization
  await db.insert(schema.organizations).values({
    id: 'org_1',
    name: 'Acme Corp',
    slug: 'acme',
  });

  console.log('Seed complete!');
}

seed();
```

## cruz db hard-reset

Deletes the local development database entirely and requires you to re-run migrations. This is useful when your local database is in a broken state or you want a completely fresh start.

```bash
cruz db hard-reset
```

This command:

1. Deletes the `apps/web/.wrangler/state/v3/d1/` directory.
2. Prints instructions to re-migrate and re-seed.

After a hard reset, run:

```bash
cruz db migrate
cruz db seed
```

### Restrictions

- Hard reset is **only available for local development**. You cannot hard-reset a remote database from the CLI.
- If you need to reset a remote database, use your platform's dashboard (e.g., [Cloudflare Dashboard](https://dash.cloudflare.com/) for D1) to manage database resources directly.

## Common Workflows

### Adding a New Table

```bash
# 1. Define the table in your schema
#    Edit apps/web/src/database/schema.ts

# 2. Generate the migration
cruz db generate

# 3. Apply it locally
cruz db migrate

# 4. Verify with Drizzle Studio
cruz db studio
```

### Starting Fresh Locally

```bash
# Delete everything and start over
cruz db hard-reset
cruz db migrate
cruz db seed
```

### Deploying Schema Changes

```bash
# Generate migration (if not already done)
cruz db generate

# Deploy -- this runs migrations automatically
cruz deploy production

# Or apply migrations to remote without a full deploy
cruz db migrate --remote
```
