---
title: "06 — Permissions"
description: Add owner vs member roles so only owners can delete projects.
---

# Chapter 06 — Permissions

Not everyone in an org should be able to do everything. This chapter adds role-based access control (RBAC): owners can delete projects, members can only view.

## How roles work

Every org member has a role: `owner` or `member`. The role is stored on the membership record and surfaced on `ctx.org.member.role` inside `orgProcedure`.

CruzJS uses permission strings like `projects:delete`. You define which roles have which permissions, then check them in your procedures.

## Define permissions

Create `packages/core/src/tasks/tasks.permissions.ts`:

```typescript
import { definePermissions } from '@cruzjs/core';

export const TASK_PERMISSIONS = definePermissions({
  'projects:create': ['owner', 'member'],
  'projects:delete': ['owner'],
  'tasks:create': ['owner', 'member'],
  'tasks:delete': ['owner', 'member'],
});
```

## Enforce in the router

```typescript
// packages/core/src/tasks/tasks.trpc.ts
import { requirePermission } from '@cruzjs/core';
import { TASK_PERMISSIONS } from './tasks.permissions';

deleteProject: t.orgProcedure
  .input(z.object({ id: z.string() }))
  .mutation(({ ctx, input }) => {
    requirePermission(ctx.org, 'projects:delete', TASK_PERMISSIONS);
    return this.service.deleteProject(input.id, ctx.org.id);
  }),
```

`requirePermission` throws a `403 TRPCError` if the caller's role doesn't have the permission. No `if` statement needed in your service.

## Test with two accounts

1. Sign in as the org **owner**. Try deleting a project — it works.
2. Sign in as a **member**. Try deleting the same project — you get a 403.

The check happens server-side. The client cannot bypass it by calling the endpoint directly.

## Conditional UI

Hide the delete button for members:

```typescript
// In your React component
const { data: member } = trpc.org.currentMember.useQuery();

{member?.role === 'owner' && (
  <button onClick={() => deleteProject.mutate({ id: project.id })}>
    Delete project
  </button>
)}
```

Always enforce on the server too — the UI check is just UX, not security.

## What we built

- Defined permission strings for `projects:delete`
- Used `requirePermission` to enforce roles server-side
- Tested the access control with two accounts

**Next:** [Chapter 07 — Real-Time](/tutorial/07-real-time/)
