---
title: Resource Policies
description: Object-level authorization -- control access to individual records beyond role-based permissions.
---

Resource policies provide per-record authorization. While [RBAC](/security/authorization) answers "Can this user create products?", policies answer "Can this user edit *this specific* product?" by examining the actual record.

## Overview

CruzJS separates two authorization layers:

| Layer | Checks | Runs | Example |
|-------|--------|------|---------|
| **RBAC / Permissions** | Role-based, context only | Before fetching data | "Only ADMINs can delete" |
| **Policies** | Record-level, examines the resource | After fetching data | "Only the author can edit their post" |

Policies are pure functions -- no decorators, no classes. Define them with `definePolicy()` and enforce them with `enforce()` or check with `can()`.

## Defining a Policy

```typescript
import { definePolicy } from '@cruzjs/core';
import type { Post } from '../schema';

export const PostPolicy = definePolicy<Post>({
  view: (ctx, post) => post.published || post.authorId === ctx.user.id,
  update: (ctx, post) => post.authorId === ctx.user.id || ctx.org?.role === 'ADMIN',
  delete: (ctx, post) => post.authorId === ctx.user.id || ctx.org?.role === 'OWNER',
});
```

Each key is an ability name (`view`, `create`, `update`, `delete`, `restore`, or any custom string). The function receives a `PolicyContext` and the resource instance, and returns `boolean` or `Promise<boolean>`.

### PolicyContext Shape

```typescript
interface PolicyContext {
  user: { id: string };
  org?: { orgId: string; role: string } | null;
}
```

Build it from tRPC context with `buildPolicyContext(ctx)`.

## Using enforce() in tRPC

`enforce()` throws a `TRPCError` with code `FORBIDDEN` when the policy denies access:

```typescript
import { enforce, buildPolicyContext } from '@cruzjs/core';
import { PostPolicy } from './post.policy';

export const postRouter = router({
  update: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await postService.findById(input.id);
      if (!post) throw new TRPCError({ code: 'NOT_FOUND' });

      const policyCtx = buildPolicyContext(ctx);
      await enforce(PostPolicy, 'update', policyCtx, post);

      return postService.update(input.id, { title: input.title });
    }),
});
```

If no policy function is defined for a given ability, `enforce()` allows the action (fail-open). Define an explicit deny function if you need to block by default.

## Using can() for Conditional UI

Check authorization without throwing to conditionally show UI elements:

```typescript
import { can, buildPolicyContext } from '@cruzjs/core';

// In a loader:
const policyCtx = buildPolicyContext(ctx);
const posts = await postService.listByOrg(orgId);

const postsWithPermissions = await Promise.all(
  posts.map(async (post) => ({
    ...post,
    canEdit: await can(PostPolicy, 'update', policyCtx, post),
    canDelete: await can(PostPolicy, 'delete', policyCtx, post),
  })),
);
```

Then in the component:

```tsx
{post.canEdit && <EditButton postId={post.id} />}
{post.canDelete && <DeleteButton postId={post.id} />}
```

The inverse function `cannot()` returns `true` when the action is denied.

## CRUD Factory Integration

The `createCrud()` factory accepts a `policies` config to automatically apply object-level checks on get, update, and delete operations:

```typescript
import { createCrud } from '@cruzjs/core';
import { definePolicy } from '@cruzjs/core';

const ProductViewPolicy = definePolicy<Product>({
  view: (ctx, product) =>
    product.published || product.createdById === ctx.user.id,
});

const ProductEditPolicy = definePolicy<Product>({
  update: (ctx, product) =>
    product.createdById === ctx.user.id || ctx.org?.role === 'ADMIN',
});

const ProductDeletePolicy = definePolicy<Product>({
  delete: (ctx, product) =>
    product.createdById === ctx.user.id || ctx.org?.role === 'OWNER',
});

const { Service, Trpc } = createCrud({
  name: 'Products',
  table: products,
  scope: 'org',
  createSchema: createProductSchema,
  updateSchema: updateProductSchema,
  policies: {
    get: ProductViewPolicy,
    update: ProductEditPolicy,
    delete: ProductDeletePolicy,
  },
});
```

The `policies` option maps CRUD actions to `ResourcePolicy` objects. Unlike `permissions` (which run before data is fetched), policies run after the record is loaded, giving access to the actual resource instance.

```typescript
interface CrudPolicies<TTable> {
  get?: ResourcePolicy<TTable['$inferSelect']>;
  update?: ResourcePolicy<TTable['$inferSelect']>;
  delete?: ResourcePolicy<TTable['$inferSelect']>;
}
```

## Standard Abilities

| Ability | Description |
|---------|-------------|
| `view` | Can the user see this record? |
| `create` | Can the user create a record like this? |
| `update` | Can the user modify this record? |
| `delete` | Can the user delete this record? |
| `restore` | Can the user restore a soft-deleted record? |
| Custom strings | Any string works as an ability name |
