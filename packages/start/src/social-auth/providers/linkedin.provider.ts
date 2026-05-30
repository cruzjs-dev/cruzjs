/**
 * LinkedIn OAuth Provider
 *
 * Implements OAuth 2.0 for LinkedIn.
 * https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
 */

import type { OAuthProvider } from '../oauth.provider';
import type { OAuthUserProfile, OAuthTokens, OAuthProviderConfig } from '../social-auth.types';

export class LinkedInProvider implements OAuthProvider {
  readonly name = 'linkedin';
  readonly scopes = ['openid', 'profile', 'email'];
  readonly requiresPkce = false;

  constructor(private readonly config: OAuthProviderConfig) {}

  getAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      state,
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LinkedIn token exchange failed: ${error}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope ? data.scope.split(' ') : [],
    };
  }

  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    // LinkedIn OpenID Connect userinfo endpoint
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`LinkedIn user profile fetch failed: ${response.status}`);
    }

    const data = await response.json() as {
      sub: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      email: string;
      email_verified: boolean;
      picture?: string;
    };

    return {
      providerId: data.sub,
      email: data.email,
      displayName: data.name ?? ([data.given_name, data.family_name].filter(Boolean).join(' ') || undefined),
      avatarUrl: data.picture,
      raw: data as unknown as Record<string, unknown>,
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`LinkedIn token refresh failed: ${response.status}`);
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
