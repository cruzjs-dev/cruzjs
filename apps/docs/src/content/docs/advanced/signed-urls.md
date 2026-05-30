---
title: Signed URLs
description: Generate tamper-proof time-limited URLs for file downloads, email confirmations, and one-click actions.
---

Signed URLs let you create links that expire after a set duration and cannot be tampered with. CruzJS uses HMAC-SHA256 via the Web Crypto API, so it works natively in Cloudflare Workers without Node.js dependencies.

## Signing a URL

Use `SignedUrlService` to append a cryptographic signature and expiry to any URL:

```typescript
import { SignedUrlService } from '@cruzjs/core';

@Injectable()
export class EmailVerificationService {
  constructor(
    @Inject(SignedUrlService) private readonly signedUrls: SignedUrlService,
  ) {}

  async sendVerificationEmail(user: User) {
    const link = await this.signedUrls.sign(
      `https://app.example.com/verify-email`,
      {
        expiresIn: '24h',
        payload: { userId: user.id, email: user.email },
      },
    );

    await this.emailService.send(user.email, 'Verify your email', { link });
  }
}
```

The resulting URL looks like:

```
https://app.example.com/verify-email?_expires=1734567890&_payload=%7B%22userId%22%3A%22...%22%7D&_signature=abc123...
```

## Verifying a URL

Call `verify()` to validate the signature and check expiry:

```typescript
export const loader = async (args: LoaderFunctionArgs) =>
  handleCruzLoader([args], async ({ request, container }) => {
    const signedUrls = container.resolve(SignedUrlService);
    const result = await signedUrls.verify(request.url);

    if (!result.valid) {
      if (result.expired) {
        throw new Response('This link has expired.', { status: 410 });
      }
      throw new Response('Invalid link.', { status: 403 });
    }

    // Access the embedded payload
    const { userId, email } = result.payload!;
    await userService.markEmailVerified(userId);

    return redirect('/dashboard');
  });
```

The `verify()` method returns:

```typescript
interface SignedUrlVerification {
  valid: boolean;
  expired?: boolean;                   // true when signature is valid but past expiry
  payload?: Record<string, string>;    // the embedded key-value data
  url?: string;                        // clean URL without signature params
}
```

For a simple boolean check, use `isValid()`:

```typescript
if (await signedUrls.isValid(request.url)) {
  // proceed
}
```

## Duration Formats

The `expiresIn` option accepts human-readable duration strings or a number of seconds:

| Format | Example | Meaning |
|--------|---------|---------|
| Seconds | `'30s'` | 30 seconds |
| Minutes | `'30m'` | 30 minutes |
| Hours | `'1h'`, `'24h'` | 1 hour, 24 hours |
| Days | `'7d'` | 7 days |
| Number | `3600` | 3600 seconds (1 hour) |

Default: `'1h'` if not specified.

## Common Use Cases

### Email Confirmation

```typescript
const link = await signedUrls.sign(
  'https://app.example.com/verify-email',
  { expiresIn: '24h', payload: { userId: user.id } },
);
```

### File Download

```typescript
const downloadUrl = await signedUrls.sign(
  `https://app.example.com/api/files/${fileId}/download`,
  { expiresIn: '30m' },
);
```

### One-Click Unsubscribe

```typescript
const unsubUrl = await signedUrls.sign(
  'https://app.example.com/unsubscribe',
  {
    expiresIn: '30d',
    payload: { email: user.email, listId: 'marketing' },
  },
);
```

### Password Reset

```typescript
const resetUrl = await signedUrls.sign(
  'https://app.example.com/reset-password',
  { expiresIn: '1h', payload: { userId: user.id } },
);
```

## Environment Setup

`SignedUrlService` requires a secret key for HMAC signing. Set one of these environment variables:

```bash
# Preferred: dedicated signing secret
SIGNED_URL_SECRET=your-random-secret-at-least-32-chars

# Fallback: the general application key
APP_KEY=your-app-key
```

The service checks `SIGNED_URL_SECRET` first, then falls back to `APP_KEY`. If neither is set, it throws an error at signing time.

## Security Notes

- Signatures use HMAC-SHA256 with timing-safe comparison to prevent timing attacks
- URL query parameters are sorted before signing for deterministic ordering
- Re-signing a URL automatically strips any existing `_signature`, `_expires`, and `_payload` params
- Signatures are encoded as URL-safe Base64 (no padding characters)
