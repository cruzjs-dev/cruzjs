---
title: Members & Roles
description: Managing organization members with the MemberService, role hierarchy, invitations, and the InvitationService.
---

:::note[Provided by @cruzjs/start]
Organization and member management are provided by `@cruzjs/start`. These docs describe how they integrate with Pro features like billing and admin. The core org services (`MemberService`, `InvitationService`) live in `@cruzjs/start/orgs/`.
:::

Every organization has members with assigned roles. The `MemberService` handles member CRUD operations, and the `InvitationService` manages the invitation flow for adding new members.

## Role Hierarchy

CruzJS defines four roles in descending order of privilege:

| Role | Description |
|---|---|
| `OWNER` | Full control. Can delete the organization, manage billing, and transfer ownership. |
| `ADMIN` | Can manage members, invitations, and most settings. Cannot delete the org. |
| `MEMBER` | Standard access. Can read org data and work on assigned resources. |
| `VIEWER` | Read-only access. Can view org data but cannot modify anything. |

Roles are stored as text in the `OrgMember` table:

```typescript
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';

const f = DrizzleUniversalFactory.create((b) => ({
  orgMembers: b.table('OrgMember', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    userId: b.text('userId').notNull().references(() => authIdentity.id, { onDelete: 'cascade' }),
    role: b.text('role').notNull().default('member'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  }, (table) => ({
    orgUserIdx: b.uniqueIndex('OrgMember_orgId_userId_idx').on(table.orgId, table.userId),
  })),
}));

export const { orgMembers } = f();

export const OrgRoleValues = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const;
export type OrgRole = (typeof OrgRoleValues)[number];
```

## MemberService

The `MemberService` is injectable and provides all member management operations:

### Adding Members

Members are typically added via the invitation flow, but the service also supports direct addition:

```typescript
import { MemberService } from '@cruzjs/start/orgs/member.service';

const member = await memberService.addMember(orgId, userId, 'MEMBER');
// Returns: {
//   id: 'clx...',
//   orgId: '...',
//   userId: '...',
//   role: 'MEMBER',
//   createdAt: Date,
//   updatedAt: Date,
//   user: { id, name, email, avatarUrl }
// }
```

Adding a member who already belongs to the organization throws an error.

### Listing Members

```typescript
const members = await memberService.listMembers(orgId);
// Returns members sorted by role (OWNER first), then by join date

for (const member of members) {
  console.log(`${member.user.name} (${member.role}) - ${member.user.email}`);
}
```

### Getting a Specific Member

```typescript
const member = await memberService.getMember(orgId, userId);
if (!member) {
  // User is not a member of this organization
}
```

### Changing Roles

```typescript
const updated = await memberService.updateMemberRole(orgId, userId, 'ADMIN');
```

Role changes are protected:
- The last OWNER cannot have their role changed (prevents orphaned organizations)
- Only users with appropriate permissions can change roles (enforced at the router level)

### Removing Members

```typescript
await memberService.removeMember(orgId, userId);
```

Removal is protected:
- The last OWNER cannot be removed
- Users can remove themselves (leave) via `leaveOrg()` unless they are the OWNER

### Leaving an Organization

Members can leave an organization voluntarily:

```typescript
await memberService.leaveOrg(orgId, userId);
```

This is blocked if:
- The user is the OWNER (must transfer ownership first)
- It is the user's last organization (must join or create another first)

## InvitationService

The `InvitationService` manages the complete invitation lifecycle:

### Creating Invitations

```typescript
import { InvitationService } from '@cruzjs/start/orgs/invitation.service';

const { invitation, token } = await invitationService.createInvitation(
  orgId,
  { email: 'new-member@example.com', role: 'MEMBER' },
  invitedByUserId
);

// invitation: { id, email, orgId, role, expiresAt, createdAt }
// token: raw token for the invitation link (not stored -- only the hash is in DB)
```

The service:
1. Checks if the email already belongs to an existing member (rejects duplicates)
2. Checks for existing pending invitations (rejects duplicates, allows re-invite if expired)
3. Generates a secure random token (32 bytes, hex-encoded)
4. Stores a SHA-256 hash of the token in the database
5. Sets a 7-day expiration
6. Queues an invitation email via the job system

### Invitation Email

The invitation email is sent as a background job with links to accept or decline:

```
Accept: https://myapp.com/invitations/{token}/accept
Decline: https://myapp.com/invitations/{token}/decline
```

### Accepting Invitations

```typescript
await invitationService.acceptInvitation(token, userId);
```

When accepting:
1. The token is hashed and looked up in the database
2. Expiration is checked
3. If the invited email does not have an account, one is created automatically
4. The user is added to the organization with the specified role
5. The invitation is deleted

### Declining Invitations

```typescript
await invitationService.declineInvitation(token);
```

Simply removes the invitation record.

### Listing Invitations

```typescript
const invitations = await invitationService.listInvitations(orgId);
// Returns only non-expired invitations, sorted by newest first
```

### Cancelling Invitations

```typescript
await invitationService.cancelInvitation(orgId, invitationId);
```

### Viewing Invitation Details

For the accept/decline page, retrieve invitation details with the organization info:

```typescript
const invitation = await invitationService.getInvitationByToken(token);
// Returns: { ...invitation, organization: { id, name, slug, avatarUrl } }
```

## Invitation Database Schema

```typescript
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';

const f = DrizzleUniversalFactory.create((b) => ({
  invitations: b.table('Invitation', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    email: b.text('email').notNull(),
    orgId: b.text('orgId').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    role: b.text('role').notNull().default('MEMBER'),
    token: b.text('token').notNull().unique(),        // SHA-256 hash
    expiresAt: b.timestamp('expiresAt').notNull(),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  }, (table) => ({
    emailOrgIdx: b.uniqueIndex('Invitation_email_orgId_idx').on(table.email, table.orgId),
    tokenIdx: b.index('Invitation_token_idx').on(table.token),
  })),
}));

export const { invitations } = f();
```

## Member Response Type

All member operations return a consistent type with user details:

```typescript
type MemberResponse = {
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
};
```

## Next Steps

- [Permissions](/pro/permissions) -- Fine-grained access control per role
- [Organizations](/pro/organizations) -- Organization CRUD
- [Audit Logging](/pro/audit-logging) -- Track member changes
