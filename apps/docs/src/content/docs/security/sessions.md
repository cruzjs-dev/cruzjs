---
title: Sessions
description: Session management with dual KV/D1 storage, sliding window refresh, and concurrent session support in CruzJS.
---

CruzJS manages authentication sessions through `SessionService`, which stores session data in both Cloudflare KV (for fast reads) and D1 (for persistence and audit). Sessions use opaque tokens -- never JWTs -- for server-side revocability.

## Session Module and Adapters

The `SessionModule` from `@cruzjs/core/sessions` provides a provider-agnostic session storage layer.

### SessionAdapter Interface

All session backends implement the `SessionAdapter` interface:

```typescript
interface SessionAdapter {
  store(session: StoredSession): Promise<void>;
  get(tokenHash: string): Promise<StoredSession | null>;
  getById(id: string): Promise<StoredSession | null>;
  delete(tokenHash: string): Promise<void>;
  deleteById(id: string): Promise<void>;
  getUserSessions(userId: string): Promise<StoredSession[]>;
  invalidateAll(userId: string): Promise<void>;
}
```

### Cloudflare KV Adapter

The `CloudflareKVSessionAdapter` stores sessions in KV for sub-millisecond validation at the edge. Sessions are indexed by both token hash (for fast lookup during request validation) and session ID (for management operations like listing and revoking).

### Session Management tRPC Procedures

| Procedure | Type | Description |
|-----------|------|-------------|
| `session.listSessions` | query | List all active sessions for the current user |
| `session.getCurrentSession` | query | Get details of the current session |
| `session.revokeSession` | mutation | Revoke a specific session by ID |
| `session.revokeAllSessions` | mutation | Revoke all sessions except the current one |

```typescript
function ActiveSessions() {
  const { data: sessions } = trpc.session.listSessions.useQuery();
  const revoke = trpc.session.revokeSession.useMutation();

  return (
    <ul>
      {sessions?.map((s) => (
        <li key={s.id}>
          {s.userAgent} — {s.ipAddress}
          <button onClick={() => revoke.mutate({ sessionId: s.id })}>
            Revoke
          </button>
        </li>
      ))}
    </ul>
  );
}
```

## Session lifecycle

### Creation

When a user registers, logs in, or completes OAuth, `SessionService.createSession()` generates a session:

```typescript
const session = await sessionService.createSession({
  userId: identity.id,
  currentOrgId: null,  // set later when user selects an org
  userAgent,           // captured from request headers
  ipAddress,           // captured from x-forwarded-for
});

// session.token -- raw token returned to client
// session.expiresAt -- Date, 30 days from creation
```

Internally:
1. A 32-byte random token is generated via `crypto.randomBytes`
2. The token is SHA-256 hashed for storage
3. The session is written to KV with a TTL matching the session TTL
4. The hashed token, userId, metadata, and expiry are inserted into the D1 `sessions` table
5. The raw (unhashed) token is returned to the client

### Token extraction

The session middleware extracts the token from requests in this order:

1. `Authorization: Bearer <token>` header (for mobile/CLI/API clients)
2. `auth_token=<token>` HttpOnly cookie (for browser clients — set by server on login/register via `Set-Cookie`)

Browser clients get the cookie automatically; you don't need to attach anything. See [Authentication](/security/authentication/) for the full HttpOnly cookie story.

```typescript
// In a React Router loader
import { requireSession } from '@cruzjs/core/shared/middleware/session.middleware';

export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await requireSession(request, container);
  // auth.user.id -- authenticated user ID
  // auth.session -- full SessionData
}
```

### Validation

`SessionService.getSession(token)` follows a two-tier lookup:

1. **KV cache (fast path):** Check KV by raw token key. If found and not expired, return it.
2. **D1 fallback:** Hash the token, query the `sessions` table. If found and not expired, restore it to KV cache with the remaining TTL.

If the session is expired in either store, it is deleted from both.

## Session refresh (sliding window)

Sessions use a sliding window expiry. When `refreshSession(token)` is called, if the session has less than the refresh threshold remaining, its expiry is extended to a full TTL from now:

```typescript
const refreshed = await sessionService.refreshSession(token);
```

**Default configuration:**
- Session TTL: 30 days (`config.session.ttlSeconds`)
- Refresh threshold: 7 days (`config.session.refreshThresholdSeconds`)

This means a session is refreshed when it has less than 7 days remaining. If the user is active at least once every 23 days, their session never expires.

The `auth.session` tRPC query automatically triggers a refresh check on every call, so active users stay logged in seamlessly.

## Session storage

### KV layer

Sessions are stored in KV under the `session` namespace using the raw token as the key. The value is a JSON-serialized `SessionData` object:

```typescript
type SessionData = {
  userId: string;
  currentOrgId?: string | null;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
};
```

KV entries have a TTL matching the session TTL, so expired sessions are automatically cleaned up.

### D1 layer

The `sessions` table stores the hashed token, user ID, org context, expiry, and request metadata:

| Column | Type | Description |
|--------|------|-------------|
| `sessionToken` | text | SHA-256 hash of the raw token |
| `userId` | text | Foreign key to `authIdentity` |
| `currentOrgId` | text | Currently selected org (nullable) |
| `expiresAt` | text | ISO 8601 expiry timestamp |
| `userAgent` | text | Browser user agent string |
| `ipAddress` | text | Client IP address |

## Concurrent sessions

Users can have multiple active sessions (e.g., different devices or browsers). Each login creates a separate session token. The `auth.session` query returns data for the specific session token used in the request, not all sessions.

## Session revocation

### Single session

Delete a specific session by its token (used by the `auth.logout` mutation):

```typescript
await sessionService.deleteSession(token);
```

This removes the session from both KV and D1.

### All sessions for a user

Revoke all sessions for a user (used during password reset for security):

```typescript
const count = await sessionService.deleteAllSessions(userId);
```

This deletes all D1 rows for the user. KV entries expire naturally since we cannot reverse-lookup tokens from user IDs. For immediate KV invalidation in production, consider maintaining a `userId -> tokens[]` reverse index.

## Updating org context

When a user switches organizations, the session's `currentOrgId` is updated in both KV and D1:

```typescript
await sessionService.updateCurrentOrg(token, newOrgId);
```

## Configuration

```typescript
// cruz.config.ts
export default defineConfig({
  session: {
    ttlSeconds: 30 * 24 * 60 * 60,         // 30 days (default)
    refreshThresholdSeconds: 7 * 24 * 60 * 60, // 7 days (default)
  },
});
```

## Security considerations

- **Token hashing:** Raw tokens are never stored. Only SHA-256 hashes are persisted in D1, so a database leak does not compromise active sessions.
- **Metadata tracking:** User agent and IP address are recorded for audit purposes and can be used to detect suspicious activity.
- **Forced logout on password reset:** `AuthService.resetPassword()` calls `deleteAllSessions()` to invalidate all sessions, forcing re-authentication on all devices.
- **No token in URL:** Sessions are transmitted via `Authorization` header or `session` cookie, never in query parameters.
