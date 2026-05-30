---
title: Organizations
description: The CruzJS organization system for multi-tenant SaaS applications with OrgService, slug-based URLs, and org switching.
---

:::note[Provided by @cruzjs/start]
Organization and member management are provided by `@cruzjs/start`. These docs describe how they integrate with Pro features like billing and admin. The core org services (`OrgService`, `MemberService`, `InvitationService`, `PermissionService`) live in `@cruzjs/start/orgs/`, and org types/models are in `@cruzjs/core/orgs/org.models`.
:::

The `@cruzjs/start` package provides a complete multi-tenant organization system. Organizations are the primary unit of tenancy -- users belong to one or more organizations, and data is scoped to the organization level.

## Overview

The organization system includes:

- **OrgService** -- CRUD operations for organizations
- **Slug-based URLs** -- Human-readable org identifiers (`/orgs/acme-corp/dashboard`)
- **Soft deletes** -- Organizations are never hard-deleted
- **Settings storage** -- JSON settings per organization
- **Org switching** -- Users can switch between their organizations

## Database Schema

Organizations are stored in the `Organization` table:

```typescript
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';

const f = DrizzleUniversalFactory.create((b) => ({
  organizations: b.table('Organization', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    name: b.text('name').notNull(),
    slug: b.text('slug').notNull().unique(),
    ownerId: b.text('ownerId').notNull().references(() => authIdentity.id),
    avatarUrl: b.text('avatarUrl'),
    stripeCustomerId: b.text('stripeCustomerId'),
    settings: b.json('settings').default('{}'),
    deletedAt: b.timestamp('deletedAt'),          // Soft delete timestamp
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  }),
}));

export const { organizations } = f();
```

## OrgService

The `OrgService` is an injectable service for organization CRUD:

### Creating Organizations

```typescript
import { OrgService } from '@cruzjs/start/orgs/org.service';

// In a tRPC router or service
const org = await orgService.createOrg(
  {
    name: 'Acme Corporation',
    slug: 'acme-corp',           // Optional -- auto-generated from name
    avatarUrl: 'https://...',    // Optional
    settings: {                  // Optional JSON settings
      timezone: 'America/New_York',
      defaultCurrency: 'USD',
    },
  },
  userId  // Creator becomes OWNER
);
```

When creating an organization:
1. A slug is generated from the name if not provided
2. Slug uniqueness is enforced (appends a suffix like `-2` if needed)
3. The creator is automatically added as an OWNER member

### Querying Organizations

```typescript
// Get by ID
const org = await orgService.getOrg(orgId);

// Get by slug (for URL resolution)
const org = await orgService.getOrgBySlug('acme-corp');

// List all organizations for a user
const orgs = await orgService.listUserOrgs(userId);

// Get organization with member count
const orgWithStats = await orgService.getOrgWithStats(orgId);
// { ...org, memberCount: 5 }
```

### Updating Organizations

```typescript
const updated = await orgService.updateOrg(orgId, {
  name: 'Acme Corp International',
  slug: 'acme-intl',
  avatarUrl: 'https://new-avatar.jpg',
  settings: { timezone: 'Europe/London' },
});
```

### Deleting Organizations

Organizations are soft-deleted by setting the `deletedAt` timestamp. They are excluded from all queries by default:

```typescript
await orgService.deleteOrg(orgId);
// Sets deletedAt, does not remove the row
```

## Slug-Based URLs

CruzJS uses slug-based routing for organization-scoped pages:

```
/orgs/:slug/dashboard
/orgs/:slug/settings
/orgs/:slug/members
/orgs/:slug/billing
```

The org context middleware resolves the slug to an organization ID and verifies the user's membership:

```typescript
// In a React Router loader
export async function loader({ request, params }: LoaderFunctionArgs) {
  const auth = await requireSession(request);
  const orgContext = await requireOrgContext(request, params, auth);

  // orgContext.org.orgId -- resolved organization ID
  // orgContext.org.role  -- user's role (OWNER, ADMIN, MEMBER, VIEWER)

  return { org: await orgService.getOrg(orgContext.org.orgId) };
}
```

### Slug Generation

Slugs are generated from organization names using these rules:

- Lowercase all characters
- Replace spaces and special characters with hyphens
- Remove consecutive hyphens
- Trim hyphens from start and end
- Ensure uniqueness by appending `-2`, `-3`, etc. if needed

```
"Acme Corporation" → "acme-corporation"
"My Band!!"       → "my-band"
"Acme Corp" (dup) → "acme-corp-2"
```

## Org Switching

Users can belong to multiple organizations. The current organization is stored in the session:

```typescript
// The session tracks which org the user is currently viewing
type SessionData = {
  userId: string;
  currentOrgId: string | null;
  expiresAt: string;
};
```

### Organization Type

The client-side organization type includes the user's role and current status:

```typescript
type Organization = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  isCurrent: boolean;
};
```

### Switching in the UI

```typescript
// tRPC mutation to switch organizations
const switchOrg = trpc.org.switchOrg.useMutation();

function OrgSwitcher({ orgs }: { orgs: Organization[] }) {
  return (
    <select
      onChange={(e) => switchOrg.mutate({ orgId: e.target.value })}
    >
      {orgs.map((org) => (
        <option key={org.id} value={org.id} selected={org.isCurrent}>
          {org.name}
        </option>
      ))}
    </select>
  );
}
```

## Organization Settings

Settings are stored as JSON in the `settings` column. Use them for org-level configuration:

```typescript
// Read settings
const org = await orgService.getOrg(orgId);
const timezone = org?.settings?.timezone as string ?? 'UTC';

// Update settings
await orgService.updateOrg(orgId, {
  settings: {
    ...existingSettings,
    notificationsEnabled: true,
    maxUploadSizeMB: 50,
  },
});
```

## tRPC Router Integration

Organization operations are available through tRPC:

```typescript
import { orgProcedure, router } from '@cruzjs/core/trpc/context';

export const orgRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgService = ctx.container.get(OrgService);
    return orgService.listUserOrgs(ctx.session.user.id);
  }),

  create: protectedProcedure
    .input(createOrgSchema)
    .mutation(async ({ ctx, input }) => {
      const orgService = ctx.container.get(OrgService);
      return orgService.createOrg(input, ctx.session.user.id);
    }),

  update: orgProcedure
    .input(updateOrgSchema)
    .mutation(async ({ ctx, input }) => {
      const orgService = ctx.container.get(OrgService);
      return orgService.updateOrg(ctx.org.orgId, input);
    }),
});
```

## Next Steps

- [Members & Roles](/pro/members-roles) -- Managing organization members
- [Permissions](/pro/permissions) -- Resource-based access control
- [Billing](/pro/billing) -- Stripe subscriptions per organization
- [Multi-Tenant SaaS Recipe](/recipes/multi-tenant-saas) -- Complete walkthrough
