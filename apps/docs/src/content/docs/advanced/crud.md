---
title: "CRUD Router Factory"
description: Two approaches for resource CRUD in CruzJS — the createCrud() factory for thin resources and the manual BaseCrudService + @Router() pattern for domain objects with real business logic.
---

CruzJS provides two complementary approaches for building CRUD resources. Both produce typed tRPC procedures, share the same filter and serializer building blocks, and integrate with the DI container.

## Which approach should I use?

| Signal | Approach |
|--------|----------|
| Tags, categories, config entries, lookup tables | `createCrud()` factory |
| Projects, invoices, orders — real domain objects | Manual (`BaseCrudService` + `@Router()`) |
| Need a JOIN or subquery on the list endpoint | Manual |
| Need item-level ownership checks | Manual |
| Need custom queries beyond the 5 standard ops | Manual (or factory + `actions`) |
| Prototype or genuinely thin resource | Factory first, eject later |

**Default to manual.** The factory is excellent for genuinely thin resources. For anything with business logic, explicit code is easier to read, debug, and extend.

---

## Approach 1: `createCrud()` Factory

One call generates a typed `Service`, `Trpc` router, `RestRouter`, and DI token.

### Minimal example

```typescript
// features/tags/tags.crud.ts
import { createCrud } from '@cruzjs/core';
import { z } from 'zod';
import { tags } from '../../database/schema';

export const {
  Service: TagsService,
  Trpc: TagsTrpc,
  RestRouter: TagsRestRouter,
  ServiceToken: TagsServiceToken,
} = createCrud({
  name: 'Tags',
  table: tags,
  scope: 'org',
  createSchema: z.object({ name: z.string().min(1).max(50) }),
  updateSchema: z.object({ name: z.string().min(1).max(50).optional() }),
});
```

Register in a module:

```typescript
// features/tags/tags.module.ts
import { Module } from '@cruzjs/core';
import { TagsService, TagsTrpc, TagsRestRouter } from './tags.crud';

@Module({
  providers: [TagsService, TagsTrpc, TagsRestRouter],
  trpcRouters: { tags: TagsTrpc },
  apiRouters: [TagsRestRouter],
})
export class TagsModule {}
```

This gives you:

| tRPC | REST |
|------|------|
| `tags.list` | `GET /api/tags` |
| `tags.get` | `GET /api/tags/:id` |
| `tags.create` | `POST /api/tags` |
| `tags.update` | `PATCH /api/tags/:id` |
| `tags.delete` | `DELETE /api/tags/:id` |

### Full configuration

```typescript
import { createCrud, defineFilters } from '@cruzjs/core';
import { z } from 'zod';
import { orgProcedure } from '@cruzjs/core';

export const { Service: TagsService, Trpc: TagsTrpc, RestRouter: TagsRestRouter } = createCrud({
  name: 'Tags',
  table: tags,

  // --- Required ---
  scope: 'org',            // 'org' | 'user' | 'global'
  createSchema: z.object({ name: z.string() }),
  updateSchema: z.object({ name: z.string().optional() }),

  // --- Optional ---
  scopeColumn: 'orgId',   // FK column — defaults: orgId, userId per scope

  // Declarative field filters on the list endpoint
  filters: defineFilters(tags, { name: 'search', active: 'boolean' }),

  // Columns users can sort by
  ordering: ['name', 'createdAt'],

  // Output serializer (hides internal columns, adds computed fields)
  resource: TagResource,

  // Lifecycle hooks
  hooks: {
    beforeCreate: (data, ctx) => ({ ...data, createdBy: ctx.userId }),
    afterCreate: async (item, ctx) => events.emit(new TagCreated(item)),
    beforeDelete: async (id, ctx) => { /* throw to abort */ },
  },

  // Per-action permission guards — return false → FORBIDDEN
  permissions: {
    create: (ctx) => ctx.role !== 'VIEWER',
    delete: (ctx) => ctx.role === 'OWNER' || ctx.role === 'ADMIN',
  },

  // Extra tRPC procedures added to the generated router
  actions: {
    popular: orgProcedure.query(async ({ ctx }) => { /* custom query */ }),
  },

  softDelete: true,   // auto-detected from deletedAt column; override here
  idColumn: 'id',     // default: 'id'
});
```

### Hook context

```typescript
interface CrudCtx {
  userId: string | null;   // authenticated user
  orgId: string | null;    // current org (org scope only)
  role: string | null;     // user's org role (org scope only)
  request: Request;        // raw HTTP request
}
```

### When `createCrud()` is not enough

- You need a JOIN or subquery on `list` — the base `list()` is a simple `SELECT *`
- You need item-level checks (e.g. "only the creator can edit their own record")
- You need the service in other services via DI with a custom interface
- `GeneratedService` appearing in stack traces is frustrating to debug

In these cases, use the manual pattern below.

---

## Approach 2: Manual — `BaseCrudService` + `@Router()`

Explicit classes. Real names in stack traces. Override any method. Add custom queries naturally.

### Service

Extend `BaseCrudService` to inherit the 5 standard operations, then add your own:

```typescript
// features/projects/project.service.ts
import { Injectable, Inject } from '@cruzjs/core';
import { BaseCrudService, type CrudListOptions } from '@cruzjs/core';
import { DRIZZLE, type CruzDatabase } from '@cruzjs/core';
import { projects } from '../../database/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

@Injectable()
export class ProjectService extends BaseCrudService<typeof projects> {
  constructor(@Inject(DRIZZLE) db: CruzDatabase) {
    super(db, projects, { scope: 'org', softDelete: true });
  }

  // Custom queries — this is what the factory can't do
  async getFeatured(orgId: string) {
    return this.db.select().from(this.table)
      .where(and(eq(projects.orgId, orgId), eq(projects.featured, true)))
      .orderBy(desc(projects.createdAt));
  }

  // Override base method for custom behaviour (e.g. adding a JOIN)
  async listWithStats(orgId: string, opts: CrudListOptions) {
    // build on this.activeWhere() to keep soft-delete + scope filtering
    const where = this.activeWhere(orgId);
    return this.db
      .select({ ...projects, taskCount: sql<number>`count(t.id)` })
      .from(this.table)
      .leftJoin(tasks, eq(tasks.projectId, projects.id))
      .where(where)
      .groupBy(projects.id)
      .limit(opts.perPage)
      .offset((opts.page - 1) * opts.perPage);
  }
}
```

#### `BaseCrudService` API

| Method | Signature | Notes |
|--------|-----------|-------|
| `list` | `(scopeId, opts: CrudListOptions)` | Paginated, scope+soft-delete filtered, orderable |
| `getById` | `(id, scopeId)` | Returns null if not found or soft-deleted |
| `create` | `(data)` | Insert + returning |
| `update` | `(id, data)` | Partial, auto-sets `updatedAt` |
| `delete` | `(id)` | Soft (sets `deletedAt`) or hard delete |

Protected helpers available to subclasses:

```typescript
this.db                     // CruzDatabase
this.table                  // the Drizzle table
this.col(name)              // column accessor
this.activeWhere(scopeId)   // pre-built scope + soft-delete WHERE condition
this.hasSoftDelete()        // boolean
```

#### `CrudListOptions`

```typescript
interface CrudListOptions {
  page: number;
  perPage: number;
  orderBy?: string;          // column name
  orderDir?: 'asc' | 'desc';
  whereConditions?: SQL[];   // extra pre-computed conditions (from defineFilters)
}
```

### tRPC Router

Use the standard `@Router()` / `@Route()` / `@Inject()` pattern:

```typescript
// features/projects/project.trpc.ts
import { TrpcRouter, Router, Route, Inject } from '@cruzjs/core';
import { orgProcedure } from '@cruzjs/core';
import { defineFilters } from '@cruzjs/core';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { ProjectService } from './project.service';
import { projects } from '../../database/schema';
import { createProjectSchema, updateProjectSchema } from './project.validation';

const filters = defineFilters(projects, {
  name: 'search',
  status: 'exact',
  createdAt: 'date-range',
});

@Router()
export class ProjectTrpc extends TrpcRouter {
  @Inject(ProjectService) private svc!: ProjectService;

  @Route() list = orgProcedure
    .input(z.object({
      page: z.number().default(1),
      perPage: z.number().max(100).default(20),
      orderBy: z.enum(['name', 'createdAt']).optional(),
      orderDir: z.enum(['asc', 'desc']).optional(),
      ...filters.toSchema().shape,
    }))
    .query(async ({ ctx, input }) => {
      const where = filters.toWhereConditions(projects, input);
      return this.svc.list(ctx.org.orgId, {
        page: input.page,
        perPage: input.perPage,
        orderBy: input.orderBy,
        orderDir: input.orderDir,
        whereConditions: where,
      });
    });

  @Route() get = orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await this.svc.getById(input.id, ctx.org.orgId);
      if (!item) throw new TRPCError({ code: 'NOT_FOUND' });
      return item;
    });

  @Route() create = orgProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) =>
      this.svc.create({ ...input, orgId: ctx.org.orgId, createdBy: ctx.org.userId }));

  @Route() update = orgProcedure
    .input(z.object({ id: z.string(), data: updateProjectSchema }))
    .mutation(async ({ ctx, input }) => {
      const item = await this.svc.getById(input.id, ctx.org.orgId);
      if (!item) throw new TRPCError({ code: 'NOT_FOUND' });
      // Item-level ownership check — not possible with the factory
      if (item.createdBy !== ctx.org.userId && ctx.org.role !== 'OWNER') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return this.svc.update(input.id, input.data);
    });

  @Route() delete = orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await this.svc.getById(input.id, ctx.org.orgId);
      if (!item) throw new TRPCError({ code: 'NOT_FOUND' });
      await this.svc.delete(input.id);
    });

  // Custom endpoints are just more @Route() methods
  @Route() featured = orgProcedure
    .query(({ ctx }) => this.svc.getFeatured(ctx.org.orgId));
}
```

### Module

```typescript
// features/projects/project.module.ts
import { Module } from '@cruzjs/core';
import { ProjectService } from './project.service';
import { ProjectTrpc } from './project.trpc';

@Module({
  providers: [ProjectService, ProjectTrpc],
  trpcRouters: { project: ProjectTrpc },
})
export class ProjectsModule {}
```

---

## Building Blocks (use with either approach)

### `defineFilters` — Declarative Filters

Generates a Zod input schema AND Drizzle WHERE conditions from the same config.

```typescript
import { defineFilters } from '@cruzjs/core';

const filters = defineFilters(products, {
  name: 'search',           // LIKE %value%
  status: 'exact',          // = value
  price: 'range',           // priceMin + priceMax inputs
  createdAt: 'date-range',  // createdAtAfter + createdAtBefore inputs
  category: 'in',           // IN (...) — accepts array (tRPC) or "a,b,c" (REST)
  active: 'boolean',        // = true/false, coerces "true"/"1" from query params
});

// Add to tRPC input:
.input(z.object({ page: z.number(), ...filters.toSchema().shape }))

// Build WHERE:
const where = filters.toWhereConditions(products, input);
await svc.list(orgId, { page, perPage, whereConditions: where });
```

| Operator | Generated inputs | Drizzle operation |
|----------|-----------------|-------------------|
| `exact` | `field` | `eq(col, value)` |
| `search` | `field` | `like(col, '%value%')` |
| `range` | `fieldMin`, `fieldMax` | `gte`, `lte` |
| `date-range` | `fieldAfter`, `fieldBefore` | `gte`, `lte` |
| `in` | `field` (array or CSV) | `inArray(col, arr)` |
| `boolean` | `field` | `eq(col, bool)` |

### `Resource` — Output Serialization

Control exactly what each endpoint returns. Hides internal columns, adds computed fields.

```typescript
import { Resource } from '@cruzjs/core';

class ProjectResource extends Resource<typeof projects.$inferSelect> {
  transform() {
    return {
      id: this.model.id,
      name: this.model.name,
      isArchived: this.model.status === 'archived',  // computed
      // orgId, deletedAt, internalField are omitted
    };
  }
}

// Apply manually in a tRPC handler:
return new ProjectResource(item).transform();

// Apply to a list:
return { items: items.map(i => new ProjectResource(i).transform()), total };
```

Pass as `resource:` in `createCrud()` to apply automatically to all outputs.

---

## Scope Reference

| `scope` | Default `scopeColumn` | Procedure | Context field |
|---------|----------------------|-----------|---------------|
| `'org'` | `orgId` | `orgProcedure` | `ctx.org.orgId` |
| `'user'` | `userId` | `protectedProcedure` | `ctx.session.user.id` |
| `'global'` | — | `protectedProcedure` | n/a |

Override: `scopeColumn: 'workspaceId'`

---

## Approach Comparison

```
                    createCrud()   Manual
─────────────────────────────────────────
Boilerplate              low        medium
Custom queries            ✗           ✓
Override list/get         ✗           ✓
Item-level permissions    ✗           ✓
Real class names          ✗           ✓
IDE go-to-definition      ✗           ✓
defineFilters             ✓           ✓
Resource serializer       ✓           ✓
REST + tRPC auto          ✓       tRPC yes, REST via @ApiRouter()
Eject path                ✓          n/a
```

---

## Related

- [tRPC Routers](/basics/trpc-routers) — Full `@Router()` / `@Route()` reference
- [Services](/basics/services) — `@Injectable()` services and DI
- [Recipe: CRUD Feature](/recipes/crud-feature) — Step-by-step walkthrough for the manual pattern
