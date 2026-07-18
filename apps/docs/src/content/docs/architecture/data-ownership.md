---
title: Data Ownership
description: User-specific vs org-scoped data patterns, schema design, service patterns, and security rules for preventing cross-tenant access.
---

Every piece of data in a CruzJS application belongs to either a **user** or an **organization**. Getting this right is critical for security -- the wrong ownership model can leak data between tenants.

## Two Ownership Models

### User-Specific Data

Belongs to a single user. No one else can see or modify it.

**Examples**: profile settings, notification preferences, personal API keys, saved searches.

**Key characteristics**:
- Schema has a `userId` column
- Service methods always filter by `userId`
- Router uses `protectedProcedure` (has `ctx.session.user.id`)
- No permission checks needed -- the user owns it

### Org-Scoped Data

Belongs to an organization. All org members can access it based on their role and permissions.

**Examples**: products, invoices, team settings, projects, documents.

**Key characteristics**:
- Schema has an `orgId` column and a `createdById` column
- Service methods always filter by `orgId`
- Router uses `orgProcedure` (has `ctx.org.orgId`, `ctx.org.userId`, `ctx.org.role`)
- Permission checks via `requirePermission()` on every operation

## Decision Matrix

Use this table to decide which model to use:

| Question | User-Specific | Org-Scoped |
|----------|:---:|:---:|
| Can other people see this data? | No | Yes (org members) |
| Does it need role-based permissions? | No | Yes |
| Does it survive if the user leaves the org? | Yes | Yes (belongs to org, not user) |
| Does it move with the user between orgs? | Yes | No |
| Foreign key column? | `userId` | `orgId` + `createdById` |
| Procedure type? | `protectedProcedure` | `orgProcedure` |
| Permission check? | None | `requirePermission()` |

**Rule of thumb**: If the data is about the user themselves, it is user-specific. If the data is about something the team works on together, it is org-scoped.

## Schema Patterns

### User-Specific Schema

```typescript
// features/user-preferences/user-preferences.schema.ts
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';
import { createId } from '@paralleldrive/cuid2';
import { authIdentity } from '@cruzjs/core';

const f = DrizzleUniversalFactory.create((b) => ({
  userPreferences: b.table('user_preferences', {
    id: b.text('id').primaryKey().$defaultFn(() => createId()),
    userId: b.text('user_id')
      .notNull()
      .references(() => authIdentity.id, { onDelete: 'cascade' }),
    theme: b.text('theme').default('system'),
    emailNotifications: b.boolean('email_notifications').default(true),
    createdAt: b.timestamp('created_at').$defaultFn(() => new Date()),
    updatedAt: b.timestamp('updated_at').$defaultFn(() => new Date()),
  }),
}));

export const userPreferences = f.userPreferences;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
```

Key points:
- `userId` is the only ownership column.
- Cascading delete ensures cleanup when the user is deleted.
- No `orgId` column -- this data is not tied to any organization.

### Org-Scoped Schema

```typescript
// features/product/product.schema.ts
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';
import { createId } from '@paralleldrive/cuid2';
import { organizations } from '@cruzjs/saas';
import { authIdentity } from '@cruzjs/core';

const f = DrizzleUniversalFactory.create((b) => ({
  products: b.table('products', {
    id: b.text('id').primaryKey().$defaultFn(() => createId()),
    orgId: b.text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    createdById: b.text('created_by_id')
      .notNull()
      .references(() => authIdentity.id, { onDelete: 'cascade' }),
    name: b.text('name').notNull(),
    description: b.text('description'),
    status: b.text('status').default('active'),
    createdAt: b.timestamp('created_at').$defaultFn(() => new Date()),
    updatedAt: b.timestamp('updated_at').$defaultFn(() => new Date()),
  }, (table) => ({
    orgIdIdx: b.index('products_org_id_idx').on(table.orgId),
    createdByIdIdx: b.index('products_created_by_id_idx').on(table.createdById),
  })),
}));

export const products = f.products;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
```

Key points:
- `orgId` scopes the data to an organization.
- `createdById` tracks who created the record (audit trail), but does not determine access.
- Foreign keys have cascading deletes.
- Indexes on `orgId` and `createdById` for query performance.

## Service Patterns

### User-Specific Service

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { userPreferences } from './user-preferences.schema';

@Injectable()
export class UserPreferencesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async getByUserId(userId: string): Promise<UserPreferences | null> {
    const [prefs] = await this.db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    return prefs ?? null;
  }

  async update(userId: string, input: UpdatePreferencesInput): Promise<UserPreferences> {
    const [prefs] = await this.db
      .update(userPreferences)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId)) // Always filter by userId
      .returning();
    return prefs;
  }
}
```

The `userId` parameter comes from the authenticated session. The service never accepts a user-provided userId -- it always uses the one from `ctx.session.user.id`.

### Org-Scoped Service

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { eq, and, desc } from 'drizzle-orm';
import { products } from './product.schema';

@Injectable()
export class ProductService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async list(orgId: string): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(eq(products.orgId, orgId)) // Always filter by orgId
      .orderBy(desc(products.createdAt));
  }

  async getById(id: string, orgId: string): Promise<Product | null> {
    const [product] = await this.db
      .select()
      .from(products)
      .where(and(
        eq(products.id, id),
        eq(products.orgId, orgId), // Prevent cross-org access
      ))
      .limit(1);
    return product ?? null;
  }

  async create(orgId: string, userId: string, input: CreateProductInput): Promise<Product> {
    const [product] = await this.db
      .insert(products)
      .values({
        orgId,
        createdById: userId,
        name: input.name,
        description: input.description,
      })
      .returning();
    return product;
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.db
      .delete(products)
      .where(and(
        eq(products.id, id),
        eq(products.orgId, orgId), // Never delete without orgId filter
      ));
  }
}
```

Every query includes `orgId` in its WHERE clause. This is the most important security pattern in the entire framework.

## Router Patterns

### User-Specific Router

Uses `protectedProcedure`, which guarantees `ctx.session.user.id` is available:

```typescript
import { router, protectedProcedure } from '@cruzjs/core/trpc/context';
import { UserPreferencesService } from './user-preferences.service';
import { updatePreferencesSchema } from './user-preferences.validation';

export const userPreferencesRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const service = ctx.container.get(UserPreferencesService);
    return service.getByUserId(ctx.session.user.id);
  }),

  update: protectedProcedure
    .input(updatePreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get(UserPreferencesService);
      return service.update(ctx.session.user.id, input);
    }),
});
```

No permission checks. The userId comes from the session, not the client.

### Org-Scoped Router

Uses `orgProcedure`, which guarantees `ctx.org` with `orgId`, `userId`, and `role`:

```typescript
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, orgProcedure } from '@cruzjs/core/trpc/context';
import { requirePermission } from '@cruzjs/start/orgs/auth.utils';
import { ProductService } from './product.service';
import { createProductSchema, updateProductSchema } from './product.validation';

export const productRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    await requirePermission(ctx.org, 'product:read');

    const service = ctx.container.get(ProductService);
    return service.list(ctx.org.orgId);
  }),

  get: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await requirePermission(ctx.org, 'product:read');

      const service = ctx.container.get(ProductService);
      const product = await service.getById(input.id, ctx.org.orgId);

      if (!product) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
      }
      return product;
    }),

  create: orgProcedure
    .input(createProductSchema)
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.org, 'product:write');

      const service = ctx.container.get(ProductService);
      return service.create(ctx.org.orgId, ctx.org.userId, input);
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.org, 'product:delete');

      const service = ctx.container.get(ProductService);
      await service.delete(input.id, ctx.org.orgId);
      return { success: true };
    }),
});
```

Every mutation calls `requirePermission()`. The `orgId` is always sourced from `ctx.org.orgId`, never from client input.

## Cross-Org Access Prevention

The single most important security rule: **never query by ID alone**.

### Wrong: Fetching by ID without org filter

```typescript
// DANGEROUS -- any user who guesses the ID can access any org's product
async getById(id: string): Promise<Product | null> {
  const [product] = await this.db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  return product ?? null;
}
```

### Right: Always include the ownership filter

```typescript
// SAFE -- only returns the product if it belongs to the requesting org
async getById(id: string, orgId: string): Promise<Product | null> {
  const [product] = await this.db
    .select()
    .from(products)
    .where(and(
      eq(products.id, id),
      eq(products.orgId, orgId),
    ))
    .limit(1);
  return product ?? null;
}
```

This applies to every operation: SELECT, UPDATE, and DELETE. Always include the ownership column in the WHERE clause.

## Default Permission Matrix

| Permission | OWNER | ADMIN | MEMBER | VIEWER |
|------------|:---:|:---:|:---:|:---:|
| `*:read` | Yes | Yes | Yes | Yes |
| `*:write` | Yes | Yes | Yes | No |
| `*:delete` | Yes | Yes | No | No |
| `org:write` | Yes | Yes | No | No |
| `org:delete` | Yes | No | No | No |
| `member:write` | Yes | Yes | No | No |
| `billing:read` | Yes | Yes | No | No |
| `billing:write` | Yes | No | No | No |

Custom resource permissions (e.g., `product:read`, `invoice:write`) follow the wildcard `*:read`/`*:write`/`*:delete` defaults unless overridden.

## Hybrid Patterns

Sometimes data is org-scoped but has user-specific visibility rules within the org.

### Example: Drafts vs Published

Articles belong to an org, but drafts are only visible to their creator:

```typescript
// Using DrizzleUniversalFactory (abbreviated for clarity)
export const articles = f.articles; // from b.table('articles', { ... })

// Table columns:
//   id: b.text('id').primaryKey().$defaultFn(() => createId()),
//   orgId: b.text('org_id').notNull(),
//   createdById: b.text('created_by_id').notNull(),
//   status: b.text('status').notNull(), // 'draft' | 'published'
//   title: b.text('title').notNull(),
//   content: b.text('content'),
```

```typescript
@Injectable()
export class ArticleService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async list(orgId: string, userId: string): Promise<Article[]> {
    return this.db
      .select()
      .from(articles)
      .where(and(
        eq(articles.orgId, orgId),
        or(
          eq(articles.status, 'published'),     // All members see published
          eq(articles.createdById, userId),      // Creators see their own drafts
        ),
      ))
      .orderBy(desc(articles.createdAt));
  }
}
```

The router passes both `ctx.org.orgId` and `ctx.org.userId`:

```typescript
list: orgProcedure.query(async ({ ctx }) => {
  await requirePermission(ctx.org, 'article:read');
  const service = ctx.container.get(ArticleService);
  return service.list(ctx.org.orgId, ctx.org.userId);
}),
```

### Example: Personal Assignments within an Org

Tasks belong to an org, but each task is assigned to a specific member:

```typescript
async listMyTasks(orgId: string, userId: string): Promise<Task[]> {
  return this.db
    .select()
    .from(tasks)
    .where(and(
      eq(tasks.orgId, orgId),
      eq(tasks.assigneeId, userId),
    ));
}

async listAllTasks(orgId: string): Promise<Task[]> {
  return this.db
    .select()
    .from(tasks)
    .where(eq(tasks.orgId, orgId));
}
```

You might expose both as separate procedures, with `listAll` requiring a higher permission level.

## Common Mistakes

### Mistake 1: Using orgProcedure for user-specific data

```typescript
// Wrong -- user preferences are not org-scoped
get: orgProcedure.query(async ({ ctx }) => {
  return service.getByUserId(ctx.org.userId);
}),
```

```typescript
// Right -- use protectedProcedure for user data
get: protectedProcedure.query(async ({ ctx }) => {
  return service.getByUserId(ctx.session.user.id);
}),
```

User preferences should be accessible without an org context. Using `orgProcedure` would require the client to have an active org selected, which is unnecessary.

### Mistake 2: Trusting client-provided IDs for ownership

```typescript
// Wrong -- the client could send any orgId
create: orgProcedure
  .input(z.object({ orgId: z.string(), name: z.string() }))
  .mutation(async ({ input }) => {
    return service.create(input.orgId, input.name); // orgId from client!
  }),
```

```typescript
// Right -- orgId comes from the verified context
create: orgProcedure
  .input(z.object({ name: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return service.create(ctx.org.orgId, ctx.org.userId, input);
  }),
```

### Mistake 3: Forgetting the org filter on delete

```typescript
// Wrong -- deletes the product regardless of which org it belongs to
async delete(id: string): Promise<void> {
  await this.db.delete(products).where(eq(products.id, id));
}
```

```typescript
// Right -- only deletes if the product belongs to the specified org
async delete(id: string, orgId: string): Promise<void> {
  await this.db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.orgId, orgId)));
}
```

### Mistake 4: Skipping permission checks on read operations

```typescript
// Wrong -- no permission check
list: orgProcedure.query(async ({ ctx }) => {
  return service.list(ctx.org.orgId);
}),
```

```typescript
// Right -- check read permission
list: orgProcedure.query(async ({ ctx }) => {
  await requirePermission(ctx.org, 'product:read');
  return service.list(ctx.org.orgId);
}),
```

Even read operations should check permissions. A VIEWER role might have read access, but future custom roles might not.

## Testing Ownership

Always write tests that verify data isolation:

```typescript
describe('ProductService', () => {
  it('should not return products from other orgs', async () => {
    await service.create('org-1', 'user-1', { name: 'Product A' });

    const results = await service.list('org-2');
    expect(results).toHaveLength(0);
  });

  it('should not delete products from other orgs', async () => {
    const product = await service.create('org-1', 'user-1', { name: 'Product A' });

    await service.delete(product.id, 'org-2');

    const stillExists = await service.getById(product.id, 'org-1');
    expect(stillExists).not.toBeNull();
  });

  it('should not update products from other orgs', async () => {
    const product = await service.create('org-1', 'user-1', { name: 'Original' });

    await service.update(product.id, 'org-2', { name: 'Hacked' });

    const unchanged = await service.getById(product.id, 'org-1');
    expect(unchanged?.name).toBe('Original');
  });
});
```

## Security Checklist

Before merging any feature that touches data, verify:

- [ ] Schema has the correct ownership column (`userId` or `orgId`)
- [ ] Service methods always filter by the ownership column
- [ ] Router uses the correct procedure type (`protectedProcedure` or `orgProcedure`)
- [ ] Ownership IDs come from context (`ctx.session.user.id` or `ctx.org.orgId`), not from client input
- [ ] Mutations call `requirePermission()` with the appropriate permission string
- [ ] DELETE and UPDATE operations include the ownership column in their WHERE clause
- [ ] Tests verify that cross-tenant access is impossible
