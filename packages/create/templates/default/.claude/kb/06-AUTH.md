# Auth & Organization Scoping

## Authentication

Session-based + JWT. The framework handles login, registration, password reset, and OAuth automatically via `@cruzjs/core` and `@cruzjs/start`.

### Session Context

Available in `protectedProcedure` and `orgProcedure`:

```typescript
ctx.session.user.id       // string — current user's identity ID
ctx.session.user.email    // string — current user's email
```

### Registration Gating

Set `REGISTRATION_INVITE_CODE` env var to require an invite code for new signups.

### OAuth

OAuth providers are configured via `OAuthService` in `@cruzjs/core`. The framework supports Google, GitHub, and other providers out of the box when configured in env vars.

## Organization Context

Available in `orgProcedure` only:

```typescript
ctx.org.orgId    // string — current organization ID
ctx.org.userId   // string — current user ID
ctx.org.role     // 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
```

The client sends `X-Organization-ID` header automatically via `OrgContextBridge` in root.tsx.

## Roles (Hierarchy)

```
OWNER > ADMIN > MEMBER > VIEWER
```

| Role | Can read | Can write | Can delete | Can manage org |
|------|----------|-----------|------------|----------------|
| OWNER | Yes | Yes | Yes | Yes |
| ADMIN | Yes | Yes | Yes | Limited |
| MEMBER | Yes | Yes | No | No |
| VIEWER | Yes | No | No | No |

## Permission Checks

```typescript
import { requirePermission } from '@cruzjs/saas/orgs/auth.utils';

// Format: <resource>:<action>
await requirePermission(ctx.org, 'product:read');
await requirePermission(ctx.org, 'product:write');
await requirePermission(ctx.org, 'product:delete');
await requirePermission(ctx.org, 'org:write');
```

### Default Permission Matrix

| Permission | OWNER | ADMIN | MEMBER | VIEWER |
|------------|-------|-------|--------|--------|
| `*:read` | Yes | Yes | Yes | Yes |
| `*:write` | Yes | Yes | Yes | No |
| `*:delete` | Yes | Yes | No | No |
| `org:write` | Yes | Yes | No | No |
| `org:delete` | Yes | No | No | No |
| `member:write` | Yes | Yes | No | No |
| `billing:read` | Yes | Yes | No | No |
| `billing:write` | Yes | No | No | No |

## Client-Side Org Context

```typescript
// In root.tsx — automatic setup
<OrgProvider>
  <OrgContextBridge>
    <trpc.Provider ...>
      <Outlet />
    </trpc.Provider>
  </OrgContextBridge>
</OrgProvider>
```

### Using Org Context in Pages

```typescript
import { useOutletContext } from 'react-router';
import type { OrgContext } from '@cruzjs/start';

export default function OrgPage() {
  const { organization, currentUserRole, orgId } = useOutletContext<OrgContext>();
  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  // ...
}
```

## Auth Utilities

```typescript
import {
  getUserOrganizations,
  getUserOrgRole,
  isOrgOwner,
  isOrgAdminOrOwner,
} from '@cruzjs/saas/orgs/auth.utils';
```

## Session Token (Client)

```typescript
import {
  getStoredSessionToken,
  storeSessionToken,
  clearSessionToken,
} from '@cruzjs/core/auth/utils.client';
```

## Rules

1. Use `protectedProcedure` for user-specific endpoints
2. Use `orgProcedure` for org-scoped endpoints
3. Always call `requirePermission()` before org mutations
4. Never trust client-provided IDs alone — verify ownership in queries
5. Use role checks in UI to hide/show actions (but always enforce server-side)
