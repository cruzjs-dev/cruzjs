---
title: Password Reset
description: Secure password reset flow with expiring tokens, background email jobs, and forced session revocation in CruzJS.
---

CruzJS provides a two-step password reset flow: request a reset (sends an email with a token link) and complete the reset (validates the token, updates the password, and revokes all sessions).

## Request password reset

The `auth.requestPasswordReset` mutation accepts an email address and queues a reset email. It intentionally does not reveal whether the email exists:

```typescript
const result = await trpc.auth.requestPasswordReset.mutate({
  email: 'user@example.com',
});

// Always returns the same response regardless of whether the email exists
// result.message -- "If an account exists, a password reset email has been sent"
```

### What happens server-side

`AuthService.requestPasswordReset()`:

1. Looks up the `authIdentity` by email. If not found, returns silently (no error).
2. Generates a 32-byte random token.
3. Calculates an expiry timestamp (default: 24 hours from now, configurable via `config.auth.passwordResetTokenExpiryHours`).
4. Stores the token and expiry on the `authIdentity` row:

```typescript
await db
  .update(authIdentity)
  .set({
    passwordResetToken: token,
    passwordResetExpiry: expiresAt, // ISO string
  })
  .where(eq(authIdentity.id, identity.id));
```

5. Queues a `send-email` job with `HIGH` priority:

```typescript
await jobService.createJob({
  type: 'send-email',
  payload: {
    to: email,
    template: 'password-reset',
    data: {
      name: name || 'there',
      resetUrl: `${APP_URL}/auth/reset-password/${token}`,
    },
  },
  priority: 'HIGH',
});
```

## Reset password

The `auth.resetPassword` mutation validates the token, updates the password, and revokes all sessions:

```typescript
const result = await trpc.auth.resetPassword.mutate({
  token: 'abc123...', // from URL parameter
  newPassword: 'NewSecure1',
});
// result.message -- "Password reset successfully"
```

### What happens server-side

`AuthService.resetPassword()`:

1. Looks up the `authIdentity` by `passwordResetToken`. Throws if not found.
2. Checks the `passwordResetExpiry` against the current time. Throws if expired.
3. Validates password strength (min 8 chars, uppercase, lowercase, number).
4. Hashes the new password with bcrypt.
5. Updates the identity:

```typescript
await db
  .update(authIdentity)
  .set({
    password: hashedPassword,
    passwordResetToken: null,   // clear token (one-time use)
    passwordResetExpiry: null,  // clear expiry
  })
  .where(eq(authIdentity.id, identity.id));
```

6. Revokes all sessions for security:

```typescript
await sessionService.deleteAllSessions(identity.id);
```

This forces the user to re-authenticate on all devices after a password change.

## Token expiry

The reset token expiry is configurable:

```typescript
// cruz.config.ts
export default defineConfig({
  auth: {
    passwordResetTokenExpiryHours: 48, // default: 24
  },
});
```

Expired tokens are rejected during the reset step. Each new reset request overwrites any existing token, so only the most recent token is valid.

## Customizing the reset email

The `password-reset` email template receives:

| Variable | Description |
|----------|-------------|
| `name` | User's name (or `'there'` if not available) |
| `resetUrl` | Full URL with token: `{APP_URL}/auth/reset-password/{token}` |

## Frontend integration

A typical password reset page:

```tsx
// routes/auth/reset-password/$token.tsx
import { useParams } from 'react-router';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const resetMutation = trpc.auth.resetPassword.useMutation();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    resetMutation.mutate({
      token: token!,
      newPassword: formData.get('password') as string,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="password" type="password" placeholder="New password" required />
      <button type="submit" disabled={resetMutation.isPending}>
        Reset Password
      </button>
      {resetMutation.isSuccess && <p>Password reset. Please log in.</p>}
      {resetMutation.error && <p>{resetMutation.error.message}</p>}
    </form>
  );
}
```

## Security considerations

- **No email enumeration:** `requestPasswordReset` returns the same response whether the email exists or not.
- **Token entropy:** 32 bytes (256 bits) of randomness from `crypto.randomBytes`.
- **One-time use:** The token is cleared after a successful reset.
- **Session revocation:** All active sessions are destroyed on password reset, preventing an attacker who has the old password from maintaining access.
- **Password strength:** The new password must meet the same strength requirements as registration (8+ chars, uppercase, lowercase, number).
- **Latest token wins:** Requesting a new reset invalidates any previous token for the same account.
