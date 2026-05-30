# Signed URLs

`SignedUrlService` generates tamper-proof, time-limited URLs using HMAC-SHA256 via the Web Crypto API. Works in Cloudflare Workers (no Node.js crypto needed).

Located at `packages/core/src/shared/signed-urls/signed-url.service.ts`.

## SignedUrlService

Decorated with `@Injectable()`. Requires `SIGNED_URL_SECRET` or `APP_KEY` environment variable.

### sign(url, options?)

Appends `_signature`, `_expires`, and optionally `_payload` query params to the URL.

```typescript
const signedUrl = await signedUrlService.sign(
  'https://app.example.com/verify-email',
  {
    expiresIn: '24h',
    payload: { userId: 'usr_123', email: 'user@example.com' },
  },
);
// https://app.example.com/verify-email?_expires=1234567890&_payload=...&_signature=...
```

### SignedUrlOptions

```typescript
interface SignedUrlOptions {
  expiresIn?: string | number;  // Default: '1h'
  payload?: Record<string, string>;
}
```

**Duration formats:** `'30s'`, `'30m'`, `'1h'`, `'24h'`, `'7d'`, or a number (seconds).

### verify(url)

Returns a `SignedUrlVerification` object:

```typescript
const result = await signedUrlService.verify(url);
// { valid: true, payload: { userId: 'usr_123', email: '...' }, url: 'https://...' }
// or { valid: false, expired: true }
// or { valid: false }
```

```typescript
interface SignedUrlVerification {
  valid: boolean;
  expired?: boolean;
  payload?: Record<string, string>;
  url?: string;  // Clean URL without signature params
}
```

### isValid(url)

Convenience -- returns `true` if the signed URL is currently valid:

```typescript
if (await signedUrlService.isValid(url)) {
  // proceed
}
```

## Examples

### Email Verification Link

```typescript
// In action: generate and send
const link = await signedUrlService.sign(
  `https://app.example.com/verify-email`,
  { expiresIn: '24h', payload: { userId: user.id } },
);
await emailService.send(user.email, 'Verify your email', { link });

// In verification route:
const result = await signedUrlService.verify(request.url);
if (!result.valid) {
  if (result.expired) throw new Error('Link expired');
  throw new Error('Invalid link');
}
const { userId } = result.payload!;
await userService.markEmailVerified(userId);
```

### File Download

```typescript
const downloadUrl = await signedUrlService.sign(
  `https://app.example.com/api/files/${fileId}/download`,
  { expiresIn: '30m' },
);
```

## Security Details

- HMAC-SHA256 signature with timing-safe comparison
- URL params are sorted before signing for deterministic ordering
- Re-signing a URL strips existing signature params first
- Signature stored as URL-safe Base64 (no padding)
