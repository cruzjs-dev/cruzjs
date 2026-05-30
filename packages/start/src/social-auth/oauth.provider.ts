/**
 * OAuth Provider Interface
 *
 * Defines the contract that all social OAuth providers must implement.
 * Providers handle the specifics of each OAuth flow (auth URL generation,
 * code exchange, user profile fetching, and optional token refresh).
 */

import type { OAuthUserProfile, OAuthTokens } from './social-auth.types';

/**
 * Interface for OAuth provider implementations.
 * Each provider (GitHub, Google, Discord, etc.) implements this interface.
 */
export interface OAuthProvider {
  /** Unique provider name (e.g., 'github', 'google', 'discord') */
  readonly name: string;
  /** Default OAuth scopes requested by this provider */
  readonly scopes: string[];
  /** Whether this provider requires PKCE */
  readonly requiresPkce?: boolean;

  /**
   * Generate the authorization URL to redirect the user to.
   * @param state CSRF protection state parameter
   * @param redirectUri The callback URL after authorization
   * @param codeChallenge Optional PKCE code challenge (for providers that require it)
   */
  getAuthUrl(state: string, redirectUri: string, codeChallenge?: string): string;

  /**
   * Exchange an authorization code for tokens.
   * @param code The authorization code from the callback
   * @param redirectUri The same redirect URI used in the auth URL
   * @param codeVerifier Optional PKCE code verifier
   */
  exchangeCode(code: string, redirectUri: string, codeVerifier?: string): Promise<OAuthTokens>;

  /**
   * Fetch the user's profile using an access token.
   * @param accessToken Valid OAuth access token
   */
  getUserProfile(accessToken: string): Promise<OAuthUserProfile>;

  /**
   * Refresh an expired access token (optional - not all providers support this).
   * @param refreshToken The refresh token
   */
  refreshToken?(refreshToken: string): Promise<OAuthTokens>;
}

/** DI symbol for multi-injecting OAuth providers */
export const OAUTH_PROVIDER = Symbol.for('OAUTH_PROVIDER');
