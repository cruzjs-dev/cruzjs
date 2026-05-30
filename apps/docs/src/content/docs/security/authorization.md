---
title: Authorization
description: Role-based access control with hierarchical permissions for organization-scoped resources in CruzJS.
---

:::note
Organization-scoped role-based access control is provided by `@cruzjs/start`. The `PermissionService` lives in `@cruzjs/start/orgs/`, auth utilities (`requirePermission`, `getUserRole`, etc.) are in `@cruzjs/start/orgs/auth.utils`, and org types/models are in `@cruzjs/core/orgs/org.models`. Basic authentication (login, registration, sessions, JWT) is part of `@cruzjs/core`.
:::

CruzJS uses role-based access control (RBAC) scoped to organizations. Every org member has a role, and each role maps to a set of permissions. The `PermissionService` and `requirePermission` middleware enforce access checks in tRPC routers and React Router loaders/actions.

## Roles

Four built-in roles form a hierarchy:

| Role | Level | Description |
|------|-------|-------------|
| `OWNER` | Highest | Full control. All permissions (`*`). Cannot be removed unless ownership is transferred. |
| `ADMIN` | High | Manages org settings, members, billing, and all resources. Cannot delete the org. |
| `MEMBER` | Standard | Read access to org, read/write access to resources (e.g., pipelines). |
| `VIEWER` | Lowest | Read-only access to org and resources. |

Roles are stored as the `role` column on the `orgMembers` table. The org creator is automatically assigned `OWNER`.

## Permission format

Permissions follow a `resource:action` pattern:

```
org:read        -- View organization details
org:write       -- Update organization settings
org:delete      -- Delete the organization
member:read     -- View org members
member:write    -- Invite/add members, change roles
member:delete   -- Remove members
billing:read    -- View billing/subscription info
billing:write   -- Manage billing/subscription
pipeline:read   -- View pipelines
pipeline:write  -- Create/update pipelines
pipeline:delete -- Delete pipelines
```

## Role-permission mapping

The mapping is defined in `@cruzjs/core` and can be imported for client-side checks:

```typescript
import type { Permission, OrgRole } from '@cruzjs/core/orgs/org.models';
import { rolePermissions } from '@cruzjs/core/orgs/org.models';

export const rolePermissions: Record<OrgRole, Permission[] | '*'> = {
  OWNER: '*', // All permissions
  ADMIN: [
    'org:read', 'org:write',
    'member:read', 'member:write', 'member:delete',
    'billing:read', 'billing:write',
    'pipeline:read', 'pipeline:write', 'pipeline:delete',
  ],
  MEMBER: [
    'org:read',
    'member:read',
    'pipeline:read', 'pipeline:write',
  ],
  VIEWER: [
    'org:read',
    'pipeline:read',
  ],
};
```

`OWNER` receives the special `'*'` value, which causes `hasPermission` to return `true` for any permission check.

## Checking permissions in tRPC routers

### Using `requirePermission` in `orgProcedure`

The most common pattern is using `orgProcedure` (which establishes org context) combined with `requirePermission`:

```typescript
import { orgProcedure, router } from '@cruzjs/core/trpc/context';
import { requirePermission } from '@cruzjs/start/orgs/auth.utils';

export const pipelineRouter = router({
  create: orgProcedure
    .input(createPipelineSchema)
    .mutation(async ({ ctx, input }) => {
      // ctx.org is set by orgProcedure
      await requirePermission(ctx.org, 'pipeline:write');

      // User has permission -- proceed
      const service = ctx.container.get<PipelineService>(PipelineService);
      return service.create(ctx.org.org.orgId, input);
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.org, 'pipeline:delete');
      // ...
    }),
});
```

`requirePermission` throws a 403 `Response` if the user lacks the required permission.

### Requiring multiple permissions

```typescript
import {
  requireAnyPermission,
  requireAllPermissions,
} from '@cruzjs/start/orgs/auth.utils';

// OR logic -- user needs at least one of these
await requireAnyPermission(ctx.org, ['org:write', 'member:write']);

// AND logic -- user needs all of these
await requireAllPermissions(ctx.org, ['billing:read', 'billing:write']);
```

## Checking permissions in React Router loaders

For server-side permission checks in loaders/actions:

```typescript
import { requireSession } from '@cruzjs/core/shared/middleware/session.middleware';
import { requireOrgContext } from '@cruzjs/core/shared/middleware/org-context.middleware';
import { requirePermission } from '@cruzjs/start/orgs/auth.utils';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const auth = await requireSession(request);
  const orgContext = await requireOrgContext(request, params, auth);
  await requirePermission(orgContext, 'billing:read');

  // User has billing:read permission -- load data
}
```

## Using `PermissionService` directly

For more complex permission logic, inject `PermissionService`:

```typescript
import { PermissionService } from '@cruzjs/start/orgs/permission.service';

const permissionService = container.get<PermissionService>(PermissionService);

// Check single permission
const canEdit = await permissionService.hasPermission(userId, orgId, 'org:write');

// Check any permission (OR)
const canManage = await permissionService.hasAnyPermission(userId, orgId, [
  'member:write',
  'member:delete',
]);

// Check all permissions (AND)
const canBill = await permissionService.hasAllPermissions(userId, orgId, [
  'billing:read',
  'billing:write',
]);

// Get the user's role directly
const role = await permissionService.getUserRole(userId, orgId);

// Convenience checks
const isOwner = await permissionService.isOrgOwner(userId, orgId);
const isAdminOrOwner = await permissionService.isOrgAdminOrOwner(userId, orgId);
```

## Checking permissions in the UI

The `auth.session` query returns each org with the user's role. Use this to conditionally render UI elements:

```tsx
function OrgSettings() {
  const { data } = trpc.auth.session.useQuery();
  const currentOrg = data?.organizations.find((o) => o.isCurrent);

  // Only OWNER and ADMIN have org:write
  const canEditOrg = currentOrg?.role === 'OWNER' || currentOrg?.role === 'ADMIN';

  return (
    <div>
      {canEditOrg && <Button onClick={openSettings}>Edit Settings</Button>}
    </div>
  );
}
```

For reusable permission checks on the client, create a helper:

```typescript
import { rolePermissions, ALL_PERMISSIONS } from '@cruzjs/core/orgs/org.models';
import type { OrgRole, Permission } from '@cruzjs/core/orgs/org.models';

export function hasPermission(role: OrgRole, permission: Permission): boolean {
  const perms = rolePermissions[role];
  if (perms === ALL_PERMISSIONS) return true;
  return perms.includes(permission);
}
```

## Adding custom permissions

To add new permissions for your domain resources, extend the permission configuration in your project. The `Permission` type and `rolePermissions` mapping from `@cruzjs/saas` can be augmented:

```typescript
// src/permissions.ts
import type { OrgRole } from '@cruzjs/core/orgs/org.models';

// Define your custom permissions
export type AppPermission =
  | 'org:read'
  | 'org:write'
  | 'org:delete'
  | 'member:read'
  | 'member:write'
  | 'member:delete'
  | 'billing:read'
  | 'billing:write'
  | 'pipeline:read'
  | 'pipeline:write'
  | 'pipeline:delete'
  // Add your custom permissions
  | 'document:read'
  | 'document:write'
  | 'document:delete';
```

Then add them to the appropriate roles in your permission configuration:

```typescript
export const rolePermissions: Record<OrgRole, AppPermission[] | '*'> = {
  OWNER: '*',
  ADMIN: [
    // ... existing permissions
    'document:read', 'document:write', 'document:delete',
  ],
  MEMBER: [
    // ... existing permissions
    'document:read', 'document:write',
  ],
  VIEWER: [
    // ... existing permissions
    'document:read',
  ],
};
```

`OWNER` automatically gets access to any new permission since it uses the `'*'` wildcard.
