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
import { getAppContainer } from '@cruzjs/core';
import { router, orgProcedure } from '@cruzjs/core/trpc/context';
import { requirePermission } from '@cruzjs/saas/orgs/auth.utils';
import { ProductService } from './product.service';
import { createProductSchema, updateProductSchema } from './product.validation';

export const productRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    await requirePermission(ctx.org, 'product:read');
    const container = await getAppContainer();
    const service = container.resolve(ProductService);
    return service.list(ctx.org.orgId);
  }),

  get: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await requirePermission(ctx.org, 'product:read');
      const container = await getAppContainer();
      const service = container.resolve(ProductService);
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
      const container = await getAppContainer();
      const service = container.resolve(ProductService);
      return service.create(ctx.org.orgId, ctx.org.userId, input);
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.org, 'product:delete');
      const container = await getAppContainer();
      const service = container.resolve(ProductService);
      await service.delete(input.id, ctx.org.orgId);
      return { success: true };
    }),
});
```

## Router Pattern (User-Scoped)

```typescript
export const notesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const container = await getAppContainer();
    const service = container.resolve(NotesService);
    return service.listByUser(ctx.session.user.id);
  }),

  create: protectedProcedure
    .input(createNoteSchema)
    .mutation(async ({ ctx, input }) => {
      const container = await getAppContainer();
      const service = container.resolve(NotesService);
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

## Client Usage

```typescript
import { trpc } from '~/trpc/client';

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
4. Get services via `getAppContainer().resolve()`, never `new`
5. Define Zod validation schemas for all inputs
6. Register routers in `@Module({ routers: { ... } })`
