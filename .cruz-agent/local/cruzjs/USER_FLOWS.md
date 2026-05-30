# Social Auth Enhancement - How to Test

## Unit Tests
```bash
cruz test -- --run packages/start/src/social-auth/__tests__/social-auth.test.ts
```

Tests cover:
- All 7 provider auth URL generation (GitHub, Google, Discord, Twitter, LinkedIn, Microsoft, Apple)
- Provider PKCE requirements (Google, Twitter, Microsoft require it; GitHub, Discord, LinkedIn do not)
- PKCE code verifier/challenge generation and determinism
- CSRF state generation, validation, and constant-time comparison
- OAuthState encode/decode round-trip with expiry enforcement (10-minute max)
- GitHub exchangeCode: error handling (non-OK, error field) and success path (mock fetch)
- Google getUserProfile: email + name extraction (mock fetch)
- Discord getUserProfile: username extraction + avatar URL construction (mock fetch)
- GitHub getUserProfile: username (login) extraction (mock fetch)
- Provider registry: register/get/list with all 7 providers

## E2E Tests
```bash
cruz test:e2e -- tests/e2e/tests/social-auth.spec.ts
```

Tests cover:
- `socialAuth.getAvailableProviders` tRPC endpoint returns provider list
- `socialAuth.getAuthUrl` returns auth URL for configured provider
- `socialAuth.getAuthUrl` returns error for unknown provider
- `socialAuth.listConnections` requires authentication
- `socialAuth.disconnect` requires authentication
- `socialAuth.syncAccount` requires authentication
- Page routes: `/auth/github`, `/auth/google`, `/auth/github/callback` -- no 500s
- REST API: `/api/auth/social/nonexistent` returns 400
- REST API: `/api/auth/social/github/callback` without code redirects to error
- REST API: callback with error param redirects to login

## Manual Testing

1. **Register a GitHub OAuth app** at https://github.com/settings/developers
2. **Configure the provider** in your app module:
   ```ts
   @Module({
     providers: [{
       provide: OAUTH_PROVIDER,
       useFactory: () => new GitHubProvider({ clientId: '...', clientSecret: '...' }),
       multi: true,
     }],
   })
   ```
3. Navigate to `/auth/github` -- should redirect to GitHub authorization page
4. After authorization, callback at `/auth/github/callback` creates session and redirects to dashboard
5. Visit settings page -- `socialAuth.listConnections` shows the linked GitHub account
6. Click "Sync" -- `socialAuth.syncAccount` refreshes profile data from GitHub
7. Click "Disconnect" -- `socialAuth.disconnect` removes the connection

---

# Two-Factor Authentication - How to Test

## Unit Tests
```bash
npx vitest run packages/core/src/two-factor/__tests__/two-factor.test.ts --reporter=verbose
```
All 31 tests should pass, covering:
- TOTP secret generation (base32, unique, correct length)
- TOTP code generation and verification (valid, invalid, clock skew)
- otpauth URI generation
- Base32 encode/decode
- Timing-safe string comparison
- Backup code hashing (SHA-256)
- Secret encryption/decryption round-trip
- Enforcement middleware behavior

## Manual Testing Flow

### 1. Register the Module

```typescript
// server.cloudflare.ts
import { createCruzApp, TwoFactorModule } from '@cruzjs/core';

export default createCruzApp({
  schema,
  modules: [StartModule, TwoFactorModule],
  pages: () => import('virtual:react-router/server-build'),
});
```

### 2. Setup TOTP

```typescript
// Begin setup - returns secret and QR code URI
const setup = await trpc.twoFactor.setupTOTP.mutate();
// Display QR code from setup.qrCodeUri
// Show setup.secret as manual entry fallback
```

### 3. Verify Setup

```typescript
// User enters 6-digit code from authenticator app
const result = await trpc.twoFactor.verifySetup.mutate({ code: '123456' });
// result.backupCodes contains 10 backup codes - save them!
```

### 4. Check Status

```typescript
const status = await trpc.twoFactor.getStatus.query();
// { enabled: true, methods: ['totp'] }
```

### 5. Manage Trusted Devices

```typescript
const devices = await trpc.twoFactor.listTrustedDevices.query();
await trpc.twoFactor.revokeTrustedDevice.mutate({ deviceId: 'device-id' });
```

### 6. Regenerate Backup Codes

```typescript
const newCodes = await trpc.twoFactor.generateBackupCodes.mutate();
```

### 7. Disable 2FA

```typescript
await trpc.twoFactor.disable.mutate({ method: 'totp' }); // specific method
await trpc.twoFactor.disable.mutate({}); // all methods
```

### 8. Enforcement Middleware

```typescript
import { twoFactorMiddleware } from '@cruzjs/core';

const require2FA = twoFactorMiddleware({ required: true, allowedMethods: ['totp'] });

@Route() sensitiveAction = orgProcedure
  .use(require2FA)
  .mutation(async ({ ctx }) => { ... });
```

---

# Social OAuth - How to Test

## Unit Tests
```bash
npx vitest run packages/start/src/social-auth/__tests__/social-auth.test.ts --reporter=verbose
```

All 33 tests should pass, covering:
- All 7 provider implementations (URL generation, scopes, names)
- State management (generateState, validateState)
- PKCE (generateCodeVerifier, generateCodeChallenge)
- Provider registry logic

## Manual Testing

### 1. Register a provider in your app module
```typescript
// apps/web/src/features/my-app/my-app.module.ts
import { Module } from '@cruzjs/core/di';
import { OAUTH_PROVIDER, GitHubProvider } from '@cruzjs/start/social-auth';

@Module({
  providers: [
    {
      provide: OAUTH_PROVIDER,
      useFactory: () => new GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      }),
      multi: true,
    },
  ],
})
export class MyAppModule {}
```

### 2. Test the OAuth flow
1. Navigate to `/auth/github`
2. You should be redirected to GitHub's authorization page
3. After authorizing, you should be redirected back to `/auth/github/callback`
4. On success, you should be redirected to `/dashboard` (or `/profile/settings` for new users)

### 3. Test connection management
- Call `trpc.socialAuth.listConnections` to see connected accounts
- Call `trpc.socialAuth.disconnect` to remove a connection
- Call `trpc.socialAuth.getAvailableProviders` to see configured providers

---

# Webhooks - How to Test

## Unit Tests
```bash
npx vitest run packages/core/src/webhooks/__tests__/webhook.test.ts
```
All 23 tests should pass.

## Manual Testing Flow

### 1. Register the Module

```typescript
// server.cloudflare.ts
import { createCruzApp, WebhookModule } from '@cruzjs/core';

export default createCruzApp({
  schema,
  modules: [StartModule, WebhookModule],
  pages: () => import('virtual:react-router/server-build'),
});
```

### 2. Create a Webhook

```typescript
const webhook = await trpc.webhooks.create.mutate({
  url: 'https://your-endpoint.com/hook',
  events: ['user.created', 'org.updated'],
  description: 'My first webhook',
});
// Returns webhook with auto-generated secret
```

### 3. List Webhooks

```typescript
const webhooks = await trpc.webhooks.list.query();
```

### 4. Test Connectivity

```typescript
await trpc.webhooks.test.mutate({ id: webhook.id });
// Dispatches a 'webhook.test' event to the webhook
```

### 5. View Deliveries

```typescript
const deliveries = await trpc.webhooks.deliveries.query({
  webhookId: webhook.id,
  limit: 20,
  status: 'failed', // optional filter
});
```

### 6. Redeliver a Failed Delivery

```typescript
await trpc.webhooks.redeliver.mutate({ deliveryId: 'delivery-id' });
```

### 7. Update or Deactivate

```typescript
await trpc.webhooks.update.mutate({
  id: webhook.id,
  data: { isActive: false },
});
```

### 8. Dispatch from Service Code

```typescript
// In any service:
const webhookService = container.resolve(WebhookService);
await webhookService.dispatch(orgId, 'order.placed', { orderId: '123', total: 99.99 });
```

### 9. Verify Incoming Webhooks

```typescript
import { verifyWebhookRequest } from '@cruzjs/core';

// In a route handler:
const { verified, payload } = await verifyWebhookRequest(request, 'shared-secret');
if (!verified) {
  return new Response('Invalid signature', { status: 401 });
}
```

---

# Maintenance Mode - How to Test

## Unit Tests
```bash
npx vitest run packages/core/src/maintenance/__tests__/maintenance.test.ts
```
All 25 tests should pass.

## Manual Testing Flow

### 1. Register the Module

```typescript
// server.cloudflare.ts
import { createCruzApp, MaintenanceModule } from '@cruzjs/core';

export default createCruzApp({
  schema,
  modules: [StartModule, MaintenanceModule],
  pages: () => import('virtual:react-router/server-build'),
  maintenanceMode: true, // enables the fetch-level middleware
});
```

### 2. Enable Maintenance Mode via tRPC

```typescript
// From an admin UI or API call:
const result = await trpc.maintenance.enable.mutate({
  message: 'We are upgrading the database. Back in 30 minutes.',
  retryAfter: 1800,
  secret: 'my-bypass-secret-123',
});
```

### 3. Verify 503 Response

Visit any page (e.g., `/dashboard`). You should get:
- HTTP 503
- `Retry-After: 1800` header
- JSON body: `{ "error": "Service Unavailable", "message": "...", "retryAfter": 1800 }`

### 4. Bypass with Secret

Visit `https://your-app.com/dashboard?bypass=my-bypass-secret-123`
- Should serve normally
- Sets an httpOnly cookie `maintenance_bypass` for future requests

### 5. Check Status (Public)

```typescript
const status = await trpc.maintenance.status.query();
// { active: true, message: '...', retryAfter: 1800, enabledAt: '...' }
```

### 6. Excluded Paths

These always work during maintenance:
- `/api/health`
- `/api/trpc/maintenance.status`
- `/api/trpc/maintenance.enable`
- `/api/trpc/maintenance.disable`

Custom exclusions via config:
```typescript
maintenanceMode: { excludePaths: ['/api/admin/*'] },
```

### 7. Disable Maintenance Mode

```typescript
await trpc.maintenance.disable.mutate();
```

---

# Rate Limiting - How to Test

## Unit Tests
```bash
npx vitest run packages/core/src/rate-limiting/__tests__/rate-limit.test.ts
```
All 26 tests should pass.

## Manual Testing Flow

### 1. Basic Rate Limiting in a tRPC Router

```typescript
import { RateLimitService, rateLimitMiddleware, protectedProcedure, router } from '@cruzjs/core';

// In your module's boot or service initialization:
const rateLimitService = container.resolve(RateLimitService);
rateLimitService.defineLimiter('api', { limit: 100, windowSeconds: 60 });
rateLimitService.defineLimiter('auth', { limit: 5, windowSeconds: 900 });

// In your tRPC router:
const rateLimited = rateLimitMiddleware(rateLimitService, 'api');

export const myRouter = router({
  list: protectedProcedure
    .use(rateLimited)
    .query(async ({ ctx }) => { ... }),
});
```

### 2. Per-User Rate Limiting

```typescript
const userRateLimited = rateLimitMiddleware(
  rateLimitService,
  'api',
  (ctx) => RateLimitService.keyFromUser(ctx.session.user.id),
);
```

### 3. @RateLimit Decorator (OOP Router Style)

```typescript
import { Router, Route, TrpcRouter, RateLimit, Inject, RateLimitService } from '@cruzjs/core';

@Router()
export class PostsRouter extends TrpcRouter {
  @Inject(RateLimitService) private rateLimitService!: RateLimitService;

  @RateLimit({ name: 'api' })
  @Route() list = publicProcedure.query(async () => { ... });
}
```

### 4. Using the Module

```typescript
import { RateLimitModule } from '@cruzjs/core';

// In createCruzApp:
export default createCruzApp({
  schema,
  modules: [StartModule, RateLimitModule, MyFeatureModule],
  pages: () => import('virtual:react-router/server-build'),
});
```
