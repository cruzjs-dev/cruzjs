# Social Auth (OAuth)

CruzJS provides built-in OAuth social login through `SocialAuthModule`, which is included in `StartModule`.

## Overview

Social auth enables users to sign in or sign up with third-party OAuth providers. The system supports both new user registration and linking additional social accounts to existing users.

Key files in `packages/start/src/social-auth/`:

| File | Purpose |
|------|---------|
| `social-auth.module.ts` | Module definition with service, tRPC router, API router, routes |
| `oauth.provider.ts` | `OAuthProvider` interface + `OAUTH_PROVIDER` DI token |
| `oauth.service.ts` | `SocialOAuthService` -- core OAuth logic |
| `social-auth.trpc.ts` | tRPC router for social auth operations |
| `social-auth.api-router.ts` | REST API routes for OAuth redirect and callback |
| `social-auth.routes.ts` | Page routes for `/auth/:provider` and `/auth/:provider/callback` |

## Supported Providers

| Provider | File | Required Env Vars |
|----------|------|-------------------|
| GitHub | `github.provider.ts` | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| Google | `google.provider.ts` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Discord | `discord.provider.ts` | `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` |
| Twitter | `twitter.provider.ts` | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` |
| LinkedIn | `linkedin.provider.ts` | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` |
| Microsoft | `microsoft.provider.ts` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |
| Apple | `apple.provider.ts` | `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`, `APPLE_TEAM_ID`, `APPLE_KEY_ID` |

## Provider Configuration

Providers are registered via multi-injection on the `OAUTH_PROVIDER` token. Each provider implements the `OAuthProvider` interface.

```typescript
import { Module } from '@cruzjs/core';
import {
  OAUTH_PROVIDER,
  GitHubProvider,
  GoogleProvider,
  DiscordProvider,
} from '@cruzjs/start/social-auth';

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
    {
      provide: OAUTH_PROVIDER,
      useFactory: () => new GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
      multi: true,
    },
    {
      provide: OAUTH_PROVIDER,
      useFactory: () => new DiscordProvider({
        clientId: process.env.DISCORD_CLIENT_ID!,
        clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      }),
      multi: true,
    },
  ],
})
class AppModule {}
```

The `multi: true` flag allows multiple providers to be registered under the same DI token.

## OAuth Flow

```
1. User clicks "Sign in with GitHub"
2. Client calls socialAuth.getAuthUrl({ provider: 'github' })
3. Server generates OAuthState (nonce + timestamp), stores it, returns auth URL
4. Browser redirects to /auth/github -> provider's OAuth consent screen
5. Provider redirects back to /auth/github/callback with authorization code
6. Server exchanges code for tokens via SocialOAuthService.handleCallback()
7. Server creates or finds user, creates session
8. User is redirected to the app (or the redirectTo from OAuthState)
```

### Handling New Users vs Existing Users

The `OAuthCallbackResult` tells you what happened:

```typescript
interface OAuthCallbackResult {
  user: User;           // The authenticated user
  session: SessionData; // New session
  isNewUser: boolean;   // true if a new account was created
  accountLinked: boolean; // true if a social account was linked to existing user
}
```

- **New user**: `isNewUser: true` -- A new user account was created from the OAuth profile.
- **Existing user, new provider**: `accountLinked: true` -- The social account was linked to an existing user (matched by email).
- **Returning user**: Both `false` -- The user signed in with a previously linked social account.

## Connected Accounts Management

Users can view and manage their linked social accounts.

### List Connected Accounts

```typescript
const { data } = trpc.socialAuth.getConnectedAccounts.useQuery();
// Returns: SocialAccountInfo[]
```

### Disconnect an Account

```typescript
const disconnect = trpc.socialAuth.disconnectAccount.useMutation();
await disconnect.mutateAsync({ provider: 'github' });
```

## tRPC Procedures

| Procedure | Auth | Input | Description |
|-----------|------|-------|-------------|
| `socialAuth.getAvailableProviders` | Public | None | Returns list of configured provider names |
| `socialAuth.getAuthUrl` | Protected | `{ provider, redirectTo? }` | Generates OAuth redirect URL with state |
| `socialAuth.getConnectedAccounts` | Protected | None | Lists user's linked social accounts |
| `socialAuth.disconnectAccount` | Protected | `{ provider }` | Unlinks a social account from user |

## REST API Routes

The `SocialAuthApiRouter` registers REST endpoints for the OAuth redirect flow:

- `GET /auth/:provider` -- Redirects to the OAuth provider's consent screen
- `GET /auth/:provider/callback` -- Handles the OAuth callback

These are REST routes (not tRPC) because OAuth providers redirect back to a URL, not a JSON API.

## CSRF Protection via OAuthState

Every OAuth flow generates an `OAuthState` object stored server-side:

```typescript
interface OAuthState {
  redirectTo?: string;  // Where to send user after auth
  userId?: string;      // If linking to existing user
  nonce: string;        // Random value for CSRF protection
  createdAt: number;    // Timestamp for expiry validation
}
```

The state is encoded and passed as the `state` parameter in the OAuth URL. On callback, the server validates:
1. The `nonce` matches the stored state
2. The `createdAt` is within the allowed time window

## TypeScript Types Reference

```typescript
// Provider identity
const SocialProvider = {
  GITHUB: 'github',
  GOOGLE: 'google',
  DISCORD: 'discord',
  TWITTER: 'twitter',
  LINKEDIN: 'linkedin',
  MICROSOFT: 'microsoft',
  APPLE: 'apple',
} as const;

// Profile returned by OAuth provider
interface OAuthUserProfile {
  providerId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  username?: string;
  raw?: Record<string, unknown>;
}

// Tokens from OAuth exchange
interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scopes?: string[];
}

// Result of handling the OAuth callback
interface OAuthCallbackResult {
  user: User;
  session: SessionData;
  isNewUser: boolean;
  accountLinked: boolean;
}

// Info about a linked social account
interface SocialAccountInfo {
  id: string;
  provider: string;
  providerUserId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  scopes: string[];
  createdAt: string;
  lastSyncedAt: string;
}
```

## SocialOAuthService Methods

The core service (`SocialOAuthService`) provides:

| Method | Description |
|--------|-------------|
| `getAuthUrl(provider, options?)` | Generate OAuth redirect URL with state |
| `handleCallback(provider, code, state)` | Exchange code for tokens, create/find user |
| `getConnectedAccounts(userId)` | List linked social accounts |
| `disconnectAccount(userId, provider)` | Unlink a social account |
| `getAvailableProviders()` | List configured provider names |
