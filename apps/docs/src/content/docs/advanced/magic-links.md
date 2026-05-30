---
title: Magic Links
description: Passwordless authentication via time-limited email links in CruzJS
---

CruzJS supports passwordless authentication through magic links -- users enter their email, receive a link, and click it to sign in. No password required.

## Setup

Register the `MagicLinkModule` in your application:

```typescript
import { MagicLinkModule } from '@cruzjs/core/magic-link';

export default createCruzApp({
  modules: [MagicLinkModule],
});
```

## How It Works

```
User enters email
       |
       v
magicLink.request  -->  Generate token  -->  Send email with link
       |
       v
User clicks link
       |
       v
magicLink.verify  -->  Validate token  -->  Create session  -->  Redirect
```

1. User submits their email via `magicLink.request`
2. A cryptographically random token is generated and hashed for storage
3. An email is sent with a link containing the raw token
4. User clicks the link, which calls `magicLink.verify`
5. The token is validated, a session is created, and the user is authenticated

## Token Security

- **Cryptographically random:** Tokens are generated using secure random bytes
- **Hashed storage:** Only the SHA-256 hash is stored in the database; the raw token exists only in the email link
- **Time-limited:** Tokens expire after 15 minutes by default (configurable)
- **Single-use:** Tokens are deleted after successful verification

## No Enumeration

The `magicLink.request` procedure always returns a success response, regardless of whether the email exists in the system. This prevents attackers from probing for valid email addresses.

```typescript
// Always returns { success: true } -- even for unknown emails
trpc.magicLink.request.useMutation().mutate({
  email: 'user@example.com',
});
```

If the email does not match an existing account, no email is sent, but the response is identical.

## tRPC Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `magicLink.request` | mutation | Public | Request a magic link for an email address |
| `magicLink.verify` | mutation | Public | Verify a token and create a session |

### Request

```typescript
trpc.magicLink.request.useMutation().mutate({
  email: 'user@example.com',
});
// Response: { success: true }
```

### Verify

```typescript
const result = trpc.magicLink.verify.useMutation().mutate({
  token: 'abc123...',
});
// result: { token: 'session-token', expiresAt: '2025-04-15T...' }
```

The returned `token` is a session token that should be stored (cookie or local storage) for subsequent authenticated requests.

## Configuration

Customize the token TTL in your module setup:

```typescript
import { MagicLinkModule } from '@cruzjs/core/magic-link';

// Default: 15 minutes
// The module uses the framework's token TTL configuration
```

## Email Template

The magic link email is sent via the framework's `EmailService`. The default template includes:

- App name and logo
- A prominent "Sign In" button with the magic link
- A plain-text fallback URL
- An expiration notice

## Integration with Auth Pages

Add a "Sign in with email link" option alongside your existing login form:

```typescript
function LoginPage() {
  const [mode, setMode] = useState<'password' | 'magic-link'>('password');
  const requestMagicLink = trpc.magicLink.request.useMutation();

  if (mode === 'magic-link') {
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        const email = new FormData(e.currentTarget).get('email') as string;
        requestMagicLink.mutate({ email });
      }}>
        <input type="email" name="email" placeholder="Email address" required />
        <button type="submit">Send magic link</button>
        {requestMagicLink.isSuccess && (
          <p>Check your email for a sign-in link.</p>
        )}
        <button type="button" onClick={() => setMode('password')}>
          Use password instead
        </button>
      </form>
    );
  }

  return (
    <div>
      <PasswordLoginForm />
      <button type="button" onClick={() => setMode('magic-link')}>
        Sign in with email link
      </button>
    </div>
  );
}
```

## Callback Page

Create a route to handle the magic link callback:

```typescript
// features/auth/routes/magic-link-verify.tsx
import { useSearchParams, useNavigate } from 'react-router';

export default function MagicLinkVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const verify = trpc.magicLink.verify.useMutation({
    onSuccess: (data) => {
      // Store session token
      document.cookie = `session=${data.token}; path=/; max-age=${60 * 60 * 24 * 30}`;
      navigate('/dashboard');
    },
  });

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verify.mutate({ token });
    }
  }, [searchParams]);

  if (verify.isLoading) return <p>Signing you in...</p>;
  if (verify.isError) return <p>This link has expired. Please request a new one.</p>;

  return null;
}
```
