/**
 * Social Auth Types
 *
 * Core type definitions for the social OAuth system.
 */

// ── Provider enum ────────────────────────────────────────────────────────────

export const SocialProvider = {
  GITHUB: 'github',
  GOOGLE: 'google',
  DISCORD: 'discord',
  TWITTER: 'twitter',
  LINKEDIN: 'linkedin',
  MICROSOFT: 'microsoft',
  APPLE: 'apple',
} as const;
export type SocialProvider = (typeof SocialProvider)[keyof typeof SocialProvider];

/** All valid provider values for runtime validation. */
export const SOCIAL_PROVIDER_VALUES = Object.values(SocialProvider) as SocialProvider[];

// ── Profiles & Tokens ────────────────────────────────────────────────────────

/**
 * User profile data returned by an OAuth provider after authentication.
 */
export interface OAuthUserProfile {
  /** The provider's unique user ID */
  providerId: string;
  /** User's email from the provider */
  email: string;
  /** User's display name from the provider */
  displayName?: string;
  /** URL to the user's avatar image */
  avatarUrl?: string;
  /** Provider-specific username (GitHub login, Twitter handle, etc.) */
  username?: string;
  /** Raw provider response data for extensibility */
  raw?: Record<string, unknown>;
}

/**
 * OAuth tokens returned after code exchange.
 */
export interface OAuthTokens {
  /** Access token for API calls */
  accessToken: string;
  /** Refresh token for obtaining new access tokens */
  refreshToken?: string;
  /** Timestamp when the access token expires */
  expiresAt?: Date;
  /** Granted scopes */
  scopes?: string[];
}

/**
 * Configuration for an OAuth provider.
 */
export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  /** Additional provider-specific configuration */
  [key: string]: unknown;
}

// ── Callback & Connection types ──────────────────────────────────────────────

/**
 * Result of a successful OAuth callback.
 */
export interface OAuthCallbackResult {
  user: {
    id: string;
    email: string;
    name: string | null;
    emailVerified: string | null;
  };
  session: {
    token: string;
    expiresAt: string;
  };
  isNewUser: boolean;
  accountLinked: boolean;
}

/**
 * A connected social account (safe for client display).
 * Tokens are never exposed to the client.
 */
export interface SocialAccountInfo {
  id: string;
  provider: string;
  providerUserId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  scopes: string | null;
  createdAt: string;
  lastSyncedAt: string | null;
}

/**
 * OAuth state payload for CSRF protection and flow context.
 */
export interface OAuthState {
  /** Where to redirect after auth completes */
  redirectTo?: string;
  /** Set when linking (not registering) */
  userId?: string;
  /** CSRF nonce */
  nonce: string;
  /** Timestamp for state expiry */
  createdAt: number;
}
