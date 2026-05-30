/**
 * Twitter/X OAuth 2.0 Provider with PKCE
 *
 * Implements OAuth 2.0 with PKCE for Twitter/X.
 * https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code
 *
 * Note: Twitter requires PKCE (code_verifier/code_challenge) for OAuth 2.0.
 */

import type { OAuthProvider } from '../oauth.provider';
import type { OAuthUserProfile, OAuthTokens, OAuthProviderConfig } from '../social-auth.types';

export class TwitterProvider implements OAuthProvider {
  readonly name = 'twitter';
  readonly scopes = ['tweet.read', 'users.read', 'offline.access'];
  readonly requiresPkce = true;

  constructor(private readonly config: OAuthProviderConfig) {}

  getAuthUrl(state: string, redirectUri: string, codeChallenge?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      state,
      code_challenge_method: 'S256',
    });

    if (codeChallenge) {
      params.set('code_challenge', codeChallenge);
    }

    return `https://twitter.com/i/oauth2/authorize?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string, codeVerifier?: string): Promise<OAuthTokens> {
    const body: Record<string, string> = {
      client_id: this.config.clientId,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    };

    if (codeVerifier) {
      body.code_verifier = codeVerifier;
    }

    // Twitter uses Basic Auth with client_id:client_secret
    const credentials = btoa(`${this.config.clientId}:${this.config.clientSecret}`);

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twitter token exchange failed: ${error}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
      token_type: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope ? data.scope.split(' ') : [],
    };
  }

  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    const response = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      throw new Error(`Twitter user profile fetch failed: ${response.status}`);
    }

    const result = await response.json() as {
      data: {
        id: string;
        name: string;
        username: string;
        profile_image_url?: string;
      };
    };

    const data = result.data;

    // Twitter v2 API does not return email directly.
    // The user's email must be obtained via the v1.1 endpoint or pre-configured.
    // For now, use username@twitter.placeholder -- callers should handle email verification.
    return {
      providerId: data.id,
      email: `${data.username}@twitter.placeholder`, // See note above
      displayName: data.name,
      avatarUrl: data.profile_image_url,
      username: data.username,
      raw: data as unknown as Record<string, unknown>,
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const credentials = btoa(`${this.config.clientId}:${this.config.clientSecret}`);

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Twitter token refresh failed: ${response.status}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope ? data.scope.split(' ') : [],
    };
  }
}
