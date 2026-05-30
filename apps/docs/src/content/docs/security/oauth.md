---
title: Social Auth (OAuth)
description: OAuth 2.0 social login with 7 providers, account linking, and connected account management in CruzJS
---

CruzJS supports social authentication via the `SocialAuthModule`, which is included in `StartModule`. Seven providers are supported out of the box: GitHub, Google, Discord, Twitter (X), LinkedIn, Microsoft, and Apple.

## Setup

The `SocialAuthModule` is included in `StartModule`, so no additional registration is needed if you use `StartModule`:

```typescript
import { StartModule } from '@cruzjs/start/start.module';

export default createCruzApp({
  modules: [StartModule],
});
```

## Supported Providers

| Provider | PKCE | Env Vars Required |
|----------|------|-------------------|
| GitHub | No | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| Google | Yes | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Discord | No | `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` |
| Twitter (X) | Yes | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` |
| LinkedIn | No | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` |
| Microsoft | No | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |
| Apple | No | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` |

## Provider Configuration

Set environment variables for each provider you want to enable. Only providers with configured credentials will appear in the login UI.

```bash
# GitHub
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Google
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Discord
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Twitter (X)
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret

# LinkedIn
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Microsoft
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Apple
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

## Multi-Binding Pattern

Providers use the `OAUTH_PROVIDER` multi-injection token. Each provider is bound separately, and the framework collects all bindings at runtime:

```typescript
import { OAUTH_PROVIDER } from '@cruzjs/start/social-auth';

// In a custom module, you can add additional providers:
@Module({
  providers: [
    {
      provide: OAUTH_PROVIDER,
      useClass: CustomOAuthProvider,
      multi: true,
    },
  ],
})
export class CustomAuthModule {}
```

## OAuth Flow

### 1. Redirect to Provider

The user clicks a social login button, which redirects to:

```
/auth/:provider
```

For example, `/auth/github` redirects to GitHub's OAuth consent screen.

### 2. Provider Callback

After the user authorizes, the provider redirects back to:

```
/auth/:provider/callback
```

### 3. Callback Processing

The callback handler performs:

1. **CSRF validation** -- verifies the `state` parameter (nonce-based `OAuthState`)
2. **Code exchange** -- exchanges the authorization code for access tokens
3. **User info fetch** -- retrieves the user's email, name, and avatar from the provider
4. **Account resolution** -- one of three paths:
   - **Existing account:** Provider account already linked. Load the identity and update tokens.
   - **Email match:** No linked account, but an identity exists with the same email. Link the provider and set `accountLinked: true`.
   - **New user:** Create a new identity (email is auto-verified via OAuth), create the provider link, and dispatch `IdentityCreatedEvent`.
5. **Session creation** -- create a session and return the token

### Callback Result

```typescript
type SocialAuthResult = {
  user: { id: string; email: string; name: string; emailVerified: boolean };
  session: { token: string; expiresAt: string };
  isNewUser: boolean;
  accountLinked: boolean;
};
```

## OAuthState (CSRF Protection)

Each authorization URL includes a cryptographically random `state` nonce. The nonce is stored server-side with a short TTL and validated on callback. This prevents CSRF attacks where an attacker could trick a user into linking the attacker's OAuth account.

## Connected Accounts

Users can view and manage their connected social accounts.

### List Connected Accounts

```typescript
const { data } = trpc.socialAuth.getConnectedAccounts.useQuery();
// data: [{ provider: 'github', email: 'user@github.com', connectedAt: '...' }, ...]
```

### Disconnect an Account

```typescript
trpc.socialAuth.disconnectAccount.useMutation().mutate({
  provider: 'github',
});
```

:::caution
Users cannot disconnect their last authentication method. If they only have one connected provider and no password, the disconnect request will fail.
:::

## tRPC Procedures

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `socialAuth.getAvailableProviders` | query | Public | List configured providers |
| `socialAuth.getAuthUrl` | mutation | Public | Generate authorization URL for a provider |
| `socialAuth.getConnectedAccounts` | query | Protected | List connected OAuth accounts |
| `socialAuth.disconnectAccount` | mutation | Protected | Remove a connected OAuth provider |

## Example: Social Login Buttons

```typescript
function SocialLoginButtons() {
  const { data: providers } = trpc.socialAuth.getAvailableProviders.useQuery();

  return (
    <div className="flex flex-col gap-2">
      {providers?.map((provider) => (
        <a
          key={provider}
          href={`/auth/${provider}`}
          className="btn btn-outline"
        >
          Sign in with {provider.charAt(0).toUpperCase() + provider.slice(1)}
        </a>
      ))}
    </div>
  );
}
```

## Example: Connected Accounts Settings

```typescript
function ConnectedAccounts() {
  const { data: accounts } = trpc.socialAuth.getConnectedAccounts.useQuery();
  const { data: providers } = trpc.socialAuth.getAvailableProviders.useQuery();
  const disconnect = trpc.socialAuth.disconnectAccount.useMutation();

  const connected = new Set(accounts?.map((a) => a.provider));

  return (
    <div>
      <h3>Connected Accounts</h3>
      {providers?.map((provider) => (
        <div key={provider} className="flex items-center justify-between py-2">
          <span>{provider}</span>
          {connected.has(provider) ? (
            <button onClick={() => disconnect.mutate({ provider })}>
              Disconnect
            </button>
          ) : (
            <a href={`/auth/${provider}`}>Connect</a>
          )}
        </div>
      ))}
    </div>
  );
}
```
