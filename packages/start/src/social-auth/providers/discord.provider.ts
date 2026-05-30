/**
 * Discord OAuth Provider
 *
 * Implements OAuth 2.0 for Discord.
 * https://discord.com/developers/docs/topics/oauth2
 */

import type { OAuthProvider } from '../oauth.provider';
import type { OAuthUserProfile, OAuthTokens, OAuthProviderConfig } from '../social-auth.types';

export class DiscordProvider implements OAuthProvider {
  readonly name = 'discord';
  readonly scopes = ['identify', 'email'];
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
    return `https://discord.com/oauth2/authorize?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch('https://discord.com/api/oauth2/token', {
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
      throw new Error(`Discord token exchange failed: ${error}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token: string;
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
    const response = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Discord user profile fetch failed: ${response.status}`);
    }

    const data = await response.json() as {
      id: string;
      username: string;
      global_name: string | null;
      email: string | null;
      avatar: string | null;
      discriminator: string;
    };

    if (!data.email) {
      throw new Error('Unable to retrieve email from Discord. Ensure "email" scope is granted.');
    }

    const avatarUrl = data.avatar
      ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
      : null;

    return {
      providerId: data.id,
      email: data.email,
      displayName: data.global_name ?? data.username,
      avatarUrl: avatarUrl ?? undefined,
      username: data.username,
      raw: data as unknown as Record<string, unknown>,
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch('https://discord.com/api/oauth2/token', {
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
      throw new Error(`Discord token refresh failed: ${response.status}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token: string;
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
}
