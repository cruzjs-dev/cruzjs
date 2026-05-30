# Database (Drizzle ORM)

CruzJS uses Drizzle ORM with D1 (SQLite) in production and local SQLite for development. No Prisma.

## Schema Definition

### Basic Table

```typescript
// apps/web/src/features/my-feature/my-feature.schema.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';
import { organizations } from '@cruzjs/core/database/schema';
import { authIdentity } from '@cruzjs/core';

export const myItems = sqliteTable('MyItems', {
  // Primary key with CUID
  id: text('id').primaryKey().$defaultFn(() => createId()),

  // Foreign keys with cascade delete
  orgId: text('orgId').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdById: text('createdById').notNull().references(() => authIdentity.id, { onDelete: 'cascade' }),

  // Data fields
  name: text('name').notNull(),
  description: text('description'),
  metadata: text('metadata', { mode: 'json' }),
  isActive: integer('isActive', { mode: 'boolean' }).default(true).notNull(),

  // Timestamps (stored as integers in SQLite)
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  // Always index foreign keys
  orgIdIdx: index('MyItems_orgId_idx').on(table.orgId),
  createdByIdIdx: index('MyItems_createdById_idx').on(table.createdById),
}));

// Type exports
export type MyItem = typeof myItems.$inferSelect;
export type NewMyItem = typeof myItems.$inferInsert;
```

### Enum Column

SQLite does not have native enums. Use text columns with application-level validation:

```typescript
export const myItems = sqliteTable('MyItems', {
  status: text('status', { enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'] }).default('DRAFT').notNull(),
  // ...
});
```

### Unique Constraints

```typescript
import { uniqueIndex } from 'drizzle-orm/sqlite-core';

export const invitations = sqliteTable('Invitations', {
  email: text('email').notNull(),
  orgId: text('orgId').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),  // Single column unique
}, (table) => ({
  // Composite unique
  emailOrgUnique: uniqueIndex('Invitations_email_org_unique').on(table.email, table.orgId),
}));
```

### Soft Delete Pattern

```typescript
export const myItems = sqliteTable('MyItems', {
  // ... other fields
  deletedAt: integer('deletedAt', { mode: 'timestamp' }),  // null = not deleted
});

// Always filter in queries
const items = await this.db
  .select()
  .from(myItems)
  .where(and(
    eq(myItems.orgId, orgId),
    isNull(myItems.deletedAt)
  ));
```

## Query Patterns

### Service with Drizzle

```typescript
import { Injectable, Inject, DRIZZLE, type DrizzleDatabase } from '@cruzjs/core';
import { eq, and, desc, isNull, inArray, count } from 'drizzle-orm';
import { myItems } from './my-feature.schema';

@Injectable()
export class MyItemService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  // SELECT single
  async getById(id: string): Promise<MyItem | null> {
    const [item] = await this.db
      .select()
      .from(myItems)
      .where(eq(myItems.id, id))
      .limit(1);
    return item ?? null;
  }

  // SELECT with org filter (CRITICAL - always filter by orgId)
  async listByOrg(orgId: string): Promise<MyItem[]> {
    return this.db
      .select()
      .from(myItems)
      .where(eq(myItems.orgId, orgId))
      .orderBy(desc(myItems.createdAt));
  }

  // SELECT with multiple conditions
  async listActive(orgId: string): Promise<MyItem[]> {
    return this.db
      .select()
      .from(myItems)
      .where(and(
        eq(myItems.orgId, orgId),
        eq(myItems.isActive, true),
        isNull(myItems.deletedAt)
      ));
  }

  // INSERT and return
  async create(orgId: string, userId: string, input: CreateInput): Promise<MyItem> {
    const [item] = await this.db
      .insert(myItems)
      .values({
        orgId,
        createdById: userId,
        name: input.name,
        description: input.description,
      })
      .returning();
    return item;
  }

  // Batch INSERT
  async createMany(items: NewMyItem[]): Promise<MyItem[]> {
    return this.db
      .insert(myItems)
      .values(items)
      .returning();
  }

  // UPDATE
  async update(id: string, input: UpdateInput): Promise<MyItem | null> {
    const [item] = await this.db
      .update(myItems)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(myItems.id, id))
      .returning();
    return item ?? null;
  }

  // Soft DELETE
  async softDelete(id: string): Promise<void> {
    await this.db
      .update(myItems)
      .set({ deletedAt: new Date() })
      .where(eq(myItems.id, id));
  }

  // Hard DELETE
  async hardDelete(id: string): Promise<void> {
    await this.db
      .delete(myItems)
      .where(eq(myItems.id, id));
  }

  // COUNT
  async getCount(orgId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(myItems)
      .where(eq(myItems.orgId, orgId));
    return result?.count ?? 0;
  }
}
```

### Transactions

```typescript
async transferOwnership(itemId: string, newOwnerId: string, orgId: string): Promise<void> {
  return this.db.transaction(async (tx) => {
    // All queries use tx instead of this.db
    const [item] = await tx
      .select()
      .from(myItems)
      .where(and(
        eq(myItems.id, itemId),
        eq(myItems.orgId, orgId)
      ))
      .limit(1);

    if (!item) {
      throw new Error('Item not found');
    }

    await tx
      .update(myItems)
      .set({ createdById: newOwnerId, updatedAt: new Date() })
      .where(eq(myItems.id, itemId));

    await tx
      .insert(activityLog)
      .values({
        orgId,
        action: 'TRANSFER',
        resourceType: 'ITEM',
        resourceId: itemId,
        userId: newOwnerId,
      });
  });
}
```

### Joins

```typescript
import { users } from '@cruzjs/core/auth/identity.schema';

// Manual join
const itemsWithCreator = await this.db
  .select({
    id: myItems.id,
    name: myItems.name,
    creatorEmail: users.email,
    creatorName: users.name,
  })
  .from(myItems)
  .innerJoin(users, eq(myItems.createdById, users.id))
  .where(eq(myItems.orgId, orgId));

// Left join (optional relationship)
const itemsWithOptionalData = await this.db
  .select({
    item: myItems,
    metadata: itemMetadata,
  })
  .from(myItems)
  .leftJoin(itemMetadata, eq(myItems.id, itemMetadata.itemId));
```

### Batch Operations

```typescript
// Batch by IDs
const items = await this.db
  .select()
  .from(myItems)
  .where(inArray(myItems.id, ids));

// Batch update
await this.db
  .update(myItems)
  .set({ isActive: false, updatedAt: new Date() })
  .where(inArray(myItems.id, idsToDeactivate));

// Batch delete
await this.db
  .delete(myItems)
  .where(inArray(myItems.id, idsToDelete));
```

## Schema Export

All schemas must be exported from `apps/web/src/database/schema.ts`:

```typescript
// Re-export core schemas
export * from '@cruzjs/core/auth/identity.schema';
export * from '@cruzjs/core/jobs/jobs.schema';
export * from '@cruzjs/core/upload/uploads.schema';
export * from '@cruzjs/core/email/email.schema';

// Re-export org schemas (from core)
export * from '@cruzjs/core/orgs/organizations.schema';
export * from '@cruzjs/core/orgs/org-members.schema';
export * from '@cruzjs/core/orgs/invitations.schema';

// Re-export pro schemas
export * from '@cruzjs/saas/billing/subscriptions.schema';
export * from '@cruzjs/saas/audit/audit-logs.schema';

// Export app schemas
export * from '../features/user-profile/user-profile.schema';
export * from '../features/my-feature/my-feature.schema';
```

## Migration Workflow

```bash
# Generate migration after schema changes
cruz db generate

# Apply migrations to local D1
cruz db migrate

# Apply migrations to remote D1
cruz db migrate --remote

# Execute SQL against local D1
cruz db query "SELECT * FROM MyItems"

# Open Drizzle Studio
cruz db studio

# Hard reset (DANGER - deletes local D1 data and re-migrates)
cruz db hard-reset
```

## Rules

1. **Always use CUID** for primary keys (`createId()`)
2. **Always add orgId** for org-scoped data
3. **Always add createdById** to track who created records
4. **Always index foreign keys** for query performance
5. **Use cascade delete** on foreign keys to organizations
6. **Filter by orgId/userId** in service queries (CRITICAL)
7. **Use transactions** for multi-table operations
8. **Export types** with `$inferSelect` and `$inferInsert`
9. **Export schemas** from central `database/schema.ts`
10. **Use soft delete** for data you might need to recover
