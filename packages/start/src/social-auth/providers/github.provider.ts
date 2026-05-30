/**
 * GitHub OAuth Provider
 *
 * Implements OAuth 2.0 for GitHub.
 * https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
 */

import type { OAuthProvider } from '../oauth.provider';
import type { OAuthUserProfile, OAuthTokens, OAuthProviderConfig } from '../social-auth.types';

export class GitHubProvider implements OAuthProvider {
  readonly name = 'github';
  readonly scopes = ['user:email', 'read:user'];
  readonly requiresPkce = false;

  constructor(private readonly config: OAuthProviderConfig) {}

  getAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: this.scopes.join(' '),
      state,
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub token exchange failed: ${response.status}`);
    }

    const data = await response.json() as {
      access_token: string;
      token_type: string;
      scope: string;
      error?: string;
      error_description?: string;
    };

    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    return {
      accessToken: data.access_token,
      scopes: data.scope ? data.scope.split(',') : [],
    };
  }

  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    // Fetch user data
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      throw new Error(`GitHub user fetch failed: ${userResponse.status}`);
    }

    const userData = await userResponse.json() as {
      id: number;
      login: string;
      name: string | null;
      email: string | null;
      avatar_url: string;
    };

    // If email is not public, fetch from emails endpoint
    let email = userData.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (emailsResponse.ok) {
        const emails = await emailsResponse.json() as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        const primaryEmail = emails.find((e) => e.primary && e.verified);
        email = primaryEmail?.email ?? emails[0]?.email ?? null;
      }
    }

    if (!email) {
      throw new Error('Unable to retrieve email from GitHub');
    }

    return {
      providerId: String(userData.id),
      email,
      displayName: userData.name ?? userData.login,
      avatarUrl: userData.avatar_url,
      username: userData.login,
      raw: userData as unknown as Record<string, unknown>,
    };
  }
}
