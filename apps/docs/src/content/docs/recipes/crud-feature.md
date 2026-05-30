---
title: "Recipe: CRUD Feature"
description: Complete walkthrough building a "Projects" feature from scratch — schema, validation, service, OOP tRPC router, module, and UI.
---

This recipe walks through building a complete "Projects" CRUD feature using the **manual pattern** — explicit service, validation, and tRPC router. This is the right approach for real domain objects with business logic, custom queries, or item-level permission checks.

:::tip[Simple resource? Use the factory instead.]
For thin resources (tags, categories, config entries) with no custom queries, `createCrud()` generates the service, tRPC router, and REST router in one call. See [CRUD Router Factory](/advanced/crud) for both approaches and guidance on which to choose.
:::

By the end you will have a database table, Zod validation, an injectable service, a class-based tRPC router, a module, and React components.

## 1. Define the schema

Create the database table in your app's schema file:

```typescript
// apps/web/src/database/schema.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

const generateId = () => createId();
const nowISO = () => new Date().toISOString();

export const projects = sqliteTable('Project', {
  id: text('id').primaryKey().$defaultFn(generateId),
  name: text('name').notNull(),
  description: text('description'),
  orgId: text('orgId').notNull(),
  status: text('status').notNull().default('active'), // 'active' | 'archived'
  createdBy: text('createdBy').notNull(),
  createdAt: text('createdAt').notNull().$defaultFn(nowISO),
  updatedAt: text('updatedAt').notNull().$defaultFn(nowISO),
}, (table) => ({
  orgIdIdx: index('Project_orgId_idx').on(table.orgId),
}));

export * from '@cruzjs/start/database/schema';
```

Generate and apply the migration:

```bash
cruz db generate
cruz db migrate
```

## 2. Create validation schemas

Define Zod schemas for input validation:

```typescript
// apps/web/src/features/projects/project.validation.ts
import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'archived']).default('active'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
```

## 3. Create the service

Build the service class with Drizzle queries:

```typescript
// apps/web/src/features/projects/project.service.ts
import { Injectable, Inject } from '@cruzjs/core';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core';
import { projects } from '../../database/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { CreateProjectInput, UpdateProjectInput } from './project.validation';

export type Project = typeof projects.$inferSelect;

@Injectable()
export class ProjectService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async list(orgId: string): Promise<Project[]> {
    return this.db
      .select()
      .from(projects)
      .where(eq(projects.orgId, orgId))
      .orderBy(desc(projects.createdAt));
  }

  async getById(orgId: string, id: string): Promise<Project | null> {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.orgId, orgId)))
      .limit(1);
    return project ?? null;
  }

  async create(orgId: string, userId: string, input: CreateProjectInput): Promise<Project> {
    const [project] = await this.db
      .insert(projects)
      .values({ ...input, orgId, createdBy: userId })
      .returning();
    return project;
  }

  async update(orgId: string, id: string, input: UpdateProjectInput): Promise<Project> {
    const [updated] = await this.db
      .update(projects)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(and(eq(projects.id, id), eq(projects.orgId, orgId)))
      .returning();
    if (!updated) throw new Error('Project not found');
    return updated;
  }

  async delete(orgId: string, id: string): Promise<void> {
    await this.db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.orgId, orgId)));
  }
}
```

## 4. Create the tRPC router

Define API endpoints using the OOP pattern:

```typescript
// apps/web/src/features/projects/project.trpc.ts
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Inject, Router, Route, TrpcRouter } from '@cruzjs/core';
import { orgProcedure } from '@cruzjs/core/trpc/context';
import { ProjectService } from './project.service';
import { createProjectSchema, updateProjectSchema } from './project.validation';

@Router()
export class ProjectTrpc extends TrpcRouter {
  @Inject(ProjectService) private service!: ProjectService;

  @Route() list = orgProcedure.query(async ({ ctx }) =>
    this.service.list(ctx.org.orgId));

  @Route() getById = orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await this.service.getById(ctx.org.orgId, input.id);
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
      return project;
    });

  @Route() create = orgProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) =>
      this.service.create(ctx.org.orgId, ctx.org.userId, input));

  @Route() update = orgProcedure
    .input(z.object({ id: z.string(), data: updateProjectSchema }))
    .mutation(async ({ ctx, input }) => {
      const project = await this.service.getById(ctx.org.orgId, input.id);
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
      return this.service.update(ctx.org.orgId, input.id, input.data);
    });

  @Route() delete = orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await this.service.getById(ctx.org.orgId, input.id);
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
      await this.service.delete(ctx.org.orgId, input.id);
      return { success: true };
    });
}
```

## 5. Create the module

Register the service and router class together:

```typescript
// apps/web/src/features/projects/project.module.ts
import { Module } from '@cruzjs/core';
import { ProjectService } from './project.service';
import { ProjectTrpc } from './project.trpc';

@Module({
  providers: [ProjectService, ProjectTrpc],  // both need to be in providers
  trpcRouters: { project: ProjectTrpc },      // pass class reference, not instance
})
export class ProjectModule {}
```

## 6. Register the module

Add the module to `createCruzApp()`:

```typescript
// server.cloudflare.ts
import { createCruzApp } from '@cruzjs/core';
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';
import * as schema from './database/schema';
import { ProjectModule } from './features/projects/project.module';

export default createCruzApp({
  schema,
  modules: [ProjectModule],
  adapter: new CloudflareAdapter(),
  pages: () => import('virtual:react-router/server-build'),
});
```

## 7. Update the app router type

Add `ProjectTrpc` to `src/trpc/router.ts` for end-to-end type safety:

```typescript
// apps/web/src/trpc/router.ts
import { router } from '@cruzjs/core/trpc/context';
import { registerCruzCoreTrpcRouters } from '@cruzjs/core/trpc/routers';
import type { RouterProcedures } from '@cruzjs/core';
import type { ProjectTrpc } from '../features/projects/project.trpc';

const appRouter = router({
  ...registerCruzCoreTrpcRouters(),
  project: router({} as RouterProcedures<ProjectTrpc>),
});

export type AppRouter = typeof appRouter;
```

## 8. Build the UI

### Project list page

```tsx
// apps/web/src/routes/orgs.$slug.projects.tsx
import { trpc } from '~/trpc/client';

export default function ProjectsPage() {
  const { data: projects, isLoading, refetch } = trpc.project.list.useQuery();
  const deleteMutation = trpc.project.delete.useMutation({ onSuccess: refetch });

  if (isLoading) return <div>Loading…</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <a href="projects/new" className="btn btn-primary">New Project</a>
      </div>

      <div className="grid gap-4">
        {projects?.map((project) => (
          <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-semibold">{project.name}</h3>
              {project.description && <p className="text-gray-600 mt-1">{project.description}</p>}
            </div>
            <button
              onClick={() => deleteMutation.mutate({ id: project.id })}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Delete
            </button>
          </div>
        ))}

        {projects?.length === 0 && (
          <p className="text-gray-500 text-center py-8">No projects yet.</p>
        )}
      </div>
    </div>
  );
}
```

### Create project form

```tsx
// apps/web/src/routes/orgs.$slug.projects.new.tsx
import { useNavigate } from 'react-router';
import { trpc } from '~/trpc/client';
import { useState } from 'react';

export default function NewProjectPage() {
  const navigate = useNavigate();
  const createProject = trpc.project.create.useMutation();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      const project = await createProject.mutateAsync({
        name: formData.get('name') as string,
        description: (formData.get('description') as string) || undefined,
      });
      navigate(`../${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">New Project</h1>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block font-medium mb-1">Name</label>
          <input id="name" name="name" type="text" required maxLength={100}
            className="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label htmlFor="description" className="block font-medium mb-1">Description</label>
          <textarea id="description" name="description" maxLength={500} rows={3}
            className="w-full border rounded px-3 py-2" />
        </div>

        <button type="submit" disabled={createProject.isPending} className="btn btn-primary">
          {createProject.isPending ? 'Creating…' : 'Create Project'}
        </button>
      </form>
    </div>
  );
}
```

## Summary

| File | Purpose |
|------|---------|
| `database/schema.ts` | SQLite table definition with Drizzle |
| `project.validation.ts` | Zod schemas for input validation |
| `project.service.ts` | Injectable service with `@Injectable()` |
| `project.trpc.ts` | OOP tRPC router with `@Router()`, `@Route()`, `@Inject()` |
| `project.module.ts` | `@Module` registering providers and the trpcRouters class |
| `server.cloudflare.ts` | Register the module in `createCruzApp()` |
| `trpc/router.ts` | Add `RouterProcedures<ProjectTrpc>` for client types |
| Route files | React components using tRPC hooks |

## Next steps

- [CRUD Router Factory](/advanced/crud) — `createCrud()` factory and `BaseCrudService` full reference, including `defineFilters` and `Resource` serializers
- [tRPC Routers](/basics/trpc-routers) — Full reference for procedures, context, and patterns
- [Multi-Tenant SaaS Recipe](/recipes/multi-tenant-saas) — Org-scoped data patterns
- [Permissions](/pro/permissions) — Add permission checks to your CRUD
