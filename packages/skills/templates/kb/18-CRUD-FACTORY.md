# CruzJS CRUD Factory (`createCrud`)

`createCrud` generates a complete, production-ready CRUD implementation from a single config object.
It produces three injectable classes — a **Service**, a **tRPC Router**, and a **REST Router** — that can be registered directly in a `@Module` or extended with custom behavior.

---

## When to Use `createCrud` vs Manual

| Use `createCrud` when... | Write manually when... |
|--------------------------|------------------------|
| Standard list/get/create/update/delete | Need procedures that don't fit CRUD shape |
| You want REST + tRPC from one definition | Complex business logic intertwined with DB ops |
| Consistent auth / permission patterns | Multiple tables in a single operation |
| Quick feature scaffolding | Non-standard response shapes |
| Proof of concept | The feature is the core of the product |

`createCrud` handles ~70% of typical SaaS features. For the other 30%, write the service and router manually — see `03-DI-INVERSIFY.md` and `05-TRPC-ROUTERS.md`.

---

## Quick Start

```typescript
import { createCrud } from '@cruzjs/core/crud';
import { z } from 'zod';
import { products } from './products.schema';

export const {
  Service: ProductsService,
  Trpc: ProductsTrpc,
  RestRouter: ProductsRestRouter,
} = createCrud({
  name: 'Products',
  table: products,
  scope: 'org',
  createSchema: z.object({ name: z.string().min(1), price: z.number().positive() }),
  updateSchema: z.object({ name: z.string().min(1).optional(), price: z.number().positive().optional() }),
});

@Module({
  providers: [ProductsService, ProductsTrpc, ProductsRestRouter],
  trpcRouters: { products: ProductsTrpc },
  apiRouters: [ProductsRestRouter],
})
export class ProductsModule {}
```

This generates:
- `trpc.products.list` — paginated list (GET /api/products)
- `trpc.products.getById` — single record (GET /api/products/:id)
- `trpc.products.create` — create (POST /api/products)
- `trpc.products.update` — update (PATCH /api/products/:id)
- `trpc.products.delete` — delete (DELETE /api/products/:id)

---

## Full Config Reference

```typescript
interface CrudConfig<TTable> {
  // ── Required ───────────────────────────────────────────────────────────────

  /** Resource name. Used for DI token name and REST prefix. */
  name: string;

  /** Drizzle table reference (from your schema). */
  table: TTable;

  /**
   * Access scope:
   * - 'org'    → orgProcedure, filters by orgId, requires X-Organization-Id header
   * - 'user'   → protectedProcedure, filters by userId
   * - 'global' → protectedProcedure, no scope filter (admin/platform tables)
   */
  scope: 'org' | 'user' | 'global';

  /** Zod schema for create input. */
  createSchema: ZodTypeAny;

  /** Zod schema for update input (usually createSchema.partial()). */
  updateSchema: ZodTypeAny;

  // ── Optional ───────────────────────────────────────────────────────────────

  /**
   * FK column name for scope filtering.
   * Defaults: 'orgId' for 'org' scope, 'userId' for 'user' scope.
   */
  scopeColumn?: string;

  /**
   * Field-level filters for the list endpoint.
   * @see defineFilters()
   */
  filters?: FiltersConfig<TTable>;

  /**
   * Columns allowed in orderBy on list. When set, list input gains
   * orderBy (enum) and orderDir ('asc'|'desc') fields.
   */
  ordering?: string[];

  /**
   * Resource serializer class. When provided, output is passed through
   * new resource(row).transform() before returning to the client.
   * Hides internal columns, renames fields, adds computed properties.
   */
  resource?: ResourceClass;

  /**
   * Lifecycle hooks around mutations.
   * @see CrudHooks
   */
  hooks?: CrudHooks<TTable>;

  /**
   * Role-based permission functions (run before fetching the record).
   * Return false → FORBIDDEN.
   */
  permissions?: CrudPermissions;

  /**
   * Record-level policy checks (run after fetching the record).
   * Use for ownership checks, field-based rules.
   */
  policies?: CrudPolicies<TTable>;

  /**
   * Additional custom tRPC procedures merged into the generated router.
   */
  actions?: Record<string, AnyProcedure>;

  /**
   * Whether to use soft delete (set deletedAt instead of hard delete).
   * Auto-detected from presence of deletedAt column if not set.
   */
  softDelete?: boolean;

  /** Primary key column name. Default: 'id'. */
  idColumn?: string;
}
```

---

## Generated Classes and DI

`createCrud` generates three anonymous classes decorated with framework metadata:

### 1. `Service` (extends `BaseCrudService`)

Injectable service with 5 methods:
- `list(scopeId, options)` — paginated query
- `getById(id, scopeId)` — single record
- `create(data, scopeId)` — insert + hooks
- `update(id, data, scopeId)` — update + hooks
- `delete(id, scopeId)` — delete (or soft delete) + hooks

DI token: `Symbol.for('${name}CrudService')` — e.g. `ProductsCrudService`.

Resolve from another service:
```typescript
const PRODUCTS_SERVICE = Symbol.for('ProductsCrudService');

@injectable()
class OrdersService {
  constructor(@inject(PRODUCTS_SERVICE) private products: BaseCrudService<typeof products>) {}
}
```

### 2. `Trpc` (extends `TrpcRouter`)

OOP `@Router()` class with 5 CRUD procedures. Inject the generated service automatically.

Access the service inside actions:
```typescript
const { Service: ProductsService, Trpc: ProductsTrpc } = createCrud({ ... });

// Override by extending the generated Trpc class
class ExtendedProductsTrpc extends ProductsTrpc {
  @Route()
  archive = orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const svc = ctx.container.resolve(ProductsService);
      return svc.update(input.id, { status: 'archived' }, ctx.org.orgId);
    });
}
```

### 3. `RestRouter` (extends `@ApiRouter` class)

REST endpoints generated from the same config. Mounted at `/api/${kebab(name)}`.

---

## Scope Examples

### Org-scoped (most common)

```typescript
createCrud({
  name: 'Invoices',
  table: invoices,    // has invoices.orgId column
  scope: 'org',
  createSchema: ...,
  updateSchema: ...,
});
// Queries: WHERE invoices.orgId = ctx.org.orgId
// Procedures: orgProcedure (requires X-Organization-Id header)
```

### User-scoped

```typescript
createCrud({
  name: 'Preferences',
  table: preferences,  // has preferences.userId column
  scope: 'user',
  createSchema: ...,
  updateSchema: ...,
});
// Queries: WHERE preferences.userId = ctx.session.user.id
// Procedures: protectedProcedure (requires auth session)
```

### Global (admin/platform data)

```typescript
createCrud({
  name: 'Plans',
  table: plans,        // no tenant column
  scope: 'global',
  createSchema: ...,
  updateSchema: ...,
});
// No scope filter applied
// Procedures: protectedProcedure
```

---

## Filters

Use `defineFilters` to add filterable fields to the `list` endpoint:

```typescript
import { defineFilters } from '@cruzjs/core/crud';

createCrud({
  name: 'Products',
  table: products,
  scope: 'org',
  createSchema: ...,
  updateSchema: ...,
  filters: defineFilters(products, {
    name: 'search',    // ILIKE %name%
    status: 'exact',  // WHERE status = ?
    price: 'range',   // WHERE price BETWEEN min AND max
    createdAt: 'date', // date range filter
  }),
});
```

The generated `list` input schema gains filter fields automatically.
Client usage: `trpc.products.list.useQuery({ status: 'active', name: 'widget' })`.

---

## Ordering

```typescript
createCrud({
  name: 'Products',
  table: products,
  scope: 'org',
  createSchema: ...,
  updateSchema: ...,
  ordering: ['name', 'price', 'createdAt'],
});
// Client: trpc.products.list.useQuery({ orderBy: 'price', orderDir: 'desc' })
```

---

## Hooks

Hooks run around mutations. Use them for side effects (events, audit logs, data enrichment).

```typescript
createCrud({
  name: 'Products',
  table: products,
  scope: 'org',
  createSchema: ...,
  updateSchema: ...,
  hooks: {
    // Transform create input before insert
    beforeCreate: (data, ctx) => ({
      ...data,
      createdById: ctx.userId,
    }),

    // Side effect after create (events, notifications)
    afterCreate: async (product, ctx) => {
      await eventBus.dispatch(new ProductCreated({ product, orgId: ctx.orgId }));
    },

    // Transform update data
    beforeUpdate: (id, data, ctx) => ({
      ...data,
      updatedById: ctx.userId,
      updatedAt: new Date(),
    }),

    afterUpdate: async (product, ctx) => { ... },

    // Abort delete by throwing
    beforeDelete: async (id, ctx) => {
      const hasOrders = await checkHasOrders(id);
      if (hasOrders) throw new TRPCError({ code: 'CONFLICT', message: 'Cannot delete product with orders' });
    },

    afterDelete: async (id, ctx) => { ... },
  },
});
```

Hook parameters:
- `beforeCreate(data, ctx)` → return modified `data` (or original)
- `afterCreate(record, ctx)` → return void
- `beforeUpdate(id, data, ctx)` → return modified `data`
- `afterUpdate(record, ctx)` → return void
- `beforeDelete(id, ctx)` → return void (throw to abort)
- `afterDelete(id, ctx)` → return void

---

## Permissions

Role-based checks that run **before** the record is fetched:

```typescript
createCrud({
  name: 'Products',
  table: products,
  scope: 'org',
  createSchema: ...,
  updateSchema: ...,
  permissions: {
    list:   (ctx) => true,                                          // everyone
    get:    (ctx) => true,                                          // everyone
    create: (ctx) => ctx.role !== 'VIEWER',                         // member+
    update: (ctx) => ctx.role !== 'VIEWER',                         // member+
    delete: (ctx) => ctx.role === 'OWNER' || ctx.role === 'ADMIN',  // admin+
  },
});
```

If `permissions` is not provided, sensible RBAC defaults are applied based on the resource name.

---

## Policies (Object-Level Auth)

Policies check **after** the record is fetched, enabling ownership-based rules:

```typescript
import { definePolicy } from '@cruzjs/core/policies';

const InvoiceUpdatePolicy = definePolicy<Invoice>({
  update: (ctx, invoice) =>
    invoice.createdById === ctx.user.id || ctx.org?.role === 'ADMIN',
});

const InvoiceDeletePolicy = definePolicy<Invoice>({
  delete: (ctx, invoice) =>
    invoice.createdById === ctx.user.id || ctx.org?.role === 'OWNER',
});

createCrud({
  name: 'Invoices',
  table: invoices,
  scope: 'org',
  createSchema: ...,
  updateSchema: ...,
  policies: {
    update: InvoiceUpdatePolicy,
    delete: InvoiceDeletePolicy,
  },
});
```

---

## Custom Actions

Add non-standard procedures to the generated router:

```typescript
const { Service: InvoicesService, Trpc: InvoicesTrpc } = createCrud({
  name: 'Invoices',
  table: invoices,
  scope: 'org',
  createSchema: ...,
  updateSchema: ...,
  actions: {
    send: orgProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await requirePermission(ctx.org, 'invoice:send');
        const svc = ctx.container.resolve(InvoicesService);
        const invoice = await svc.getById(input.id, ctx.org.orgId);
        await ctx.container.resolve(EmailService).sendInvoice(invoice);
        return svc.update(input.id, { status: 'sent' }, ctx.org.orgId);
      }),

    stats: orgProcedure.query(async ({ ctx }) => {
      const svc = ctx.container.resolve(InvoicesService);
      // custom stats query
    }),
  },
});
```

Custom actions appear as `trpc.invoices.send` and `trpc.invoices.stats` alongside the standard 5.

---

## Resource Serializer

Use `resource` to transform DB rows before returning to the client:

```typescript
import { Resource } from '@cruzjs/core/resources';

class ProductResource extends Resource<Product> {
  transform() {
    return {
      id: this.model.id,
      name: this.model.name,
      price: `$${(this.model.priceCents / 100).toFixed(2)}`,
      // internal columns (cost, supplierId) are NOT included
    };
  }
}

createCrud({
  name: 'Products',
  table: products,
  scope: 'org',
  createSchema: ...,
  updateSchema: ...,
  resource: ProductResource,
});
```

---

## REST API Generation

The generated `RestRouter` mounts REST endpoints under `/api/${kebab(name)}`:

| Method | Path | Procedure |
|--------|------|-----------|
| GET    | `/api/products`      | `list`    |
| GET    | `/api/products/:id`  | `getById` |
| POST   | `/api/products`      | `create`  |
| PATCH  | `/api/products/:id`  | `update`  |
| DELETE | `/api/products/:id`  | `delete`  |

Register in `@Module({ apiRouters: [ProductsRestRouter] })`.

---

## Testing CRUD Modules

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContainer, createTestDb, createTestContext } from '@cruzjs/core/testing';
import { ProductsModule, ProductsService } from './products.module';
import * as schema from '../../database/schema';

describe('ProductsService', () => {
  let container: Awaited<ReturnType<typeof createTestContainer>>;
  let db: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    db = await createTestDb(schema);
    container = await createTestContainer([ProductsModule], {
      bindings: [{ token: DRIZZLE, value: db }],
    });
  });

  it('lists products for an org', async () => {
    const svc = container.resolve(ProductsService);
    await svc.create({ name: 'Widget', price: 100 }, 'org_123');
    await svc.create({ name: 'Other Product', price: 200 }, 'org_456'); // different org!

    const results = await svc.list('org_123', { page: 1, perPage: 10 });
    expect(results.items).toHaveLength(1);
    expect(results.items[0].name).toBe('Widget');
    // org_456's product must NOT appear — verifies org scoping
  });

  it('respects soft delete', async () => {
    const svc = container.resolve(ProductsService);
    const product = await svc.create({ name: 'Widget' }, 'org_123');
    await svc.delete(product.id, 'org_123');

    const results = await svc.list('org_123', { page: 1, perPage: 10 });
    expect(results.items).toHaveLength(0); // deleted items must not appear
  });
});
```
