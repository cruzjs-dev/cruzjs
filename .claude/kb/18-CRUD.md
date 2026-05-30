# CRUD Patterns

CruzJS offers two approaches for resource CRUD. Choose based on complexity.

## Decision Rule

| Signal | Use |
|--------|-----|
| Standard list/get/create/update/delete, no custom queries | `createCrud()` factory |
| Custom queries, JOINs, business logic, non-trivial methods | Manual: `BaseCrudService` + `@Router()` |
| Starting simple, expecting growth | Factory first, then eject |
| Performance-sensitive list (requires JOIN or subquery) | Manual always |

**Default: manual.** The factory is a convenience for genuinely thin CRUD resources (tags, categories, config entries, lookup tables). For anything with real domain logic, write it explicitly.

---

## Approach 1: Factory — `createCrud()`

One call generates a typed `Service`, `Trpc` (OOP router), `RestRouter`, and `ServiceToken`.

```typescript
// features/tags/tags.crud.ts
import { createCrud, defineFilters } from '@cruzjs/core';
import { z } from 'zod';
import { tags } from '../../database/schema';

export const { Service: TagsService, Trpc: TagsTrpc, RestRouter: TagsRestRouter, ServiceToken: TagsServiceToken } = createCrud({
  name: 'Tags',
  table: tags,
  scope: 'org',                       // 'org' | 'user' | 'global'
  createSchema: z.object({ name: z.string().min(1).max(50) }),
  updateSchema: z.object({ name: z.string().min(1).max(50).optional() }),

  // Optional: declarative filters
  filters: defineFilters(tags, { name: 'search' }),

  // Optional: allowed sort columns
  ordering: ['name', 'createdAt'],

  // Optional: output serializer (hides internal columns, adds computed fields)
  resource: TagResource,

  // Optional: lifecycle hooks
  hooks: {
    beforeCreate: (data, ctx) => ({ ...data, createdBy: ctx.userId }),
    afterCreate: (item, ctx) => events.emit(new TagCreated(item)),
  },

  // Optional: per-action permission functions (return false = FORBIDDEN)
  permissions: {
    delete: (ctx) => ctx.role === 'OWNER' || ctx.role === 'ADMIN',
  },

  // Optional: extra tRPC procedures beyond CRUD
  actions: {
    popular: orgProcedure.query(async ({ ctx }) => { ... }),
  },

  softDelete: true,   // auto-detected from deletedAt column; override here
  idColumn: 'id',     // default: 'id'
});
```

Register in module:
```typescript
@Module({
  providers: [TagsService, TagsTrpc, TagsRestRouter],
  trpcRouters: { tags: TagsTrpc },
  apiRouters: [TagsRestRouter],
})
export class TagsModule {}
```

Generated tRPC procedures: `tags.list`, `tags.get`, `tags.create`, `tags.update`, `tags.delete` + any custom `actions`.

Generated REST routes: `GET /api/tags`, `GET /api/tags/:id`, `POST /api/tags`, `PATCH /api/tags/:id`, `DELETE /api/tags/:id`.

**Limitations:**
- Can't override individual CRUD methods (e.g. custom JOIN on list)
- Stack traces show `GeneratedService` not your class name
- Custom queries must go in `actions` (tRPC-only, no REST equivalent)
- Complex permissions (item-level ownership checks) are awkward

---

## Approach 2: Manual — `BaseCrudService` + `@Router()`

Explicit, fully debuggable, extendable. Use for real domain objects.

### Service

Extend `BaseCrudService` to get free list/get/create/update/delete, then add your own methods:

```typescript
// features/projects/project.service.ts
import { Injectable, Inject } from '@cruzjs/core';
import { DRIZZLE, type CruzDatabase } from '@cruzjs/core';
import { BaseCrudService } from '@cruzjs/core';
import { projects } from '../../database/schema';
import { eq, and, desc } from 'drizzle-orm';

@Injectable()
export class ProjectService extends BaseCrudService<typeof projects> {
  constructor(@Inject(DRIZZLE) db: CruzDatabase) {
    super(db, projects, { scope: 'org', softDelete: true });
  }

  // Custom query — not possible with the factory
  async getFeatured(orgId: string) {
    return this.db.select().from(this.table)
      .where(and(eq(projects.orgId, orgId), eq(projects.featured, true)))
      .orderBy(desc(projects.createdAt));
  }

  // Override base method for custom behaviour
  async list(orgId: string | null, opts: CrudListOptions) {
    // custom JOIN, extra WHERE, etc.
    return super.list(orgId, opts);
  }
}
```

`BaseCrudService` provides:
- `list(scopeId, opts)` — paginated, scope-filtered, soft-delete aware, orderable, filterable
- `getById(id, scopeId)` — scope-checked, null if soft-deleted
- `create(data)` — insert + returning
- `update(id, data)` — partial, auto-sets `updatedAt`
- `delete(id)` — soft (sets `deletedAt`) or hard based on config

Protected helpers available to subclasses:
- `this.db` — the Drizzle database
- `this.table` — the Drizzle table
- `this.col(name)` — column accessor
- `this.activeWhere(scopeId)` — pre-built scope + soft-delete WHERE condition
- `this.hasSoftDelete()` — whether soft-delete is active

### tRPC Router

```typescript
// features/projects/project.trpc.ts
import { TrpcRouter, Router, Route, Inject } from '@cruzjs/core';
import { orgProcedure } from '@cruzjs/core';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { ProjectService } from './project.service';
import { defineFilters } from '@cruzjs/core';
import { projects } from '../../database/schema';

const projectFilters = defineFilters(projects, {
  name: 'search',
  status: 'exact',
});

@Router()
export class ProjectTrpc extends TrpcRouter {
  @Inject(ProjectService) private svc!: ProjectService;

  @Route() list = orgProcedure
    .input(z.object({
      page: z.number().default(1),
      perPage: z.number().default(20),
      ...projectFilters.toSchema().shape,
    }))
    .query(async ({ ctx, input }) => {
      const where = projectFilters.toWhereConditions(projects, input);
      return this.svc.list(ctx.org.orgId, { page: input.page, perPage: input.perPage, whereConditions: where });
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
      return this.svc.update(input.id, input.data);
    });

  @Route() delete = orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await this.svc.getById(input.id, ctx.org.orgId);
      if (!item) throw new TRPCError({ code: 'NOT_FOUND' });
      await this.svc.delete(input.id);
    });

  // Custom action — just another @Route()
  @Route() featured = orgProcedure
    .query(({ ctx }) => this.svc.getFeatured(ctx.org.orgId));
}
```

---

## `defineFilters` — Declarative Filters

Works with both approaches. Generates a Zod schema AND Drizzle WHERE conditions from the same config.

```typescript
const filters = defineFilters(products, {
  name: 'search',        // LIKE %value%
  status: 'exact',       // = value
  price: 'range',        // priceMin / priceMax
  createdAt: 'date-range', // createdAtAfter / createdAtBefore
  category: 'in',        // IN (...) — array or comma-separated string
  active: 'boolean',     // = true/false
});

// In tRPC input:
.input(z.object({ page: z.number(), ...filters.toSchema().shape }))

// Build WHERE:
const where = filters.toWhereConditions(products, input);
return svc.list(orgId, { page, perPage, whereConditions: where });
```

Handles REST string coercion automatically (`?price=10&active=true&category=a,b`).

---

## `Resource` — Output Serialization

Like DRF serializers. Pass as `resource:` in the factory or apply manually.

```typescript
class ProjectResource extends Resource<typeof projects.$inferSelect> {
  transform() {
    return {
      id: this.model.id,
      name: this.model.name,
      // computed
      isArchived: this.model.status === 'archived',
      // hide internal columns by omission
    };
  }
}

// Manual application in tRPC:
return new ProjectResource(item).transform();

// Or apply to all items:
return items.map(i => new ProjectResource(i).transform());
```

---

## Scope Column Defaults

| `scope` | Default `scopeColumn` | Procedure used |
|---------|----------------------|----------------|
| `'org'` | `orgId` | `orgProcedure` |
| `'user'` | `userId` | `protectedProcedure` |
| `'global'` | none | `protectedProcedure` |

Override: `scopeColumn: 'workspaceId'`

---

## Module Registration

Factory:
```typescript
@Module({
  providers: [TagsService, TagsTrpc, TagsRestRouter],
  trpcRouters: { tags: TagsTrpc },
  apiRouters: [TagsRestRouter],
})
export class TagsModule {}
```

Manual:
```typescript
@Module({
  providers: [ProjectService, ProjectTrpc],
  trpcRouters: { project: ProjectTrpc },
})
export class ProjectsModule {}
```
