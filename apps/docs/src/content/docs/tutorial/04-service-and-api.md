---
title: "Step 3: Service & API"
description: Build the TodosService, tRPC router, and wire them into a module.
---

import { Aside } from '@astrojs/starlight/components';

## Validation Schemas

Create `src/features/todos/todos.validation.ts`:

```typescript
import { z } from 'zod';

export const createTodoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
});

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional(),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
```

Zod schemas serve two purposes: they validate input at the API boundary and they give tRPC full end-to-end type inference — your React components will know the exact shape of every response.

## The Service

Create `src/features/todos/todos.service.ts`:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { eq, and, desc } from 'drizzle-orm';
import { todos } from './todos.schema';
import type { CreateTodoInput, UpdateTodoInput } from './todos.validation';

@Injectable()
export class TodosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  async list(userId: string) {
    return this.db
      .select()
      .from(todos)
      .where(eq(todos.userId, userId))
      .orderBy(desc(todos.createdAt));
  }

  async getById(id: string, userId: string) {
    const [todo] = await this.db
      .select()
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .limit(1);
    return todo ?? null;
  }

  async create(userId: string, input: CreateTodoInput) {
    const [todo] = await this.db
      .insert(todos)
      .values({ userId, title: input.title })
      .returning();
    return todo;
  }

  async update(id: string, userId: string, input: UpdateTodoInput) {
    const [todo] = await this.db
      .update(todos)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .returning();
    return todo ?? null;
  }

  async delete(id: string, userId: string) {
    await this.db
      .delete(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)));
  }
}
```

### Key Patterns

**`@Injectable()`** — marks this class for the Inversify DI container. The container injects `db` automatically when any class that depends on `TodosService` is resolved.

**`@Inject(DRIZZLE)`** — the `DRIZZLE` token resolves to the Cloudflare D1 database connection (or local SQLite in dev). You never instantiate the database directly.

**`userId` on every method** — this is the critical security property. Every query is scoped to the requesting user's ID. There is no middleware enforcing this — it is your responsibility to pass and filter on `userId` in every query. Without this, one user can see another's tasks.

## The tRPC Router

Create `src/features/todos/todos.trpc.ts`:

```typescript
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Inject, Router, Route, TrpcRouter } from '@cruzjs/core';
import { protectedProcedure } from '@cruzjs/core/trpc/context';
import { TodosService } from './todos.service';
import { createTodoSchema, updateTodoSchema } from './todos.validation';

@Router()
export class TodosTrpc extends TrpcRouter {
  @Inject(TodosService) private service!: TodosService;

  // GET all todos for the current user
  @Route() list = protectedProcedure
    .query(async ({ ctx }) =>
      this.service.list(ctx.session.user.id));

  // GET a single todo (with ownership check)
  @Route() get = protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const todo = await this.service.getById(input.id, ctx.session.user.id);
      if (!todo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Todo not found' });
      return todo;
    });

  // POST create a new todo
  @Route() create = protectedProcedure
    .input(createTodoSchema)
    .mutation(async ({ ctx, input }) =>
      this.service.create(ctx.session.user.id, input));

  // PATCH update title or toggle completed
  @Route() update = protectedProcedure
    .input(z.object({ id: z.string(), data: updateTodoSchema }))
    .mutation(async ({ ctx, input }) => {
      const todo = await this.service.update(input.id, ctx.session.user.id, input.data);
      if (!todo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Todo not found' });
      return todo;
    });

  // DELETE a todo
  @Route() delete = protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await this.service.getById(input.id, ctx.session.user.id);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Todo not found' });
      await this.service.delete(input.id, ctx.session.user.id);
      return { success: true };
    });
}
```

### Why `protectedProcedure`?

This is a **user-scoped** resource (todos belong to a user, not an organization). `protectedProcedure` requires an active login session and provides `ctx.session.user.id`. If the user is not logged in, tRPC returns a `401 UNAUTHORIZED` automatically.

If your data were org-scoped instead (shared across a team), you would use `orgProcedure` which provides `ctx.org.orgId`.

## The Module

Create `src/features/todos/todos.module.ts`:

```typescript
import { Module } from '@cruzjs/core/di';
import { TodosService } from './todos.service';
import { TodosTrpc } from './todos.trpc';
import { todosRoutes } from './todos.routes';

@Module({
  providers: [TodosService, TodosTrpc],
  trpcRouters: {
    todos: TodosTrpc,  // mounts at trpc.todos.*
  },
  pageRoutes: todosRoutes,
})
export class TodosModule {}
```

## The Routes Config

Create `src/features/todos/todos.routes.ts`:

```typescript
import type { RouteFactory } from '@cruzjs/core/routing';

export const todosRoutes: RouteFactory = (helpers) => [
  ...helpers.prefix('todos', [
    helpers.index('features/todos/routes/todos._index.tsx'),
  ]),
];
```

## Barrel Export

Create `src/features/todos/index.ts`:

```typescript
export { TodosModule } from './todos.module';
export { todos } from './todos.schema';
export type { Todo } from './todos.schema';
```

## Update the AppRouter Type

The `src/trpc/router.ts` file defines the full `AppRouter` type that gives you end-to-end TypeScript inference. Add `todos` to it:

```typescript
import { router } from '@cruzjs/core/trpc/context';
import { registerCruzCoreTrpcRouters } from '@cruzjs/core/trpc/routers';
import { registerCruzStartTrpcRouters } from '@cruzjs/start/trpc/routers';
import type { RouterProcedures } from '@cruzjs/core';
import { TodosTrpc } from '@/features/todos/todos.trpc';

const appRouter = router({
  ...registerCruzCoreTrpcRouters(),
  ...registerCruzStartTrpcRouters(),
  todos: router({} as RouterProcedures<TodosTrpc>),  // add this
});

export type AppRouter = typeof appRouter;
```

The `RouterProcedures<TodosTrpc>` utility type extracts the procedure types from your class-based router so React components get full type inference on `trpc.todos.*`.

## Update Routes

Add `featureRoutes` to `src/routes.ts` so React Router knows about the `/todos` URL:

```typescript
import { type RouteConfig, route, index, layout, prefix } from '@react-router/dev/routes';
import { createCruzRoutes } from '@cruzjs/core/routing';
import { registerCruzStartRoutes } from '@cruzjs/start/routing';
import { todosRoutes } from './features/todos/todos.routes';  // add this

export default createCruzRoutes({
  route, index, layout, prefix,
  dir: import.meta.dirname,
  framework: {
    registrars: [registerCruzStartRoutes],
  },
  featureRoutes: [todosRoutes],  // add this
  routes: [
    index('routes/index.tsx'),
  ],
}) satisfies RouteConfig;
```

## Register the Module

Add `TodosModule` to `src/server.cloudflare.ts`:

```typescript
import { TodosModule } from './features/todos';  // add this

export default createCruzApp({
  schema,
  modules: [
    StartModule,
    TodosModule,  // add this
  ],
  pages: () => import('virtual:react-router/server-build'),
});
```

<Aside type="tip">
If you used `cruz new feature todos --scope user --wire`, the import and module registration were added automatically.
</Aside>

## Test the API

With the dev server running, the tRPC procedures are available at `/api/trpc/<procedure>`. To test them manually, first get a token by registering via the UI, then:

```bash
# List todos (returns empty array before creating any)
curl -H "Authorization: Bearer <your-token>" http://localhost:5000/api/trpc/todos.list

# Create a todo
curl -X POST -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk"}' \
  http://localhost:5000/api/trpc/todos.create
```

The tRPC endpoints follow the pattern `/api/trpc/<namespace>.<procedure>`:

| tRPC hook | Endpoint |
|-----------|----------|
| `trpc.todos.list` | `GET /api/trpc/todos.list` |
| `trpc.todos.get` | `GET /api/trpc/todos.get` |
| `trpc.todos.create` | `POST /api/trpc/todos.create` |
| `trpc.todos.update` | `POST /api/trpc/todos.update` |
| `trpc.todos.delete` | `POST /api/trpc/todos.delete` |

---

Next: [Build the React UI →](/tutorial/05-ui)
