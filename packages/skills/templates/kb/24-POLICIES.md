# Object-Level Policies

Per-record authorization that goes beyond RBAC. Policies check whether a specific user can perform a specific action on a specific resource instance.

Located at `packages/core/src/policies/policy.ts`.

## vs RBAC

- **RBAC (permissions)**: "Can this user create products?" -- checked before fetching data
- **Policies**: "Can this user edit *this specific* product?" -- checked after fetching the record

## definePolicy()

```typescript
import { definePolicy } from '@cruzjs/core';

const PostPolicy = definePolicy<Post>({
  view: (ctx, post) => post.published || post.authorId === ctx.user.id,
  update: (ctx, post) => post.authorId === ctx.user.id || ctx.org?.role === 'ADMIN',
  delete: (ctx, post) => post.authorId === ctx.user.id || ctx.org?.role === 'OWNER',
});
```

Policy functions receive `(ctx: PolicyContext, resource: TResource)` and return `boolean | Promise<boolean>`.

## PolicyContext

```typescript
interface PolicyContext {
  user: { id: string };
  org?: { orgId: string; role: string } | null;
}
```

## PolicyAbility

Standard abilities: `'view'` | `'create'` | `'update'` | `'delete'` | `'restore'` | any custom string.

## enforce()

Throws `TRPCError` with `FORBIDDEN` if denied. If no policy function is defined for the ability, access is **allowed** (fail-open).

```typescript
import { enforce, buildPolicyContext } from '@cruzjs/core';

// In a tRPC procedure:
const post = await postService.findById(input.id);
const policyCtx = buildPolicyContext(ctx);
await enforce(PostPolicy, 'update', policyCtx, post);
// Throws TRPCError { code: 'FORBIDDEN', message: 'Not authorized to update this resource' }
```

## can() / cannot()

Check without throwing:

```typescript
import { can, cannot } from '@cruzjs/core';

const allowed = await can(PostPolicy, 'update', policyCtx, post);    // true/false
const denied = await cannot(PostPolicy, 'delete', policyCtx, post);  // true/false
```

## buildPolicyContext()

Extracts `PolicyContext` from the tRPC context (works with both `protectedProcedure` and `orgProcedure`):

```typescript
const policyCtx = buildPolicyContext(ctx);
// Reads ctx.session.user.id, ctx.org?.orgId, ctx.org?.role
```

Throws `TRPCError` with `UNAUTHORIZED` if no authenticated user.

## CRUD Factory Integration

In the `createCrud()` config, use the `policies` option to apply object-level checks automatically:

```typescript
import { createCrud } from '@cruzjs/core';
import { definePolicy } from '@cruzjs/core';

const ProductViewPolicy = definePolicy<Product>({
  view: (ctx, product) => product.published || product.createdById === ctx.user.id,
});

const ProductUpdatePolicy = definePolicy<Product>({
  update: (ctx, product) => product.createdById === ctx.user.id || ctx.org?.role === 'ADMIN',
});

const ProductDeletePolicy = definePolicy<Product>({
  delete: (ctx, product) => product.createdById === ctx.user.id || ctx.org?.role === 'OWNER',
});

const { Service, Trpc } = createCrud({
  name: 'Products',
  table: products,
  scope: 'org',
  createSchema: createProductSchema,
  updateSchema: updateProductSchema,
  policies: {
    get: ProductViewPolicy,
    update: ProductUpdatePolicy,
    delete: ProductDeletePolicy,
  },
});
```

### CrudPolicies type

```typescript
interface CrudPolicies<TTable> {
  get?: ResourcePolicy<TTable['$inferSelect']>;
  update?: ResourcePolicy<TTable['$inferSelect']>;
  delete?: ResourcePolicy<TTable['$inferSelect']>;
}
```

Policies run **after** the record is fetched, unlike `permissions` which run **before**.
