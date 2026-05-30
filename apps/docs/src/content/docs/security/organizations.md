---
title: Organizations
description: Multi-tenancy with organization-scoped data isolation, member management, and invitations in CruzJS.
---

:::note
Organization features described on this page are provided by `@cruzjs/start`. The `OrgService`, `MemberService`, `InvitationService`, and `PermissionService` live in `@cruzjs/start/orgs/`. Org types and models are in `@cruzjs/core/orgs/org.models`. Basic authentication (login, registration, sessions, JWT) is part of `@cruzjs/core`.
:::

CruzJS supports multi-tenant applications through organizations. Each org has its own members, roles, settings, and data scope. The `@cruzjs/start` package provides `OrgService`, `MemberService`, and `InvitationService` for managing the full org lifecycle.

## Creating an organization

Use the `org.create` tRPC mutation. The creator is automatically assigned the `OWNER` role:

```typescript
const org = await trpc.org.create.mutate({
  name: 'My Team',
  slug: 'my-team',       // optional -- auto-generated from name if omitted
  avatarUrl: 'https://...', // optional
  settings: { timezone: 'America/New_York' }, // optional JSON
});

// org.id -- UUID
// org.slug -- URL-safe slug (unique, auto-suffixed if collision)
```

Under the hood, `OrgService.createOrg()` generates a unique slug, inserts the organization row, and creates an `orgMembers` entry with role `OWNER`:

```typescript
// Internal flow
const org = await orgService.createOrg(
  { name: 'My Team', slug: 'my-team' },
  ownerId
);
```

## Org slugs

Slugs are URL-safe identifiers auto-generated from the org name. If a slug collision occurs, a numeric suffix is appended (e.g., `my-team-1`). You can also provide a custom slug. The `org.getBySlug` query lets you look up orgs by slug:

```typescript
const org = await trpc.org.getBySlug.query({ slug: 'my-team' });
```

## Organization context (`orgProcedure`)

Most org-scoped operations use `orgProcedure`, which resolves the org from route params or the `X-Organization-ID` header and verifies the user is a member:

```typescript
import { orgProcedure, router } from '@cruzjs/core/trpc/context';

export const myRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    // ctx.org.org.orgId -- the current org ID
    // ctx.org.org.userId -- the authenticated user ID
    // ctx.org.org.role -- the user's role in this org
    // ctx.org.user.id -- same as userId
  }),
});
```

The org context middleware (`requireOrgContext`) extracts the org ID from:
1. Route params (`:orgId` parameter)
2. `X-Organization-ID` request header

It then verifies the org exists (and is not soft-deleted) and that the user is a member. If either check fails, a 400/403/404 response is thrown.

### Using org context in React Router loaders

```typescript
import { requireSession } from '@cruzjs/core/shared/middleware/session.middleware';
import { requireOrgContext } from '@cruzjs/core/shared/middleware/org-context.middleware';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const auth = await requireSession(request);
  const orgCtx = await requireOrgContext(request, params, auth);

  // orgCtx.org.orgId, orgCtx.org.role available
}
```

Use `getOrgContext` instead of `requireOrgContext` if you want a nullable result rather than a thrown response:

```typescript
const orgCtx = await getOrgContext(request, params, auth);
if (orgCtx) {
  // user is in an org
}
```

## Switching organizations

The session stores a `currentOrgId` field. Update it via `SessionService.updateCurrentOrg()`:

```typescript
const sessionService = container.get<SessionService>(SessionService);
await sessionService.updateCurrentOrg(sessionToken, newOrgId);
```

This updates both the KV cache and the D1 record. The `auth.session` query returns each org with an `isCurrent` flag so the UI can display the active org.

## Org-scoped data isolation

All org-scoped database tables include an `orgId` foreign key. Use the org context to scope queries:

```typescript
// In an orgProcedure handler
const items = await db
  .select()
  .from(myTable)
  .where(eq(myTable.orgId, ctx.org.org.orgId));
```

See the [Data Ownership](/architecture/data-ownership) guide for patterns on user-scoped vs. org-scoped data.

## Member management

### Listing members

```typescript
const members = await trpc.member.list.query();
// Returns: { id, orgId, userId, role, createdAt, user: { id, name, email, avatarUrl } }[]
```

### Updating a member's role

Requires `member:write` permission. Prevents demoting the last `OWNER`:

```typescript
await trpc.member.updateRole.mutate({
  userId: memberId,
  role: 'ADMIN', // OWNER | ADMIN | MEMBER | VIEWER
});
```

### Removing a member

Requires `member:delete` permission. Prevents removing the last `OWNER`:

```typescript
await trpc.member.remove.mutate({ userId: memberId });
```

### Leaving an organization

Members can leave via self-service. Owners cannot leave (must transfer ownership first), and users cannot leave their last organization:

```typescript
await trpc.member.leave.mutate({ orgId });
```

## Invitations

Members with `member:write` permission can invite new users by email. Invitations expire after 7 days.

### Sending an invitation

```typescript
await trpc.invitation.create.mutate({
  email: 'newuser@example.com',
  role: 'MEMBER',
});
```

This generates a secure token, stores the hashed token in D1, and queues an invitation email with accept/decline links. If the email already belongs to a member, the request is rejected. If a pending non-expired invitation already exists for that email, a duplicate error is returned.

### Accepting an invitation

```typescript
await trpc.invitation.accept.mutate({ token: invitationToken });
```

If the invited email does not match an existing identity, a new identity is created without a password (the user can set one via password reset). The user is added to the org with the specified role, and the invitation is deleted.

### Declining or canceling

```typescript
// Invitee declines
await trpc.invitation.decline.mutate({ token: invitationToken });

// Org admin cancels
await trpc.invitation.cancel.mutate({ invitationId });
```

### Listing pending invitations

```typescript
const invitations = await trpc.invitation.list.query();
// Returns non-expired invitations for the current org
```

## Org settings

Organizations have a JSON `settings` column for arbitrary configuration:

```typescript
await trpc.org.update.mutate({
  settings: {
    timezone: 'America/Chicago',
    features: { advancedReporting: true },
  },
});
```

Settings are stored as a JSON string in D1 and parsed/stringified automatically by `OrgService`.

## Soft deletion

`OrgService.deleteOrg()` performs a soft delete by setting the `deletedAt` timestamp. Soft-deleted orgs are excluded from all queries by default. Requires `org:delete` permission (typically `OWNER` only).

## tRPC endpoints

| Endpoint | Type | Auth | Permission | Description |
|----------|------|------|------------|-------------|
| `org.list` | query | protected | -- | List user's orgs |
| `org.create` | mutation | protected | -- | Create new org |
| `org.get` | query | orgProcedure | `org:read` | Get org with stats |
| `org.getBySlug` | query | protected | membership | Get org by slug |
| `org.update` | mutation | orgProcedure | `org:write` | Update org |
| `org.delete` | mutation | orgProcedure | `org:delete` | Soft-delete org |
