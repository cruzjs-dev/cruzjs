# Data Ownership (CRITICAL)

Every table must have clear ownership. Every query must filter by ownership.

## Two Models

### 1. User-Specific (Private)

Belongs to one user. Not shared. Use `protectedProcedure`.

**Schema:**
```typescript
export const notes = sqliteTable('Notes', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('userId').notNull().references(() => authIdentity.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});
```

**Service — always filter by userId:**
```typescript
async list(userId: string) {
  return this.db.select().from(notes).where(eq(notes.userId, userId));
}

async update(userId: string, id: string, input: UpdateInput) {
  const [note] = await this.db.update(notes)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning();
  return note ?? null;
}
```

**Router:**
```typescript
list: protectedProcedure.query(async ({ ctx }) => {
  return service.list(ctx.session.user.id);
}),
```

### 2. Org-Scoped (Shared)

Belongs to an organization. All org members can access based on permissions. Use `orgProcedure`.

**Schema:**
```typescript
export const products = sqliteTable('Products', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  orgId: text('orgId').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdById: text('createdById').notNull().references(() => authIdentity.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});
```

**Service — always filter by orgId:**
```typescript
async list(orgId: string) {
  return this.db.select().from(products).where(eq(products.orgId, orgId));
}

async delete(id: string, orgId: string) {
  await this.db.delete(products)
    .where(and(eq(products.id, id), eq(products.orgId, orgId)));
}
```

**Router:**
```typescript
list: orgProcedure.query(async ({ ctx }) => {
  await requirePermission(ctx.org, 'product:read');
  return service.list(ctx.org.orgId);
}),

create: orgProcedure.input(createSchema).mutation(async ({ ctx, input }) => {
  await requirePermission(ctx.org, 'product:write');
  return service.create(ctx.org.orgId, ctx.org.userId, input);
}),
```

## Decision Matrix

| Question | User-Specific | Org-Scoped |
|----------|---------------|------------|
| Who sees it? | Only the user | All org members |
| Who edits it? | Only the user | Members with permission |
| Foreign key? | `userId` only | `orgId` + `createdById` |
| Procedure? | `protectedProcedure` | `orgProcedure` |
| Permission check? | None needed | `requirePermission()` |
| Delete safety? | Filter by `userId` | Filter by `orgId` |

## Security Rules

1. **Every query must filter by ownership** -- never select by ID alone
2. **Never trust client IDs** -- always verify in WHERE clause
3. **Double-check mutations** -- especially update and delete
4. **Check permissions** -- `requirePermission()` for all org-scoped ops
5. **Audit sensitive changes** -- log create/update/delete for org resources

## Common Mistakes

### WRONG -- no ownership filter:
```typescript
async getProduct(id: string) {
  const [p] = await this.db.select().from(products).where(eq(products.id, id));
  return p;  // DANGEROUS: returns product from any org
}
```

### CORRECT -- filter by ownership:
```typescript
async getProduct(id: string, orgId: string) {
  const [p] = await this.db.select().from(products)
    .where(and(eq(products.id, id), eq(products.orgId, orgId)))
    .limit(1);
  return p ?? null;
}
```

## Testing Ownership

```typescript
it('should not return products from other orgs', async () => {
  await service.create('org1', 'user1', { name: 'Product 1' });
  const products = await service.list('org2');
  expect(products).toHaveLength(0);
});
```
