---
title: tRPC Routers
description: Creating type-safe API endpoints with tRPC in CruzJS.
---

CruzJS uses [tRPC](https://trpc.io/) for type-safe API endpoints. Routers define queries (read operations) and mutations (write operations), with built-in authentication and organization scoping.

## Procedure types

| Procedure | Auth required | Org context | Typical use |
|-----------|:---:|:---:|-------------|
| `publicProcedure` | No | No | Health checks, login, public data |
| `protectedProcedure` | Yes | No | User profile, list user's orgs |
| `orgProcedure` | Yes | Yes | All org-scoped resources |

```ts
import { publicProcedure, protectedProcedure, orgProcedure } from '@cruzjs/core/trpc/context';
```

## Context object

Each procedure type exposes a different `ctx` shape:

```ts
// publicProcedure
ctx.request              // The HTTP Request object

// protectedProcedure (adds session)
ctx.session.user.id      // Authenticated user ID
ctx.session.session      // Full session data

// orgProcedure (adds org)
ctx.org.orgId            // Current organization ID
ctx.org.userId           // Current user ID
ctx.org.role             // 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
```

## OOP router (preferred)

The preferred way to define routers is with `@Router()`, `@Route()`, and `TrpcRouter`. Services are injected as class properties via `@Inject()` — no `getAppContainer()` calls needed inside procedures.

```ts
// features/project/project.trpc.ts
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

  @Route() get = orgProcedure
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

Register the router class in your module — pass the **class**, not an instance:

```ts
// features/project/project.module.ts
import { Module } from '@cruzjs/core';
import { ProjectService } from './project.service';
import { ProjectTrpc } from './project.trpc';

@Module({
  providers: [ProjectService, ProjectTrpc],
  trpcRouters: { project: ProjectTrpc },  // class reference, not new ProjectTrpc()
})
export class ProjectModule {}
```

Add `ProjectTrpc` to the central app router for full end-to-end type safety:

```ts
// src/trpc/router.ts
import { router } from '@cruzjs/core/trpc/context';
import { registerCruzCoreTrpcRouters } from '@cruzjs/core/trpc/routers';
import type { RouterProcedures } from '@cruzjs/core';
import type { ProjectTrpc } from '../features/project/project.trpc';

const appRouter = router({
  ...registerCruzCoreTrpcRouters(),
  project: router({} as RouterProcedures<ProjectTrpc>),
});

export type AppRouter = typeof appRouter;
```

### How it works

| Decorator | Purpose |
|-----------|---------|
| `@Router()` | Makes the class DI-injectable; marks it for the framework to resolve and build |
| `@Route()` | Marks a property as a tRPC procedure — only decorated properties are collected |
| `@Inject(Service)` | Stores property injection metadata; framework injects dependencies after DI resolution |
| `RouterProcedures<T>` | Extracts all `@Route()`-decorated procedures from a class for the client-side `AppRouter` type |

## Functional router (also supported)

The classic functional style still works and can be used alongside OOP routers:

```ts
// features/project/project.trpc.ts
import { router, orgProcedure } from '@cruzjs/core/trpc/context';
import { ProjectService } from './project.service';

export const projectTrpc = router({
  list: orgProcedure.query(async ({ ctx }) => {
    const service = ctx.container.get(ProjectService);
    return service.list(ctx.org.orgId);
  }),
});
```

Pass the **router instance** (not the class) to `@Module`:

```ts
@Module({
  providers: [ProjectService],
  trpcRouters: { project: projectTrpc },  // router instance
})
export class ProjectModule {}
```

## User-scoped router

For data that belongs to the user rather than an organization, use `protectedProcedure`:

```ts
@Router()
export class UserPreferencesTrpc extends TrpcRouter {
  @Inject(UserPreferencesService) private service!: UserPreferencesService;

  @Route() get = protectedProcedure.query(async ({ ctx }) =>
    this.service.getByUserId(ctx.session.user.id));

  @Route() update = protectedProcedure
    .input(updatePreferencesSchema)
    .mutation(async ({ ctx, input }) =>
      this.service.update(ctx.session.user.id, input));
}
```

## Public router (no auth)

For endpoints that do not require authentication:

```ts
@Router()
export class InvitationTrpc extends TrpcRouter {
  @Inject(InvitationService) private service!: InvitationService;

  @Route() getByToken = publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const invitation = await this.service.getByToken(input.token);
      if (!invitation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
      return invitation;
    });
}
```

## Nesting routers

Use the `router()` function to nest sub-routers for logical grouping:

```ts
const appRouter = router({
  ...registerCruzCoreTrpcRouters(),
  project: router({} as RouterProcedures<ProjectTrpc>),
  admin: router({
    users: router({} as RouterProcedures<AdminUsersTrpc>),
    billing: router({} as RouterProcedures<AdminBillingTrpc>),
  }),
});
```

This produces endpoints like `trpc.admin.users.list`, `trpc.admin.billing.get`, etc.

## Input validation

Attach a Zod schema with `.input()` — the `input` parameter inside the procedure is fully typed:

```ts
@Route() create = orgProcedure
  .input(z.object({
    name: z.string().min(1).max(100).trim(),
    description: z.string().max(500).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  }))
  .mutation(async ({ ctx, input }) => {
    // input: { name: string; description?: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' }
    return this.service.create(ctx.org.orgId, ctx.org.userId, input);
  });
```

Invalid input automatically returns a `BAD_REQUEST` error with field-level details — no try/catch needed.

## Error handling

```ts
import { TRPCError } from '@trpc/server';

throw new TRPCError({ code: 'NOT_FOUND',             message: 'Project not found' });
throw new TRPCError({ code: 'UNAUTHORIZED',          message: 'Authentication required' });
throw new TRPCError({ code: 'FORBIDDEN',             message: 'Permission denied' });
throw new TRPCError({ code: 'CONFLICT',              message: 'Name already taken' });
throw new TRPCError({ code: 'BAD_REQUEST',           message: 'Invalid status transition' });
throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' });
```

## Client usage

Call procedures from React components using the typed tRPC client:

```tsx
import { trpc } from '@/trpc/client';

function ProjectListPage() {
  // Query — runs automatically, refetches in background
  const { data, isLoading, error, refetch } = trpc.project.list.useQuery();

  // Query with input
  const { data: project } = trpc.project.get.useQuery({ id: 'proj-123' });

  // Conditional query (skips until selectedId is truthy)
  const { data: details } = trpc.project.get.useQuery(
    { id: selectedId },
    { enabled: !!selectedId },
  );

  // Mutation — triggers on explicit call
  const createMutation = trpc.project.create.useMutation({
    onSuccess: () => refetch(),
    onError: (error) => console.error(error.message),
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <button
        onClick={() => createMutation.mutate({ name: 'New Project' })}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? 'Creating…' : 'Create Project'}
      </button>
      {data?.map((p) => <div key={p.id}>{p.name}</div>)}
    </div>
  );
}
```

## Ownership verification

Pass `orgId` into the service query so cross-organization access is blocked at the database level:

```ts
// In the service (filter by both id and orgId)
async getById(orgId: string, id: string): Promise<Project | null> {
  const [row] = await this.db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.orgId, orgId)))
    .limit(1);
  return row ?? null;
}

// In the router (null means either not found or not in this org)
const project = await this.service.getById(ctx.org.orgId, input.id);
if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
```

This prevents cross-organization data access even if a user guesses a valid ID from another org.
