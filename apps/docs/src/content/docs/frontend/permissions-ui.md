---
title: Permission-Based UI
description: Conditionally rendering UI elements based on user roles and permissions in CruzJS.
---

CruzJS applications often need to show or hide UI elements based on the current user's role within an organization. The `@cruzjs/ui` library provides the `PermissionDenied` component for full-page permission blocks, and org context gives you the role data needed for fine-grained conditional rendering.

## Org Roles

Every organization member has one of four roles, ordered from most to least privileged:

| Role | Description |
|------|-------------|
| `OWNER` | Full control, can delete the org, manage billing |
| `ADMIN` | Can manage members, settings, and all resources |
| `MEMBER` | Can create and edit resources, limited settings access |
| `VIEWER` | Read-only access to resources |

## Accessing the Current User's Role

Inside org layout pages, the current user's role is available through React Router's outlet context:

```tsx
import { useOutletContext } from 'react-router';
import type { OrgContext } from '@cruzjs/ui';

function OrgSettingsPage() {
  const { currentUserRole, currentUserId, organization } =
    useOutletContext<OrgContext>();

  // currentUserRole is 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null
}
```

## Full-Page Permission Blocks

Use the `PermissionDenied` component when an entire page should be inaccessible to certain roles:

```tsx
import { PermissionDenied } from '@cruzjs/ui';
import { useOutletContext, useNavigate } from 'react-router';
import type { OrgContext } from '@cruzjs/ui';

export default function OrgSettingsPage() {
  const { currentUserRole } = useOutletContext<OrgContext>();
  const navigate = useNavigate();

  if (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN') {
    return (
      <PermissionDenied
        message="Only organization owners and admins can access settings."
        actionLabel="Back to Overview"
        onAction={() => navigate('../overview')}
      />
    );
  }

  return <SettingsForm />;
}
```

## Conditional Element Rendering

For hiding specific buttons, links, or sections based on role, use simple conditional rendering:

### Hiding Action Buttons

```tsx
function MemberRow({ member, currentUserRole }: { member: Member; currentUserRole: string }) {
  const canManageMembers = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100">
      <div>
        <p className="font-medium text-slate-900">{member.name}</p>
        <p className="text-sm text-slate-500">{member.email}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
          {member.role}
        </span>
        {canManageMembers && member.role !== 'OWNER' && (
          <button className="text-sm text-red-600 hover:underline">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
```

### Showing Admin-Only Sections

```tsx
function OrgOverviewPage() {
  const { organization, currentUserRole } = useOutletContext<OrgContext>();
  const isAdmin = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  return (
    <div className="space-y-6">
      <SectionCard title="Organization Details">
        <DetailRow icon={<BuildingIcon />} label="Name" value={organization.name} />
        <DetailRow icon={<UsersIcon />} label="Members" value={organization.memberCount} />
      </SectionCard>

      {/* Only admins see the danger zone */}
      {isAdmin && (
        <SectionCard title="Danger Zone" variant="danger">
          <p className="text-sm text-slate-600 mb-4">
            Deleting this organization is permanent and cannot be undone.
          </p>
          <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
            Delete Organization
          </button>
        </SectionCard>
      )}
    </div>
  );
}
```

## Role Hierarchy Helper

Create a utility function to simplify role comparisons:

```typescript
// utils/permissions.ts
const ROLE_LEVELS: Record<string, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

export function hasMinRole(
  currentRole: string | null,
  requiredRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
): boolean {
  if (!currentRole) return false;
  return (ROLE_LEVELS[currentRole] || 0) >= ROLE_LEVELS[requiredRole];
}
```

Use it in components:

```tsx
import { hasMinRole } from '~/utils/permissions';

function ProjectActions({ currentUserRole }: { currentUserRole: string | null }) {
  return (
    <div className="flex gap-2">
      {/* All authenticated users can view */}
      <button>View</button>

      {/* Members and above can edit */}
      {hasMinRole(currentUserRole, 'MEMBER') && (
        <button>Edit</button>
      )}

      {/* Only admins and owners can delete */}
      {hasMinRole(currentUserRole, 'ADMIN') && (
        <button className="text-red-600">Delete</button>
      )}
    </div>
  );
}
```

## Permission-Based Navigation

Hide navigation tabs that the user cannot access:

```tsx
const ORG_TABS = [
  { path: 'overview', label: 'Overview', minRole: 'VIEWER' as const },
  { path: 'members', label: 'Members', minRole: 'VIEWER' as const },
  { path: 'invitations', label: 'Invitations', minRole: 'ADMIN' as const },
  { path: 'settings', label: 'Settings', minRole: 'ADMIN' as const },
  { path: 'billing', label: 'Billing', minRole: 'OWNER' as const },
];

function OrgTabNav({ currentUserRole }: { currentUserRole: string | null }) {
  const visibleTabs = ORG_TABS.filter((tab) =>
    hasMinRole(currentUserRole, tab.minRole)
  );

  return (
    <nav className="flex gap-1 border-b border-slate-200">
      {visibleTabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `px-4 py-2 text-sm font-medium ${
              isActive
                ? 'text-[#003DCC] border-b-2 border-[#003DCC]'
                : 'text-slate-500 hover:text-slate-700'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

## Server-Side Permission Enforcement

Client-side role checks are for UX only -- they hide buttons and pages so users are not confused by actions they cannot perform. The actual security enforcement happens on the server in tRPC procedures:

```typescript
// Server-side: the real security boundary
export const orgSettingsRouter = router({
  update: orgProcedure
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      // This throws FORBIDDEN if the user lacks permission
      await requirePermission(ctx.org, 'org:settings:write');

      const container = await getAppContainer();
      const service = container.resolve(OrgService);
      return service.updateSettings(ctx.org.orgId, input);
    }),
});
```

Never rely on client-side checks alone. Always validate permissions on the server. The UI checks are a convenience layer that prevents users from attempting actions that will fail.

## Pattern Summary

| Scenario | Approach |
|----------|----------|
| Entire page restricted | `PermissionDenied` component |
| Action button hidden for some roles | Conditional rendering with `hasMinRole()` |
| Navigation tab hidden | Filter tabs array by role |
| Danger zone section | Wrap in `{isAdmin && (...)}` |
| Server enforcement | `requirePermission()` in tRPC procedure |
