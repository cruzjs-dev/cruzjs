---
title: Permissions
description: Resource-based permission system with role mapping, middleware enforcement, and UI permission checks.
---

:::note[Provided by @cruzjs/start]
Organization and member management are provided by `@cruzjs/start`. Permission types (`Permission`, `OrgRole`, `ALL_PERMISSIONS`) are imported from `@cruzjs/core/orgs/org.models`. Middleware helpers like `requirePermission` are imported from `@cruzjs/core/shared/middleware/permission.middleware`.
:::

CruzJS uses a resource-based permission system where permissions follow the format `resource:action`. Roles are mapped to sets of permissions, and access is enforced using `requirePermission` middleware in routers and loaders.

## Permission Format

Permissions use a `resource:action` naming convention:

```typescript
type Permission =
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
  | 'pipeline:delete';
```

## Role-Permission Mapping

Each role has a defined set of permissions. The `OWNER` role has a special wildcard (`*`) that grants all permissions:

```typescript
import { ALL_PERMISSIONS } from '@cruzjs/core/orgs/org.models';

export const rolePermissions: Record<OrgRole, Permission[] | typeof ALL_PERMISSIONS> = {
  OWNER: ALL_PERMISSIONS,  // '*' -- every permission
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

## Checking Permissions

### In React Router Loaders/Actions

Use the `requirePermission` middleware in route loaders and actions:

```typescript
import { requirePermission, requireAnyPermission } from '@cruzjs/start/orgs/auth.utils';
import { requireSession } from '@cruzjs/core/shared/middleware/session.middleware';
import { requireOrgContext } from '@cruzjs/core/shared/middleware/org-context.middleware';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const auth = await requireSession(request);
  const orgContext = await requireOrgContext(request, params, auth);

  // Require a single permission
  await requirePermission(orgContext, 'billing:read');

  // Or require any of several permissions
  await requireAnyPermission(orgContext, ['member:write', 'member:delete']);

  // User has permission -- proceed with the loader
  return { data: await fetchData(orgContext.org.orgId) };
}
```

If the user lacks the required permission, a `403 Forbidden` response is thrown:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Permission denied: billing:read"
  }
}
```

### In tRPC Routers

Use `requirePermission` inside tRPC procedures. It throws a `FORBIDDEN` error automatically if the user lacks the permission:

```typescript
import { orgProcedure, router } from '@cruzjs/core/trpc/context';
import { requirePermission } from '@cruzjs/core/shared/middleware/permission.middleware';
import { getAppContainer } from '@cruzjs/core';
import { BillingService } from './billing.service';

export const billingRouter = router({
  getPlans: orgProcedure.query(async ({ ctx }) => {
    await requirePermission(ctx, 'billing:read');

    const container = await getAppContainer();
    const service = container.resolve(BillingService);
    return service.getPlans();
  }),
});
```

## Custom Permissions

To add custom permissions for your application, extend the `Permission` type and update the role mapping:

```typescript
// In your app's types
import type { Permission as BasePermission } from '@cruzjs/core/orgs/org.models';

// Extend with your custom permissions
type AppPermission = BasePermission
  | 'project:read'
  | 'project:write'
  | 'project:delete'
  | 'report:read'
  | 'report:export';

// Create your custom role mapping
const appRolePermissions: Record<OrgRole, AppPermission[] | '*'> = {
  OWNER: '*',
  ADMIN: [
    // Include base permissions
    'org:read', 'org:write',
    'member:read', 'member:write', 'member:delete',
    'billing:read', 'billing:write',
    // Add custom permissions
    'project:read', 'project:write', 'project:delete',
    'report:read', 'report:export',
  ],
  MEMBER: [
    'org:read', 'member:read',
    'project:read', 'project:write',
    'report:read',
  ],
  VIEWER: [
    'org:read',
    'project:read',
    'report:read',
  ],
};
```

## UI Permission Checks

Check permissions on the client side to conditionally render UI elements:

```typescript
// In your React component
function ProjectSettings({ orgId, userRole }: Props) {
  // Simple role-based check
  const canEdit = userRole === 'OWNER' || userRole === 'ADMIN';

  return (
    <div>
      <h2>Project Settings</h2>
      {canEdit ? (
        <button onClick={handleSave}>Save Changes</button>
      ) : (
        <p>You do not have permission to edit settings.</p>
      )}
    </div>
  );
}
```

For more granular checks, derive permissions from the user's role on the server and pass them to the client:

```typescript
// In your loader
export async function loader({ request, params }: LoaderFunctionArgs) {
  const auth = await requireSession(request);
  const orgContext = await requireOrgContext(request, params, auth);

  const role = orgContext.org.role;
  return {
    permissions: {
      canEditProject: role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER',
      canDeleteProject: role === 'OWNER' || role === 'ADMIN',
    },
  };
}
```

:::caution
Client-side permission checks are for UX only. Always enforce permissions on the server (in loaders, actions, or tRPC procedures). A user can bypass client-side checks by modifying the DOM or calling the API directly.
:::

## Next Steps

- [Members & Roles](/pro/members-roles) -- Role assignment and member management
- [Organizations](/pro/organizations) -- Organization CRUD
- [Audit Logging](/pro/audit-logging) -- Track permission-related actions
