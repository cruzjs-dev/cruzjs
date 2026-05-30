# Auth & Organization Scoping

## Authentication Flow

```
1. Client sends Authorization: Bearer <token> header
2. session.middleware.ts validates token → attaches ctx.session
3. org-context.middleware.ts reads X-Organization-ID header → attaches ctx.org
4. tRPC procedures check ctx.session and ctx.org
```

## Session Context

Available in `protectedProcedure` and `orgProcedure`:

```typescript
// Session type
type AuthenticatedRequest = {
  user: {
    id: string;
    email: string;
  };
  session: SessionData;
};

// Access in router
ctx.session.user.id
ctx.session.user.email
```

## Organization Context

Available in `orgProcedure` only:

```typescript
// Org context type
type OrgContext = {
  orgId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
};

// Access in router
ctx.org.orgId
ctx.org.userId
ctx.org.role
```

## Permission Middleware

Use `requirePermission()` for authorization checks:

```typescript
import { requirePermission } from '@cruzjs/start/orgs/auth.utils';

// In router
await requirePermission(ctx.org, 'product:read');
await requirePermission(ctx.org, 'product:write');
await requirePermission(ctx.org, 'product:delete');
```

### Permission Format

Pattern: `<resource>:<action>`

### Default Permissions by Role

| Permission | OWNER | ADMIN | MEMBER | VIEWER |
|------------|-------|-------|--------|--------|
| `*:read` | Yes | Yes | Yes | Yes |
| `*:write` | Yes | Yes | Yes | No |
| `*:delete` | Yes | Yes | No | No |
| `org:read` | Yes | Yes | Yes | Yes |
| `org:write` | Yes | Yes | No | No |
| `org:delete` | Yes | No | No | No |
| `member:read` | Yes | Yes | Yes | Yes |
| `member:write` | Yes | Yes | No | No |
| `member:delete` | Yes | Yes | No | No |
| `billing:read` | Yes | Yes | No | No |
| `billing:write` | Yes | No | No | No |

## Client-Side Org Context

The client automatically sends `X-Organization-ID` header via OrgContext:

```typescript
// apps/web/src/trpc/client.ts
headers: () => {
  const token = getStoredSessionToken();
  const orgId = getCurrentOrgId();  // From OrgContext

  return {
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(orgId ? { 'X-Organization-ID': orgId } : {}),
  };
}
```

## OrgContext Provider (React)

```typescript
// apps/web/src/root.tsx
<OrgProvider>
  <OrgContextBridge>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <CruzUIProvider>
          <Outlet />
        </CruzUIProvider>
      </QueryClientProvider>
    </trpc.Provider>
  </OrgContextBridge>
</OrgProvider>
```

## Org Layout Pattern

Pages under `/orgs/:slug/*` get org context from the layout:

```typescript
// apps/web/src/routes/orgs/$slug/index.tsx (layout)
export default function OrgLayout() {
  const { slug } = useParams();
  const { setOrgId } = useOrg();

  const { data: orgData } = trpc.org.getBySlug.useQuery({ slug: slug! });
  const { data: membersData } = trpc.member.list.useQuery();

  // Set org ID in context for tRPC headers
  useEffect(() => {
    if (orgData?.organization) {
      setOrgId(orgData.organization.id);
    }
  }, [orgData, setOrgId]);

  // Determine current user's role
  const currentMember = membersData?.members?.find(
    (m) => m.userId === sessionData?.user?.id
  );
  const currentUserRole = currentMember?.role || null;

  return (
    <Outlet
      context={{
        organization: orgData.organization,
        currentUserRole,
        currentUserId: sessionData?.user?.id,
        orgId: orgData.organization.id,
      }}
    />
  );
}
```

## Using Org Context in Pages

```typescript
// apps/web/src/routes/orgs/$slug/overview.tsx
import { useOutletContext } from 'react-router';
import type { OrgContext } from '@cruzjs/start';

export default function OrgOverviewPage() {
  const { organization, currentUserRole, currentUserId, orgId } =
    useOutletContext<OrgContext>();

  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  return (
    <Box>
      <Heading>{organization.name}</Heading>
      {canManage && <Button>Manage Settings</Button>}
    </Box>
  );
}
```

## Audit Logging

Log important actions for compliance:

```typescript
import { AuditLogService } from '@cruzjs/saas';

// In router mutation
const auditService = container.get<AuditLogService>(AuditLogService);

await auditService.logAudit(
  ctx.org.orgId,
  ctx.org.userId,
  'PRODUCT_CREATED',        // Action
  'PRODUCT',                // Resource type
  {                         // Metadata
    productId: product.id,
    name: product.name,
  },
  ctx.request.headers.get('x-forwarded-for'),  // IP
  ctx.request.headers.get('user-agent')        // User agent
);
```

## Auth Utilities

```typescript
import {
  getUserOrganizations,
  getUserOrgRole,
  isOrgOwner,
  isOrgAdminOrOwner,
} from '@cruzjs/start/orgs/auth.utils';

// Get all orgs a user belongs to
const orgs = await getUserOrganizations(userId);

// Get user's role in specific org
const role = await getUserOrgRole(userId, orgId);

// Check specific role
const isOwner = await isOrgOwner(userId, orgId);
const isAdmin = await isOrgAdminOrOwner(userId, orgId);
```

## Session Token Management

```typescript
import {
  getStoredSessionToken,
  storeSessionToken,
  clearSessionToken,
} from '@cruzjs/core/auth/utils.client';

// After login
storeSessionToken(loginResponse.session.token);

// Get current token
const token = getStoredSessionToken();

// On logout
clearSessionToken();
```

## Social Auth (OAuth)

`SocialAuthModule` is included automatically in `StartModule`. It provides OAuth-based social login with support for multiple providers.

### Supported Providers

GitHub, Google, Discord, Twitter, LinkedIn, Microsoft, Apple

### Configuration

Register providers via multi-injection on the `OAUTH_PROVIDER` token in your app module:

```typescript
import { Module } from '@cruzjs/core';
import { OAUTH_PROVIDER, GitHubProvider, GoogleProvider } from '@cruzjs/start/social-auth';

@Module({
  providers: [
    { provide: OAUTH_PROVIDER, useFactory: () => new GitHubProvider({ clientId: '...', clientSecret: '...' }), multi: true },
    { provide: OAUTH_PROVIDER, useFactory: () => new GoogleProvider({ clientId: '...', clientSecret: '...' }), multi: true },
  ],
})
class AppModule {}
```

### Routes

- `/auth/:provider` -- Redirects user to the OAuth provider
- `/auth/:provider/callback` -- Handles the OAuth callback, creates or links account

### tRPC Procedures

| Procedure | Auth | Description |
|-----------|------|-------------|
| `socialAuth.getAvailableProviders` | Public | Lists configured providers |
| `socialAuth.getAuthUrl` | Protected | Generates OAuth redirect URL |
| `socialAuth.getConnectedAccounts` | Protected | Lists user's linked social accounts |
| `socialAuth.disconnectAccount` | Protected | Unlinks a social account |

### CSRF Protection

OAuth state includes a `nonce` and `createdAt` timestamp via `OAuthState`. The state is validated on callback to prevent CSRF attacks.

See `16-SOCIAL-AUTH.md` for full documentation.

## Two-Factor Authentication

Register `TwoFactorModule` to add TOTP and SMS-based two-factor authentication.

```typescript
import { TwoFactorModule } from '@cruzjs/core/two-factor';

// Add to modules in createCruzApp
modules: [StartModule, TwoFactorModule, ...]
```

### tRPC Procedures

| Procedure | Auth | Description |
|-----------|------|-------------|
| `twoFactor.getStatus` | Protected | Check if 2FA is enabled |
| `twoFactor.setupTOTP` | Protected | Generate TOTP secret and QR code |
| `twoFactor.verifyTOTP` | Protected | Verify TOTP code and enable 2FA |
| `twoFactor.disable` | Protected | Disable 2FA |
| `twoFactor.generateBackupCodes` | Protected | Generate one-time backup codes |
| `twoFactor.listTrustedDevices` | Protected | List devices that skip 2FA |

### Adapter

The `TwoFactorAdapter` binding in the runtime adapter handles SMS delivery. On Cloudflare, `CloudflareTwilioTwoFactorAdapter` extends `TwilioTwoFactorAdapter` for SMS-based OTP. TOTP via authenticator apps (Google Authenticator, Authy) works without an adapter.

## Magic Link Authentication

Register `MagicLinkModule` to enable passwordless authentication via email magic links.

```typescript
import { MagicLinkModule } from '@cruzjs/core/magic-link';

// Add to modules in createCruzApp
modules: [StartModule, MagicLinkModule, ...]
```

The magic link flow works as follows:

1. User enters email address
2. Server generates a unique token and sends it via email
3. User clicks the link containing the token
4. Server validates the token, creates a session, and logs the user in

Magic links expire after a configurable TTL and can only be used once.
