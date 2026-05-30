# Database (Drizzle ORM + D1/SQLite)

CruzJS uses Drizzle ORM with Cloudflare D1 (production) and local SQLite (development). Both are SQLite-based, so the same queries work in both environments.

## Schema Definition

```typescript
// src/features/notes/notes.schema.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';
import { authIdentity } from '@cruzjs/core';

export const notes = sqliteTable('Notes', {
  // Primary key — always CUID
  id: text('id').primaryKey().$defaultFn(() => createId()),

  // Foreign key with cascade
  userId: text('userId')
    .notNull()
    .references(() => authIdentity.id, { onDelete: 'cascade' }),

  // Data fields
  title: text('title').notNull(),
  content: text('content'),
  isActive: integer('isActive', { mode: 'boolean' }).default(true).notNull(),

  // Timestamps — integer mode:timestamp_ms for SQLite
  createdAt: integer('createdAt', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
```

## SQLite Type Mappings

| Concept | SQLite/D1 | Drizzle Column |
|---------|-----------|----------------|
| Primary key | text + CUID2 | `text('id').primaryKey().$defaultFn(() => createId())` |
| Timestamps | integer (unix ms) | `integer('col', { mode: 'timestamp_ms' })` |
| Booleans | integer (0/1) | `integer('col', { mode: 'boolean' })` |
| JSON | text | `text('col')` with app-level JSON parse |
| Enums | text | `text('col')` with Zod validation |

## Org-Scoped Schema

```typescript
import { organizations } from '@cruzjs/saas/database/schema';

export const products = sqliteTable('Products', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  orgId: text('orgId').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdById: text('createdById').notNull().references(() => authIdentity.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});
```

## Query Patterns

```typescript
import { eq, and, desc, isNull, inArray, count } from 'drizzle-orm';

// SELECT single
const [item] = await this.db.select().from(notes).where(eq(notes.id, id)).limit(1);
return item ?? null;

// SELECT with user filter (CRITICAL)
return this.db.select().from(notes)
  .where(eq(notes.userId, userId))
  .orderBy(desc(notes.createdAt));

// SELECT with org filter (CRITICAL)
return this.db.select().from(products)
  .where(eq(products.orgId, orgId));

// INSERT
const [item] = await this.db.insert(notes)
  .values({ userId, title: input.title })
  .returning();

// UPDATE
const [item] = await this.db.update(notes)
  .set({ ...input, updatedAt: new Date() })
  .where(eq(notes.id, id))
  .returning();

// DELETE
await this.db.delete(notes).where(eq(notes.id, id));

// COUNT
const [result] = await this.db.select({ count: count() }).from(notes)
  .where(eq(notes.orgId, orgId));
return result?.count ?? 0;
```

## Transactions

```typescript
await this.db.transaction(async (tx) => {
  const [item] = await tx.select().from(notes).where(eq(notes.id, id)).limit(1);
  if (!item) { throw new Error('Not found'); }
  await tx.update(notes).set({ title: 'new' }).where(eq(notes.id, id));
  await tx.insert(activityLog).values({ action: 'UPDATE', resourceId: id });
});
```

## Schema Export

All tables must be re-exported from `src/database/schema.ts`:

```typescript
// Re-exports all framework tables
export * from '@cruzjs/start/database/schema';

// Your feature tables
export * from '../features/notes/notes.schema';
export * from '../features/products/products.schema';
```

## Migrations

```bash
cruz db generate     # Generate migration from schema changes
cruz db migrate      # Apply to local D1
cruz db migrate --remote  # Apply to production D1
cruz db studio       # Open Drizzle Studio
cruz db hard-reset   # Delete local data and re-migrate
```

## Rules

1. Always use CUID for primary keys
2. Always add `orgId` for org-scoped data, `userId` for user-specific
3. Always index foreign keys
4. Use cascade delete on foreign keys
5. Filter by `userId` or `orgId` in every query (CRITICAL)
6. Use transactions for multi-table operations
7. Export types with `$inferSelect` and `$inferInsert`
8. Export all schemas from `src/database/schema.ts`
