---
title: "02 — Database Schema"
description: Define projects and tasks tables, generate migrations, and explore with Drizzle Studio.
---

# Chapter 02 — Database Schema

Add `projects` and `tasks` tables to the schema, generate a migration, and verify in Drizzle Studio.

## Define the tables

Open `apps/web/src/database/schema.ts`. The file already contains the auth tables from the framework. Add your tables at the bottom:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  orgId: text('orgId').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('projectId').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  orgId: text('orgId').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['todo', 'in_progress', 'done'] }).notNull().default('todo'),
  assigneeId: text('assigneeId'),
  attachmentKey: text('attachmentKey'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
});
```

Key points:
- `orgId` on both tables — every row belongs to an org (multi-tenancy)
- `projectId` on tasks with `cascade` delete — deleting a project deletes its tasks
- `status` is a typed enum at the database level
- `text` for dates — D1 doesn't have a native timestamp type; store ISO strings

## Generate the migration

```bash
cruz db generate
```

This runs `drizzle-kit generate` and creates a migration file in `apps/web/src/database/migrations/`. Check the generated SQL to verify it matches your intent.

## Apply the migration

```bash
cruz db migrate
```

Applies the migration to your local SQLite database. Your tables are now live.

## Inspect with Drizzle Studio

```bash
cruz db studio
```

Opens a browser UI at `https://local.drizzle.studio` where you can browse tables, run queries, and insert test rows. Useful for verifying the schema looks right before writing queries.

## What we built

- `projects` and `tasks` tables with org-scoping and proper relations
- Migration generated and applied
- Verified schema with Drizzle Studio

**Next:** [Chapter 03 — First Feature](/tutorial/03-first-feature/)
