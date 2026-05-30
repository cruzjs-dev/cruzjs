# Data Ownership Patterns

**This is the most critical doc for understanding how to scope data in CruzJS.**

## Two Ownership Models

### 1. User-Specific (Private)

Resource belongs to a **single user** and is not shared with anyone.

**Schema:**
```typescript
export const userPreferences = sqliteTable('UserPreferences', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('userId').notNull().references(() => authIdentity.id, { onDelete: 'cascade' }),
  theme: text('theme').default('light'),
  notifications: integer('notifications', { mode: 'boolean' }).default(true),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('UserPreferences_userId_idx').on(table.userId),
}));
```

**Service:**
```typescript
@injectable()
export class UserPreferencesService {
  constructor(@inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async getByUserId(userId: string): Promise<UserPreferences | null> {
    const [prefs] = await this.db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    return prefs ?? null;
  }

  async update(userId: string, input: UpdateInput): Promise<UserPreferences> {
    const [prefs] = await this.db
      .update(userPreferences)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId))  // CRITICAL: Filter by userId
      .returning();
    return prefs;
  }
}
```

**Router:**
```typescript
export const userPreferencesTrpc = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const container = await getAppContainer();
    const service = container.get<UserPreferencesService>(UserPreferencesService);
    return service.getByUserId(ctx.session.user.id);
  }),

  update: protectedProcedure
    .input(updatePreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      const container = await getAppContainer();
      const service = container.get<UserPreferencesService>(UserPreferencesService);
      return service.update(ctx.session.user.id, input);
    }),
});
```

### 2. Org-Scoped (Shared)

Resource belongs to an **organization** and is accessible by all org members based on permissions.

**Schema:**
```typescript
export const products = sqliteTable('Products', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  orgId: text('orgId').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdById: text('createdById').notNull().references(() => authIdentity.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  orgIdIdx: index('Products_orgId_idx').on(table.orgId),
  createdByIdIdx: index('Products_createdById_idx').on(table.createdById),
}));
```

**Key differences from user-specific:**
- Has `orgId` for organization scoping
- Has `createdById` for audit trail (who created it)
- All org members can access based on role permissions

**Service:**
```typescript
@injectable()
export class ProductService {
  constructor(@inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async list(orgId: string): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(eq(products.orgId, orgId))  // CRITICAL: Filter by orgId
      .orderBy(desc(products.createdAt));
  }

  async create(orgId: string, userId: string, input: CreateInput): Promise<Product> {
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
    // CRITICAL: Always filter by orgId to prevent cross-org access
    await this.db
      .delete(products)
      .where(and(
        eq(products.id, id),
        eq(products.orgId, orgId)
      ));
  }
}
```

**Router:**
```typescript
export const productTrpc = router({
  list: orgProcedure.query(async ({ ctx }) => {
    await requirePermission(ctx.org, 'product:read');
    const container = await getAppContainer();
    const service = container.get<ProductService>(ProductService);
    return service.list(ctx.org.orgId);
  }),

  create: orgProcedure
    .input(createProductSchema)
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.org, 'product:write');
      const container = await getAppContainer();
      const service = container.get<ProductService>(ProductService);
      return service.create(ctx.org.orgId, ctx.org.userId, input);
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.org, 'product:delete');
      const container = await getAppContainer();
      const service = container.get<ProductService>(ProductService);
      await service.delete(input.id, ctx.org.orgId);
      return { success: true };
    }),
});
```

## Decision Matrix

| Question | User-Specific | Org-Scoped |
|----------|---------------|------------|
| Who can see it? | Only the user | All org members |
| Who can edit it? | Only the user | Members with permission |
| Foreign key? | `userId` only | `orgId` + `createdById` |
| Procedure type? | `protectedProcedure` | `orgProcedure` |
| Permission check? | None needed | `requirePermission()` |
| Delete safety? | Filter by `userId` | Filter by `orgId` |

## Security Rules

1. **Always filter by ownership** - Never query without `userId` or `orgId` filter
2. **Never trust client IDs alone** - Always verify ownership in WHERE clause
3. **Double-check mutations** - Especially update and delete operations
4. **Audit sensitive changes** - Log create/update/delete for org-scoped resources
5. **Check permissions** - Use `requirePermission()` for all org-scoped operations

## Common Mistakes

### WRONG: No ownership filter

```typescript
// DANGEROUS - Returns all products, not just org's products
async getProduct(id: string): Promise<Product> {
  const [product] = await this.db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  return product;
}
```

### CORRECT: Filter by ownership

```typescript
// SAFE - Only returns product if it belongs to the org
async getProduct(id: string, orgId: string): Promise<Product | null> {
  const [product] = await this.db
    .select()
    .from(products)
    .where(and(
      eq(products.id, id),
      eq(products.orgId, orgId)
    ))
    .limit(1);
  return product ?? null;
}
```

## Hybrid Pattern (Rare)

Sometimes resources are org-scoped but have user-specific visibility rules:

```typescript
// Example: Drafts visible only to creator, published visible to all org members
export const articles = sqliteTable('Articles', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  orgId: text('orgId').notNull(),
  createdById: text('createdById').notNull(),
  status: articleStatusEnum('status').notNull(), // DRAFT | PUBLISHED
  title: text('title').notNull(),
});

// Service method
async listArticles(orgId: string, userId: string): Promise<Article[]> {
  return this.db
    .select()
    .from(articles)
    .where(and(
      eq(articles.orgId, orgId),
      or(
        eq(articles.status, 'PUBLISHED'),        // Everyone sees published
        eq(articles.createdById, userId)         // Creator sees their drafts
      )
    ));
}
```

## Testing Ownership

Always test that ownership filters work correctly:

```typescript
describe('ProductService', () => {
  it('should not return products from other orgs', async () => {
    // Create product in org1
    await service.create('org1', 'user1', { name: 'Product 1' });

    // Query from org2 should return empty
    const products = await service.list('org2');
    expect(products).toHaveLength(0);
  });

  it('should not delete products from other orgs', async () => {
    const product = await service.create('org1', 'user1', { name: 'Product 1' });

    // Try to delete from org2 should not work
    await service.delete(product.id, 'org2');

    // Product should still exist
    const stillExists = await service.getProduct(product.id, 'org1');
    expect(stillExists).not.toBeNull();
  });
});
```
