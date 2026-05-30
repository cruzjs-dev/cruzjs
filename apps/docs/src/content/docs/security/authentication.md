---
title: Authentication
description: Session-based authentication with JWT access tokens, refresh tokens, and password-based login in CruzJS.
---

CruzJS provides a complete authentication system built on HttpOnly cookie-based sessions, with JWT access tokens available for mobile/non-browser API clients. The `AuthService` in `@cruzjs/core` handles registration, login, email verification, and password reset flows.

## How auth works (read this first)

**Browser apps use HttpOnly cookies. Period.**

When a user logs in or registers:

1. Server validates credentials, creates a session, returns the user data.
2. Server response includes `Set-Cookie: auth_token=<token>; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000` (and `Secure` in production).
3. Browser stores the cookie. **JavaScript cannot read it** — XSS attacks cannot steal the token.
4. Every subsequent request to the same origin includes the cookie automatically. No client code is required to attach it.

This means:

- ✅ You do **not** need to call `storeSessionToken()`. Server already set the cookie.
- ✅ You do **not** need to read tokens from `localStorage`. They are not there.
- ✅ You do **not** need to add an `Authorization: Bearer` header. The cookie travels automatically.
- ✅ tRPC mutations (`trpc.auth.login.useMutation()`) just work — `httpBatchLink` uses `fetch` which sends same-origin cookies by default.

**Cookie attributes:**

| Attribute | Value | Why |
|-----------|-------|-----|
| `HttpOnly` | always | JavaScript cannot read → XSS cannot exfiltrate the token |
| `SameSite=Lax` | always | CSRF protection — cookie not sent on cross-site form posts, but works for top-level navigation |
| `Secure` | production only | Cookie only sent over HTTPS in prod (skipped in dev so HTTP localhost works) |
| `Path=/` | always | Cookie sent on every request to your origin |
| `Max-Age=2592000` | configurable | Matches `config.session.ttlSeconds` (default 30 days) |

**Server-side session validation** reads the cookie automatically — `protectedProcedure` and `orgProcedure` in tRPC have `ctx.session.user.id` populated for you. No middleware to wire up.

## Optional: JWT access tokens for non-browser clients

For mobile apps, CLI tools, or third-party API clients that can't use cookies, the `auth.refreshToken` mutation issues short-lived JWT access tokens. The `extractToken` helper accepts both `Authorization: Bearer <jwt>` and the `auth_token` cookie, so both work in parallel.

All session and refresh tokens are generated with `crypto.randomBytes(32)` and SHA-256 hashed before database storage. JWTs are signed with the `JWT_SECRET` environment variable.

## Registration flow

The `auth.register` tRPC mutation creates a new identity, dispatches an `IdentityCreatedEvent` (which your app listens to for creating a user profile), queues a verification email, and returns a session.

```typescript
// Client-side registration — server sets HttpOnly cookie automatically
const result = await trpc.auth.register.mutate({
  email: 'user@example.com',
  password: 'SecurePass1',
  name: 'Jane Doe',
});

// result.user.id -- the new user's identity ID
// result.session.token -- IGNORE THIS in browser code. Cookie already set.
//                         Only used by non-browser clients (mobile, CLI).
```

**Password requirements:** Minimum 8 characters, at least one uppercase letter, one lowercase letter, and one number. Passwords are hashed with bcrypt (configurable rounds via `config.auth.bcryptRounds`, default 10).

### Gated registration with invite codes

Set the `REGISTRATION_INVITE_CODE` environment variable to require an invite code during registration. When set, the `inviteCode` field in the registration input must match:

```typescript
const result = await trpc.auth.register.mutate({
  email: 'user@example.com',
  password: 'SecurePass1',
  name: 'Jane Doe',
  inviteCode: 'my-secret-code', // must match REGISTRATION_INVITE_CODE
});
```

If `REGISTRATION_INVITE_CODE` is not set, registration is open to everyone.

## Login flow

The `auth.login` mutation validates credentials and creates a new session:

```typescript
const result = await trpc.auth.login.mutate({
  email: 'user@example.com',
  password: 'SecurePass1',
});

// HttpOnly auth_token cookie set automatically by server. Done.
// result.user            -- { id, email, name, emailVerified }
// result.session.expiresAt -- ISO string expiry timestamp
// result.session.token   -- IGNORE in browser code. Only for non-browser clients.
```

Login checks:
- Identity exists with matching email
- Account is not banned (`isBanned` flag)
- Identity has a password (OAuth-only accounts cannot use password login)
- Password matches bcrypt hash

## Session creation

On both registration and login, `SessionService.createSession()` is called:

```typescript
const session = await sessionService.createSession({
  userId: identity.id,
  currentOrgId: null, // org context set later by Pro layer
  userAgent,          // from request headers
  ipAddress,          // from x-forwarded-for
});
```

The session token is stored in KV for fast access and in D1 for persistence. The raw token is returned to the client; only the SHA-256 hash is stored server-side.

## JWT access tokens

For stateless API authentication, use the `auth.refreshToken` mutation to exchange a refresh token for a short-lived JWT:

```typescript
const tokens = await trpc.auth.refreshToken.mutate({
  refreshToken: storedRefreshToken,
});

// tokens.accessToken -- JWT, 15-minute expiry
// tokens.refreshToken -- new refresh token (rotation)
// tokens.expiresIn -- 900 (seconds)
```

The JWT payload contains `{ userId, exp, iat }` and is signed with the `JWT_SECRET` environment variable. On each refresh, the old refresh token is revoked and a new one is issued (token rotation).

### Verifying access tokens

```typescript
import { TokenService } from '@cruzjs/core/auth/token.service';

const tokenService = container.get<TokenService>(TokenService);
const payload = tokenService.verifyAccessToken(jwt);
// payload.userId -- the authenticated user ID
// Returns null if token is invalid or expired
```

## Auth router endpoints

All auth endpoints are tRPC mutations/queries on the `auth` router:

| Endpoint | Type | Auth | Description |
|----------|------|------|-------------|
| `auth.register` | mutation | public | Create account, returns session |
| `auth.login` | mutation | public | Authenticate, returns session |
| `auth.logout` | mutation | protected | Destroy current session |
| `auth.session` | query | protected | Get current session + user + orgs |
| `auth.verifyEmail` | mutation | public | Verify email with token |
| `auth.requestPasswordReset` | mutation | public | Send password reset email |
| `auth.resetPassword` | mutation | public | Reset password with token |
| `auth.refreshToken` | mutation | public | Exchange refresh token for new JWT |

## Logout

The `auth.logout` mutation extracts the session token (from cookie or `Authorization` header), deletes the session from KV and D1, and clears the `auth_token` cookie via `Set-Cookie: auth_token=; Max-Age=0`.

```typescript
// Browser — server clears cookie automatically
await trpc.auth.logout.mutate();
// Then redirect to login
navigate('/auth/login');
```

After logout the cookie is gone. Next request has no auth — `protectedProcedure` returns `UNAUTHORIZED`.

## Session query

The `auth.session` query returns the full authenticated context including user profile data, current org, and all org memberships with roles:

```typescript
const data = await trpc.auth.session.query();

// data.user -- { id, email, name, emailVerified, avatarUrl, createdAt }
// data.session -- { userId, currentOrgId, expiresAt }
// data.organizations -- [{ id, name, slug, avatarUrl, role, isCurrent }]
```

This endpoint also triggers session refresh if the session is within the refresh threshold (7 days remaining by default).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret key for signing JWT access tokens |
| `APP_URL` | Yes | Base URL for verification/reset email links |
| `REGISTRATION_INVITE_CODE` | No | If set, required during registration |

## Security FAQ / common mistakes

### "How do I get the auth token in my React code?"

You don't. The token is in an HttpOnly cookie — JavaScript cannot read it. That's the point. To check if a user is authenticated, use `trpc.auth.session.useQuery()` or the `useAuth()` hook. To make API calls, just call `trpc.X.useQuery()` / `useMutation()` — the cookie travels automatically.

### "Why can't I read `document.cookie`?"

The `auth_token` cookie has the `HttpOnly` flag, which tells the browser to hide it from JavaScript. This is intentional. An XSS attack can inject arbitrary `<script>` tags into your page, but those scripts cannot steal a token they cannot read.

### "I have a legacy `localStorage.auth_token` — what do I do?"

Delete it. Older CruzJS versions wrote tokens to `localStorage`. The server now ignores any value there. Clean up old state with:

```typescript
import { clearSessionToken } from '@cruzjs/core/auth/auth-client';
clearSessionToken(); // removes localStorage.auth_token if present
```

### "What about CSRF?"

The `SameSite=Lax` cookie attribute prevents the browser from sending the cookie on most cross-site requests (e.g. a malicious form on `evil.com` POSTing to your `/api/trpc/...`). For state-changing endpoints called from top-level navigation, add a CSRF token. The built-in `auth.logout` mutation is safe because `SameSite=Lax` blocks cross-site POSTs.

### "How does this work with mobile apps?"

Mobile apps can't use cookies easily. Use the JWT access token flow (`auth.refreshToken`) and send tokens via `Authorization: Bearer <jwt>`. The server's session middleware accepts both cookies and Bearer tokens, so both work in parallel.

### "How do I do auth in a server-side loader?"

You don't usually need to. Page-level auth checks should use the client-side `useAuth()` hook with a `useEffect` redirect — see `@cruzjs/start/pages/DashboardPage.tsx` for the pattern. For API endpoints, use tRPC `protectedProcedure` — `ctx.session.user.id` is populated from the cookie automatically.

If you absolutely need it in a loader, the cookie comes with the request:

```typescript
export async function loader({ request, context }: Route.LoaderArgs) {
  // The auth_token cookie is in request.headers — call tRPC server-side
  // or use the session middleware exposed in @cruzjs/core.
}
```

### "Can I customize the cookie name or attributes?"

Not yet via config — currently the cookie name is hardcoded to `auth_token`. If you need to change it, fork `auth.trpc.ts`. PRs welcome.

## Configuration

Session and auth settings can be customized in `cruz.config.ts`:

```typescript
export default defineConfig({
  auth: {
    bcryptRounds: 12,               // default: 10
    passwordResetTokenExpiryHours: 48, // default: 24
  },
  session: {
    ttlSeconds: 60 * 24 * 60 * 60,         // 60 days, default: 30 days
    refreshThresholdSeconds: 14 * 24 * 60 * 60, // 14 days, default: 7 days
  },
});
```
