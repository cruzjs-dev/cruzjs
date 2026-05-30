/**
 * Microsoft OAuth 2.0 Provider
 *
 * Implements OAuth 2.0 for Microsoft (Azure AD / Microsoft Identity Platform).
 * Uses the /common tenant for multi-tenant sign-in.
 * https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
 */

import type { OAuthProvider } from '../oauth.provider';
import type { OAuthUserProfile, OAuthTokens, OAuthProviderConfig } from '../social-auth.types';

export class MicrosoftProvider implements OAuthProvider {
  readonly name = 'microsoft';
  readonly scopes = ['openid', 'email', 'profile', 'User.Read'];
  readonly requiresPkce = true;

  private readonly tenant: string;

  constructor(private readonly config: OAuthProviderConfig) {
    this.tenant = (config.tenant as string) ?? 'common';
  }

  getAuthUrl(state: string, redirectUri: string, codeChallenge?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      state,
      response_mode: 'query',
    });

    if (codeChallenge) {
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }

    return `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/authorize?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string, codeVerifier?: string): Promise<OAuthTokens> {
    const body: Record<string, string> = {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: this.scopes.join(' '),
    };

    if (codeVerifier) {
      body.code_verifier = codeVerifier;
    }

    const response = await fetch(
      `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft token exchange failed: ${error}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
      token_type: string;
      id_token?: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope ? data.scope.split(' ') : [],
    };
  }

  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Microsoft user profile fetch failed: ${response.status}`);
    }

    const data = await response.json() as {
      id: string;
      displayName: string;
      mail: string | null;
      userPrincipalName: string;
    };

    // mail may be null for personal accounts; fall back to userPrincipalName
    const email = data.mail ?? data.userPrincipalName;

    return {
      providerId: data.id,
      email,
      displayName: data.displayName,
      raw: data as unknown as Record<string, unknown>,
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch(
      `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: this.scopes.join(' '),
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Microsoft token refresh failed: ${response.status}`);
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
