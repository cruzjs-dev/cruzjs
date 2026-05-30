---
title: "Step 2: Database Schema"
description: Define the todos table with Drizzle ORM, generate a migration, and apply it locally.
---

import { Steps, Aside } from '@astrojs/starlight/components';

## Create the Feature Directory

```bash
mkdir -p src/features/todos
```

Or use the scaffold command (which also handles Steps 3 and 4):

```bash
cruz new feature todos --scope user --wire
```

For this tutorial we will build each file manually so you understand what gets generated and why.

## Define the Schema

Create `src/features/todos/todos.schema.ts`:

```typescript
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

export const todos = sqliteTable('Todo', {
  id: text('id').primaryKey().$defaultFn(() => createId()),

  // Owner — this is a user-scoped table (one user's tasks)
  userId: text('userId').notNull(),

  title: text('title').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),

  createdAt: integer('createdAt', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
}, (table) => ({
  // Index the FK — every column in .where() needs an index
  userIdIdx: index('Todo_userId_idx').on(table.userId),
}));

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
```

### Why These Choices

- **`createId()`** — generates a CUID2, a collision-resistant sortable ID (better than UUID for DB primary keys).
- **`userId: text('userId').notNull()`** — a plain text column that stores the owning user's ID. No `.references()` because cross-package foreign key declarations cause migration issues with D1/SQLite; ownership is enforced in the service layer instead.
- **`timestamp_ms` mode** — stores timestamps as integers (milliseconds) in D1/SQLite, which is the most compatible and efficient format.
- **`userIdIdx`** — D1 does full table scans without this index. Any column that appears in a `.where()` clause must be indexed.

## Export the Schema

Add the export to `src/database/schema.ts` so Drizzle can find the table:

```typescript
// Re-export framework tables
export * from '@cruzjs/start/database/schema';

// Todos feature
export * from '../features/todos/todos.schema';  // add this line
```

<Aside type="caution">
If you skip this step, `cruz db generate` will produce an empty migration and your table will never be created. This is the most common setup mistake.
</Aside>

## Generate and Apply the Migration

```bash
# Generate the SQL migration from your schema changes
cruz db generate

# Apply the migration to the local D1 database
cruz db migrate
```

You should see output like:

```
✓ Generated migration: 0002_add_todos_table.sql
✓ Applied 1 migration to local D1
```

### Verify the Table Exists

```bash
cruz db query "SELECT name FROM sqlite_master WHERE type='table'"
```

You should see `Todo` in the results.

<Aside type="tip">
You can also open Drizzle Studio to visually browse the database: `cruz db studio`
</Aside>

## What the Migration Looks Like

The generated SQL in `src/database/migrations/0002_add_todos_table.sql` will look like:

```sql
CREATE TABLE `Todo` (
  `id` text PRIMARY KEY NOT NULL,
  `userId` text NOT NULL,
  `title` text NOT NULL,
  `completed` integer DEFAULT false NOT NULL,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL
);

CREATE INDEX `Todo_userId_idx` ON `Todo` (`userId`);
```

This migration is checked into version control. When you deploy to production, `cruz deploy` runs it automatically against your remote D1 database.

---

Next: [Build the service and tRPC API →](/tutorial/04-service-and-api)
