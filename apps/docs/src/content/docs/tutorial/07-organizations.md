---
title: "Step 6: Organizations (Team Todos)"
description: Convert user-scoped todos into org-scoped team todos that all organization members can see and manage.
---

import { Steps, Aside } from '@astrojs/starlight/components';

So far, your todos belong to individual users. Each person has their own private list. That works for a personal app, but most real products need collaboration — teams sharing the same data within an organization.

In this step, you will convert the todos feature from **user-scoped** to **org-scoped**. Every member of an organization will see the same todo list, and permissions will control who can create, edit, and delete items.

## User-Scoped vs Org-Scoped

Before changing any code, understand the two data ownership models in CruzJS:

| | User-Scoped | Org-Scoped |
|---|---|---|
| **Ownership** | One user owns the data | An organization owns the data |
| **Visibility** | Only the owner can see it | All org members can see it |
| **Procedure** | `protectedProcedure` | `orgProcedure` |
| **Context** | `ctx.session.user.id` | `ctx.org.orgId` |
| **URL pattern** | `/todos` | `/orgs/:slug/todos` |
| **Use case** | Personal notes, preferences | Team tasks, shared projects |

For team todos, org-scoped is the right choice: everyone on the team should see the same list, and you want role-based control over who can add or delete items.

## Step 1: Update the Schema

Open `src/features/todos/todos.schema.ts` and replace the `userId` column with `orgId` and `createdById`:

```typescript
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

export const todos = sqliteTable('Todo', {
  id: text('id').primaryKey().$defaultFn(() => createId()),

  // Organization that owns this todo (org-scoped)
  orgId: text('orgId').notNull(),

  // User who created it (for attribution, not ownership)
  createdById: text('createdById').notNull(),

  title: text('title').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),

  createdAt: integer('createdAt', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
}, (table) => ({
  // Index on orgId — every query filters by this column
  orgIdIdx: index('Todo_orgId_idx').on(table.orgId),
}));

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
```

### What Changed

- **`userId`** is gone. The todo no longer belongs to a single user.
- **`orgId`** is the new ownership column. All queries will filter on this.
- **`createdById`** tracks who created the todo (for display and delete-own-only logic), but it does not determine visibility.
- The **index** now covers `orgId` instead of `userId`.

<Aside type="caution">
This is a schema change. If you have existing data in your local database, the migration will need to handle the column rename. For a tutorial app, the simplest approach is to run `cruz db hard-reset` to start fresh. In a production app, you would write a data migration to populate the new columns.
</Aside>

## Step 2: Generate and Apply the Migration

```bash
# Generate the migration SQL
cruz db generate

# Apply it to your local database
cruz db migrate
```

If you have existing todo data that you want to discard:

```bash
# Nuclear option — drops all local data and re-migrates
cruz db hard-reset
```

Verify the schema change:

```bash
cruz db query "PRAGMA table_info('Todo')"
```

You should see `orgId` and `createdById` columns instead of `userId`.

## Step 3: Update the Validation Schemas

Open `src/features/todos/todos.validation.ts`. The schemas stay the same since `orgId` and `createdById` come from the server context, not from user input:

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

<Aside type="tip">
The `orgId` is never accepted from user input. It always comes from the authenticated org context on the server. This prevents users from submitting todos to organizations they do not belong to.
</Aside>

## Step 4: Update the Service

Open `src/features/todos/todos.service.ts` and change every method to accept `orgId` instead of `userId`:

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

  async list(orgId: string) {
    return this.db
      .select()
      .from(todos)
      .where(eq(todos.orgId, orgId))
      .orderBy(desc(todos.createdAt));
  }

  async getById(id: string, orgId: string) {
    const [todo] = await this.db
      .select()
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.orgId, orgId)))
      .limit(1);
    return todo ?? null;
  }

  async create(orgId: string, createdById: string, input: CreateTodoInput) {
    const [todo] = await this.db
      .insert(todos)
      .values({ orgId, createdById, title: input.title })
      .returning();
    return todo;
  }

  async update(id: string, orgId: string, input: UpdateTodoInput) {
    const [todo] = await this.db
      .update(todos)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(todos.id, id), eq(todos.orgId, orgId)))
      .returning();
    return todo ?? null;
  }

  async delete(id: string, orgId: string) {
    await this.db
      .delete(todos)
      .where(and(eq(todos.id, id), eq(todos.orgId, orgId)));
  }
}
```

### Key Differences

- **`list(orgId)`** — returns all todos for the organization, not a single user. Every org member sees the same list.
- **`create(orgId, createdById, input)`** — takes both the org ID and the creating user's ID. The org owns the todo; the user is recorded for attribution.
- **`update` and `delete`** — scoped to `orgId`, so any member with the right permissions can modify any todo in the org.

## Step 5: Update the tRPC Router

This is the most important change. Replace `protectedProcedure` with `orgProcedure` and add permission checks.

Open `src/features/todos/todos.trpc.ts`:

```typescript
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Inject, Router, Route, TrpcRouter } from '@cruzjs/core';
import { orgProcedure } from '@cruzjs/core/trpc/context';
import { requirePermission } from '@cruzjs/core/auth/permissions';
import { TodosService } from './todos.service';
import { createTodoSchema, updateTodoSchema } from './todos.validation';

@Router()
export class TodosTrpc extends TrpcRouter {
  @Inject(TodosService) private service!: TodosService;

  // GET all todos for the current org
  @Route() list = orgProcedure
    .query(async ({ ctx }) => {
      await requirePermission(ctx.org, 'todos:read');
      return this.service.list(ctx.org.orgId);
    });

  // GET a single todo
  @Route() get = orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await requirePermission(ctx.org, 'todos:read');
      const todo = await this.service.getById(input.id, ctx.org.orgId);
      if (!todo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Todo not found' });
      return todo;
    });

  // POST create a new todo
  @Route() create = orgProcedure
    .input(createTodoSchema)
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.org, 'todos:write');
      return this.service.create(ctx.org.orgId, ctx.org.userId, input);
    });

  // PATCH update a todo
  @Route() update = orgProcedure
    .input(z.object({ id: z.string(), data: updateTodoSchema }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.org, 'todos:write');
      const todo = await this.service.update(input.id, ctx.org.orgId, input.data);
      if (!todo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Todo not found' });
      return todo;
    });

  // DELETE a todo (creator can delete their own; admins can delete any)
  @Route() delete = orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const todo = await this.service.getById(input.id, ctx.org.orgId);
      if (!todo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Todo not found' });

      // Creator can always delete their own todo
      if (todo.createdById === ctx.org.userId) {
        await this.service.delete(input.id, ctx.org.orgId);
        return { success: true };
      }

      // Otherwise, require admin-level permission
      await requirePermission(ctx.org, 'todos:delete');
      await this.service.delete(input.id, ctx.org.orgId);
      return { success: true };
    });
}
```

### What `orgProcedure` Provides

When a request comes through `orgProcedure`, CruzJS:

1. Verifies the user is authenticated (same as `protectedProcedure`).
2. Reads the `X-Organization-ID` header (set automatically by the client-side `OrgContext`).
3. Verifies the user is a member of that organization.
4. Populates `ctx.org` with:

| Property | Type | Description |
|----------|------|-------------|
| `ctx.org.orgId` | `string` | The current organization's ID |
| `ctx.org.userId` | `string` | The authenticated user's ID |
| `ctx.org.role` | `string` | The user's role in this org (OWNER, ADMIN, MEMBER, VIEWER) |
| `ctx.org.slug` | `string` | The org's URL-friendly slug |

If the user is not a member of the specified organization, tRPC returns `403 FORBIDDEN` before your procedure code runs.

### Permission Checks with `requirePermission`

`requirePermission(ctx.org, 'todos:read')` checks whether the user's role in the current organization grants the specified permission. If not, it throws a `403 FORBIDDEN` error.

The default permission mapping is:

| Role | `todos:read` | `todos:write` | `todos:delete` |
|------|:---:|:---:|:---:|
| OWNER | Yes | Yes | Yes |
| ADMIN | Yes | Yes | Yes |
| MEMBER | Yes | Yes | No |
| VIEWER | Yes | No | No |

<Aside type="tip">
You can customize these defaults using `PermissionManager` in your module configuration. See the [Permissions documentation](/pro/permissions) for details.
</Aside>

## Step 6: Register Custom Permissions

To define what `todos:read`, `todos:write`, and `todos:delete` mean, add permission definitions to your module.

Create or update `src/features/todos/todos.permissions.ts`:

```typescript
import type { PermissionDefinition } from '@cruzjs/core/auth/permissions';

export const todosPermissions: PermissionDefinition[] = [
  {
    key: 'todos:read',
    name: 'View Todos',
    description: 'Can see the todo list',
    defaultRoles: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'],
  },
  {
    key: 'todos:write',
    name: 'Create & Edit Todos',
    description: 'Can create and update todos',
    defaultRoles: ['OWNER', 'ADMIN', 'MEMBER'],
  },
  {
    key: 'todos:delete',
    name: 'Delete Any Todo',
    description: 'Can delete todos created by others',
    defaultRoles: ['OWNER', 'ADMIN'],
  },
];
```

Then register them in your module. Update `src/features/todos/todos.module.ts`:

```typescript
import { Module } from '@cruzjs/core/di';
import { TodosService } from './todos.service';
import { TodosTrpc } from './todos.trpc';
import { todosRoutes } from './todos.routes';
import { todosPermissions } from './todos.permissions';

@Module({
  providers: [TodosService, TodosTrpc],
  trpcRouters: {
    todos: TodosTrpc,
  },
  pageRoutes: todosRoutes,
  permissions: todosPermissions,
})
export class TodosModule {}
```

## Step 7: Update the Routes Config

Org-scoped features live under `/orgs/:slug/` in the URL. Update `src/features/todos/todos.routes.ts`:

```typescript
import type { RouteFactory } from '@cruzjs/core/routing';

export const todosRoutes: RouteFactory = (helpers) => [
  ...helpers.prefix('orgs/:slug/todos', [
    helpers.index('features/todos/routes/todos._index.tsx'),
  ]),
];
```

The `:slug` parameter is the organization's URL-friendly identifier (e.g., `acme-corp`). CruzJS resolves this to the correct `orgId` automatically through the `OrgContext` provider.

## Step 8: Update the AppRouter Type

Open `src/trpc/router.ts` and make sure the `todos` router type still matches:

```typescript
import { router } from '@cruzjs/core/trpc/context';
import { registerCruzCoreTrpcRouters } from '@cruzjs/core/trpc/routers';
import { registerCruzStartTrpcRouters } from '@cruzjs/start/trpc/routers';
import type { RouterProcedures } from '@cruzjs/core';
import { TodosTrpc } from '@/features/todos/todos.trpc';

const appRouter = router({
  ...registerCruzCoreTrpcRouters(),
  ...registerCruzStartTrpcRouters(),
  todos: router({} as RouterProcedures<TodosTrpc>),
});

export type AppRouter = typeof appRouter;
```

No changes needed here. The `AppRouter` type picks up the new procedure signatures automatically since `TodosTrpc` now uses `orgProcedure` internally. The client hooks still work the same way.

## Step 9: Update the UI

The page component needs minor updates to work with the org context.

Update `src/features/todos/routes/todos._index.tsx`:

```tsx
import { useState } from 'react';
import { trpc } from '@/trpc/client';
import { useOrg } from '@cruzjs/start/hooks';
import type { Todo } from '../todos.schema';

export default function TeamTodosPage() {
  const org = useOrg();
  const utils = trpc.useUtils();
  const [newTitle, setNewTitle] = useState('');

  // Fetch todos for the current org
  const { data: todos, isLoading, error } = trpc.todos.list.useQuery();

  // Mutations
  const createTodo = trpc.todos.create.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate();
      setNewTitle('');
    },
  });

  const updateTodo = trpc.todos.update.useMutation({
    onSuccess: () => utils.todos.list.invalidate(),
  });

  const deleteTodo = trpc.todos.delete.useMutation({
    onSuccess: () => utils.todos.list.invalidate(),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createTodo.mutate({ title: newTitle.trim() });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <p className="font-medium">Error loading todos</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Team Todos</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Shared with all members of {org.name}
      </p>

      {/* Add todo form */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="flex-1 px-3 py-2 border border-input rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={createTodo.isPending}
        />
        <button
          type="submit"
          disabled={!newTitle.trim() || createTodo.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm
                     font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createTodo.isPending ? 'Adding...' : 'Add'}
        </button>
      </form>

      {/* Todo list */}
      {!todos?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No team todos yet.</p>
          <p className="text-sm mt-1">Add one above to get the team started.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={(id, completed) =>
                updateTodo.mutate({ id, data: { completed } })
              }
              onDelete={(id) => deleteTodo.mutate({ id })}
              isUpdating={updateTodo.isPending}
              isDeleting={deleteTodo.isPending && deleteTodo.variables?.id === todo.id}
            />
          ))}
        </ul>
      )}

      {/* Stats */}
      {todos && todos.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground text-right">
          {todos.filter((t) => t.completed).length} / {todos.length} completed
        </p>
      )}
    </div>
  );
}

// ── TodoItem ──────────────────────────────────────────────────────────────────

type TodoItemProps = {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  isUpdating: boolean;
  isDeleting: boolean;
};

function TodoItem({ todo, onToggle, onDelete, isUpdating, isDeleting }: TodoItemProps) {
  return (
    <li className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg
                   hover:bg-accent/5 transition-colors group">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={(e) => onToggle(todo.id, e.target.checked)}
        disabled={isUpdating}
        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
      />

      <div className="flex-1 min-w-0">
        <span
          className={`text-sm ${
            todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'
          }`}
        >
          {todo.title}
        </span>
      </div>

      <button
        onClick={() => onDelete(todo.id)}
        disabled={isDeleting}
        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground
                   hover:text-destructive transition-all disabled:opacity-50"
        aria-label="Delete todo"
      >
        {isDeleting ? (
          <span className="text-xs">...</span>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
      </button>
    </li>
  );
}
```

### What Changed in the UI

The component is almost identical to the user-scoped version. The key differences:

1. **`useOrg()`** — the `useOrg` hook provides the current organization's name, slug, and ID for display purposes.
2. **No `userId` in mutations** — the tRPC hooks do not pass `userId` or `orgId`. The org context is sent automatically via the `X-Organization-ID` header, which the `OrgContext` provider sets on every request.
3. **"Team Todos" heading** — shows the org name so users know they are viewing shared data.

<Aside type="tip">
You do not need to manually set the `X-Organization-ID` header. The `OrgContext` provider (included in `@cruzjs/start`) reads the current org from the URL's `:slug` parameter and attaches the header to every tRPC request automatically.
</Aside>

## Step 10: Update Navigation

Add a link to the team todos page in your org sidebar or navigation:

```tsx
import { Link, useParams } from 'react-router';

// Inside your org layout navigation:
const { slug } = useParams();

<Link to={`/orgs/${slug}/todos`} className="text-sm font-medium hover:underline">
  Team Todos
</Link>
```

## Try It Out

<Steps>

1. Make sure the dev server is running: `cruz dev`

2. Sign in and create (or select) an organization.

3. Navigate to `/orgs/<your-org-slug>/todos`.

4. Add a todo. It appears in the list.

5. Open a second browser (or incognito window), sign in as a different user who is a member of the same organization.

6. Both users should see the same todo list. Changes made by one user appear for the other after a page refresh (or immediately if you add real-time features later).

</Steps>

## Understanding the Data Flow

Here is what happens when a team member creates a todo:

1. The React component calls `createTodo.mutate({ title: 'Ship feature' })`.
2. The tRPC client sends a POST request with the `X-Organization-ID` header attached automatically.
3. `orgProcedure` middleware validates the session, resolves the org, and verifies membership.
4. `requirePermission(ctx.org, 'todos:write')` checks that the user's role allows creating todos.
5. The service inserts a row with `orgId` from the context and `createdById` from the authenticated user.
6. The response flows back to the client, React Query invalidates the list, and the new todo appears.

If a VIEWER tries to create a todo, step 4 throws a `403 FORBIDDEN` and the insert never happens.

## Keeping User-Scoped Todos Too

If you want to keep personal todos alongside team todos, you can have both. Create a separate `PersonalTodosModule` with `protectedProcedure` that uses the original `userId`-based schema, and mount it at `/todos`. The org-scoped version lives at `/orgs/:slug/todos`. Two separate features, two separate URL paths, no conflict.

---

Next: [Background Jobs →](/tutorial/08-background-jobs)
