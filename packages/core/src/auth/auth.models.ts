/**
 * Authentication and session models
 */

export type SessionData = {
  userId: string;
  currentOrgId?: string | null;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
};

export type SessionInfo = SessionData & {
  token: string;
  createdAt: Date;
};

export type CreateSessionInput = {
  userId: string;
  currentOrgId?: string | null;
  userAgent?: string;
  ipAddress?: string;
};

/**
 * Registration input
 */
export type RegisterInput = {
  email: string;
  password: string;
  name?: string;
};

/**
 * Login input
 */
export type LoginInput = {
  email: string;
  password: string;
};

/**
 * Authentication response
 * Note: Date fields are ISO strings for D1/SQLite compatibility
 */
export type AuthResponse = {
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
};

/**
 * Email verification input
 */
export type VerifyEmailInput = {
  token: string;
};

/**
 * Request password reset input
 */
export type RequestPasswordResetInput = {
  email: string;
};

/**
 * Reset password input
 */
export type ResetPasswordInput = {
  token: string;
  newPassword: string;
};

/**
 * JWT token payload
 */
export type TokenPayload = {
  userId: string;
  exp: number;
  iat: number;
};

/**
 * Refresh token input
 */
export type RefreshTokenInput = {
  refreshToken: string;
};

/**
 * Token response
 */
export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
};

/**
 * OAuth provider type
 */
export type OAuthProvider = 'google' | 'facebook';

/**
 * OAuth user data from provider
 */
export type OAuthUser = {
  providerId: string;
  email: string;
  name?: string;
  avatar?: string;
};

/**
 * OAuth account data stored in database
 */
export type OAuthAccount = {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  idToken?: string;
};

/**
 * OAuth authorization URL response
 */
export type OAuthAuthorizationUrl = {
  url: string;
  state: string;
};

/**
 * OAuth callback result
 * Note: Date fields are ISO strings for D1/SQLite compatibility
 */
export type OAuthCallbackResult = {
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
  accountLinked: boolean; // true if account was linked to existing user
};

