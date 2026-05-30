---
title: Email Verification
description: Email verification flow with secure tokens, background email jobs, and the verifyEmail endpoint in CruzJS.
---

CruzJS requires email verification for password-based registrations. A verification token is generated during registration, a verification email is queued as a background job, and the `auth.verifyEmail` mutation completes the flow. OAuth users are auto-verified since providers confirm email ownership.

## Verification flow

### 1. Token generation (during registration)

When `AuthService.register()` is called, a 32-byte random token is generated and stored on the `authIdentity` row:

```typescript
const emailVerificationToken = crypto.randomBytes(32).toString('hex');

await db.insert(authIdentity).values({
  email: input.email.toLowerCase(),
  password: hashedPassword,
  emailVerificationToken, // stored as plain hex
  // ...
});
```

### 2. Verification email

A background job is queued with `HIGH` priority to send the verification email:

```typescript
await jobService.createJob({
  type: 'send-email',
  payload: {
    to: email,
    template: 'email-verification',
    data: {
      name: name || 'there',
      verificationUrl: `${APP_URL}/auth/verify-email/${token}`,
    },
  },
  priority: 'HIGH',
});
```

The email contains a link like `https://yourapp.com/auth/verify-email/abc123...`. The `email-verification` template is part of the app's email templates.

### 3. Verify email endpoint

When the user clicks the verification link, the frontend calls the `auth.verifyEmail` mutation:

```typescript
await trpc.auth.verifyEmail.mutate({
  token: 'abc123...', // from URL parameter
});
```

The `AuthService.verifyEmail()` method:
1. Looks up the `authIdentity` row by `emailVerificationToken`
2. Checks the email is not already verified
3. Sets `emailVerified` to the current ISO timestamp
4. Clears the `emailVerificationToken` field

```typescript
await db
  .update(authIdentity)
  .set({
    emailVerified: new Date().toISOString(),
    emailVerificationToken: null,
  })
  .where(eq(authIdentity.id, identity.id));
```

## Resending verification emails

To resend a verification email, you can create a tRPC endpoint that generates a new token and re-queues the email job:

```typescript
// Example: add to auth.router.ts
resendVerification: protectedProcedure.mutation(async ({ ctx }) => {
  const db = ctx.container.get<DrizzleDatabase>(DRIZZLE);
  const [identity] = await db
    .select()
    .from(authIdentity)
    .where(eq(authIdentity.id, ctx.session.user.id))
    .limit(1);

  if (identity.emailVerified) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Email already verified' });
  }

  // Generate new token
  const newToken = crypto.randomBytes(32).toString('hex');
  await db
    .update(authIdentity)
    .set({ emailVerificationToken: newToken })
    .where(eq(authIdentity.id, identity.id));

  // Queue email
  const jobService = ctx.container.get<JobService>(JobService);
  const configService = ctx.container.get<ConfigService>(ConfigService);
  const appUrl = configService.getOrThrow<string>('APP_URL');

  await jobService.createJob({
    type: 'send-email',
    payload: {
      to: identity.email,
      template: 'email-verification',
      data: {
        name: 'there',
        verificationUrl: `${appUrl}/auth/verify-email/${newToken}`,
      },
    },
    priority: 'HIGH',
  });

  return { success: true };
});
```

## Customizing the verification email

The email template is referenced by the string `'email-verification'` in the job payload. Customize it by modifying your app's email template handler. The template receives:

| Variable | Description |
|----------|-------------|
| `name` | User's name (or `'there'` if not provided) |
| `verificationUrl` | Full URL with token |

## Checking verification status

The `auth.session` query includes `emailVerified` in the user object:

```typescript
const { data } = trpc.auth.session.useQuery();

if (!data?.user.emailVerified) {
  // Show "Please verify your email" banner
}
```

`emailVerified` is `null` if unverified, or an ISO timestamp string of when verification occurred.

## OAuth users

Users who register via OAuth (Google, Facebook) have their `emailVerified` set immediately to the current timestamp during account creation, since the OAuth provider has already verified the email:

```typescript
const [newIdentity] = await tx
  .insert(authIdentity)
  .values({
    email: oauthUser.email,
    emailVerified: new Date().toISOString(), // auto-verified
  })
  .returning();
```

## Security notes

- Verification tokens are 32 bytes (64 hex characters), providing 256 bits of entropy.
- Tokens are stored as plain hex strings (not hashed) since they are single-use and cleared after verification.
- There is no expiry on verification tokens by default. To add expiry, you would need to add an `emailVerificationTokenExpiry` column and check it in `verifyEmail()`.
- Each registration generates a unique token, so there is no risk of token reuse across users.
