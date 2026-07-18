# tRPC Routers

CruzJS uses tRPC for type-safe API endpoints.

## Procedure Types

```typescript
import { router, publicProcedure, protectedProcedure, orgProcedure } from '@cruzjs/core';
```

| Procedure | Auth | Org Context | Use Case |
|-----------|------|-------------|----------|
| `publicProcedure` | No | No | Public endpoints (health, login, invitations) |
| `protectedProcedure` | Yes | No | User endpoints (profile, list orgs) |
| `orgProcedure` | Yes | Yes | Org endpoints (members, resources) |

## Context Shape

```typescript
// publicProcedure context
ctx.request                    // Request object

// protectedProcedure context (includes above)
ctx.session.user.id            // Current user ID
ctx.session.user.email         // Current user email

// orgProcedure context (includes above)
ctx.org.orgId                  // Current organization ID
ctx.org.userId                 // Current user ID
ctx.org.role                   // User's role: OWNER | ADMIN | MEMBER | VIEWER
```

## OOP Router Pattern (preferred)

Use `@Router()`, `@Route()`, and `TrpcRouter` for class-based routers with DI property injection.
This is the **preferred approach** — services are injected once per container, not on every call.

```typescript
// features/my-feature/my-feature.trpc.ts
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Inject, Router, Route, TrpcRouter } from '@cruzjs/core';
import { publicProcedure, protectedProcedure, orgProcedure } from '@cruzjs/core/trpc/context';
import { MyFeatureService } from './my-feature.service';
import { createItemSchema, updateItemSchema } from './my-feature.validation';

@Router()
export class MyFeatureTrpc extends TrpcRouter {
  @Inject(MyFeatureService) private service!: MyFeatureService;

  @Route() list = orgProcedure.query(async ({ ctx }) =>
    this.service.list(ctx.org.orgId));

  @Route() get = orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await this.service.getById(input.id);
      if (!item || item.orgId !== ctx.org.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' });
      }
      return item;
    });

  @Route() create = orgProcedure
    .input(createItemSchema)
    .mutation(async ({ ctx, input }) =>
      this.service.create(ctx.org.orgId, ctx.org.userId, input));

  @Route() update = orgProcedure
    .input(z.object({ id: z.string(), data: updateItemSchema }))
    .mutation(async ({ ctx, input }) => {
      const item = await this.service.getById(input.id);
      if (!item || item.orgId !== ctx.org.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' });
      }
      return this.service.update(input.id, input.data);
    });

  @Route() delete = orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await this.service.getById(input.id);
      if (!item || item.orgId !== ctx.org.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' });
      }
      await this.service.delete(input.id);
      return { success: true };
    });
}
```

**Register in module (pass class reference, not instance):**

```typescript
// features/my-feature/my-feature.module.ts
@Module({
  providers: [MyFeatureService, MyFeatureTrpc],
  trpcRouters: { myFeature: MyFeatureTrpc },  // class reference
})
export class MyFeatureModule {}
```

**Type-safe AppRouter composition:**

```typescript
// src/trpc/router.ts
import type { RouterProcedures } from '@cruzjs/core';
import type { MyFeatureTrpc } from '../features/my-feature/my-feature.trpc';

const appRouter = router({
  ...registerCruzCoreTrpcRouters(),
  myFeature: router({} as RouterProcedures<MyFeatureTrpc>),
});
export type AppRouter = typeof appRouter;
```

## Functional Router Pattern (still supported)

For simpler cases or backward compatibility, functional routers still work:

```typescript
// features/my-feature/my-feature.trpc.ts
export const myFeatureTrpc = router({
  list: orgProcedure.query(async ({ ctx }) => {
    const service = ctx.container.get(MyFeatureService);
    return service.list(ctx.org.orgId);
  }),
});
```

```typescript
// Register in module (pass instance directly)
@Module({
  providers: [MyFeatureService],
  trpcRouters: { myFeature: myFeatureTrpc },  // router instance
})
export class MyFeatureModule {}
```

## Registering Routers

Register routers in `@Module({ trpcRouters: { ... } })` and register modules via `registerModules([...])` in `src/app.server.ts`.

## User-Scoped Router

```typescript
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

## Validation Schemas

```typescript
// features/my-feature/my-feature.validation.ts
import { z } from 'zod';

export const createItemSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  tags: z.array(z.string().max(50)).max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateItemSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
```

## Error Handling

```typescript
import { TRPCError } from '@trpc/server';

// Not found
throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' });

// Not authenticated
throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });

// Not authorized
throw new TRPCError({ code: 'FORBIDDEN', message: 'Permission denied' });

// Invalid input
throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid input' });

// Conflict (e.g., duplicate)
throw new TRPCError({ code: 'CONFLICT', message: 'Item already exists' });

// Server error
throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' });
```

## Client Usage

```typescript
// In React components
import { trpc } from '@cruzjs/web/trpc/client';

function MyComponent() {
  // Query
  const { data, isLoading, error, refetch } = trpc.myFeature.list.useQuery();

  // Query with input
  const { data: item } = trpc.myFeature.get.useQuery({ id: 'item-123' });

  // Mutation
  const createMutation = trpc.myFeature.create.useMutation({
    onSuccess: () => {
      refetch();
      toast({ title: 'Created!', status: 'success' });
    },
    onError: (error) => {
      toast({ title: error.message, status: 'error' });
    },
  });

  const handleCreate = () => {
    createMutation.mutate({ name: 'New Item' });
  };

  // Loading state
  if (isLoading) return <LoadingState />;

  // Error state
  if (error) return <Alert status="error">{error.message}</Alert>;

  return <ItemList items={data} />;
}
```

## Permissions Reference

| Permission | Roles | Purpose |
|------------|-------|---------|
| `org:read` | All | View org details |
| `org:write` | OWNER, ADMIN | Update org settings |
| `org:delete` | OWNER | Delete organization |
| `member:read` | All | View members |
| `member:write` | OWNER, ADMIN | Add/update members |
| `member:delete` | OWNER, ADMIN | Remove members |
| `billing:read` | OWNER, ADMIN | View billing info |
| `billing:write` | OWNER | Update billing |
| `<resource>:read` | Custom | Read custom resource |
| `<resource>:write` | Custom | Write custom resource |
| `<resource>:delete` | Custom | Delete custom resource |

## Rules

1. **Use `@Router()` class pattern** for all new routers (preferred over functional)
2. **Use `@Inject(Service)` properties** to inject services at the class level
3. **Use `@Route()` on each procedure** — only decorated properties are included
4. **Pass class reference** (not instance) to `@Module({ trpcRouters: { name: MyTrpc } })`
5. **Use `RouterProcedures<T>`** in router.ts for type-safe AppRouter composition
6. **Use orgProcedure** for org-scoped data (most endpoints)
7. **Use protectedProcedure** for user-scoped data only
8. **Use publicProcedure** only when auth is not needed
9. **Define validation schemas** for all inputs in a separate `.validation.ts` file
10. **Both OOP and functional patterns are supported** — functional routers can be passed as router instances to `@Module({ trpcRouters: { name: routerInstance } })`
