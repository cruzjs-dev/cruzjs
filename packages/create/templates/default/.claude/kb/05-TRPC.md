# tRPC Routers

## Procedure Types

```typescript
import { router, publicProcedure, protectedProcedure, orgProcedure } from '@cruzjs/core/trpc/context';
```

| Procedure | Auth | Org Context | Use Case |
|-----------|------|-------------|----------|
| `publicProcedure` | No | No | Health checks, login, public data |
| `protectedProcedure` | Yes | No | User-specific data (profile, prefs) |
| `orgProcedure` | Yes | Yes | Org-scoped data (products, members) |

## Context Shape

```typescript
// protectedProcedure
ctx.session.user.id        // Current user ID
ctx.session.user.email     // Current user email

// orgProcedure (includes above)
ctx.org.orgId              // Current organization ID
ctx.org.userId             // Current user ID
ctx.org.role               // OWNER | ADMIN | MEMBER | VIEWER
```

## Router Pattern (Org-Scoped)

```typescript
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, orgProcedure } from '@cruzjs/core/trpc/context';
import { requirePermission } from '@cruzjs/saas/orgs/auth.utils';
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
      const item = await service.getById(input.id);
      if (!item || item.orgId !== ctx.org.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
      }
      return item;
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

## Router Pattern (User-Scoped)

```typescript
export const notesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const service = ctx.container.get(NotesService);
    return service.listByUser(ctx.session.user.id);
  }),

  create: protectedProcedure
    .input(createNoteSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get(NotesService);
      return service.create(ctx.session.user.id, input);
    }),
});
```

## Error Codes

| Code | When |
|------|------|
| `NOT_FOUND` | Resource doesn't exist or doesn't belong to user/org |
| `UNAUTHORIZED` | No valid session |
| `FORBIDDEN` | Authenticated but lacks permission |
| `BAD_REQUEST` | Invalid input (Zod usually handles this) |
| `CONFLICT` | Duplicate resource |
| `INTERNAL_SERVER_ERROR` | Unexpected failure |

## Permission Checks

```typescript
import { requirePermission } from '@cruzjs/saas/orgs/auth.utils';

// Format: <resource>:<action>
await requirePermission(ctx.org, 'product:read');
await requirePermission(ctx.org, 'product:write');
await requirePermission(ctx.org, 'product:delete');
```

## HTTP Endpoint

The tRPC HTTP endpoint is wired up once in `src/routes/api/trpc.$.ts` — you don't touch it per feature:

```typescript
import 'reflect-metadata';
import { createTRPCLoaderHandler, createTRPCActionHandler } from '@cruzjs/core/trpc/trpc.route';

export const loader = createTRPCLoaderHandler();
export const action = createTRPCActionHandler();
```

The framework handles Cloudflare env→`process.env` bridging and `waitUntil` automatically.

## Background Work in a Procedure

For fire-and-forget work (notifications, external APIs) that should outlive the response, use `runInBackground` — the promise survives after the response returns:

```typescript
import { runInBackground } from '@cruzjs/core/background';

create: protectedProcedure.mutation(async ({ ctx, input }) => {
  const service = ctx.container.get(NotesService);
  const note = await service.create(ctx.session.user.id, input);
  runInBackground(service.notify(note.id)); // not awaited; runs after response
  return note;
});
```

## Client Usage

```typescript
import { trpc } from '@/trpc/client';
import { useToast } from '@cruzjs/ui';

const toast = useToast();

// Query
const { data, isLoading, refetch } = trpc.notes.list.useQuery();

// Query with input
const { data } = trpc.notes.get.useQuery({ id: noteId });

// Conditional query
const { data } = trpc.notes.get.useQuery({ id }, { enabled: !!id });

// Mutation
const create = trpc.notes.create.useMutation({
  onSuccess: () => { refetch(); },
  onError: (error) => { toast({ title: error.message, status: 'error' }); },
});
create.mutate({ title: 'New Note' });
```

## Rules

1. Use `orgProcedure` for org-scoped data, `protectedProcedure` for user-specific
2. Always call `requirePermission()` for org mutations
3. Always verify ownership before update/delete
4. Get services via `ctx.container.get(Service)` inside procedures, never `new`
5. Define Zod validation schemas for all inputs
6. Register routers in `@Module({ trpcRouters: { ... } })`
