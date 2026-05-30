import { Google, Facebook } from 'arctic';
import { config } from '../shared/config';

/**
 * OAuth provider configuration using Arctic library
 * Provides type-safe OAuth clients for Google and Facebook
 *
 * Note: Uses lazy initialization to avoid accessing config at module load time
 * (required for Cloudflare Workers compatibility)
 */

// Lazy-initialized OAuth clients
let _googleOAuth: Google | null | undefined = undefined;
let _facebookOAuth: Facebook | null | undefined = undefined;

/**
 * Get Google OAuth client instance (lazily initialized)
 */
export function getGoogleOAuth(): Google | null {
  if (_googleOAuth === undefined) {
    _googleOAuth =
      config.oauth?.google?.clientId &&
      config.oauth?.google?.clientSecret &&
      config.oauth?.google?.redirectUri
        ? new Google(
            config.oauth.google.clientId,
            config.oauth.google.clientSecret,
            config.oauth.google.redirectUri
          )
        : null;
  }
  return _googleOAuth;
}

/**
 * Get Facebook OAuth client instance (lazily initialized)
 */
export function getFacebookOAuth(): Facebook | null {
  if (_facebookOAuth === undefined) {
    _facebookOAuth = config.oauth?.facebook
      ? new Facebook(
          config.oauth.facebook.clientId,
          config.oauth.facebook.clientSecret,
          config.oauth.facebook.redirectUri
        )
      : null;
  }
  return _facebookOAuth;
}

// Backward compatibility exports (lazy via getters)
export const googleOAuth = new Proxy({} as object, {
  get(_target, prop) {
    const oauth = getGoogleOAuth();
    if (oauth === null) return null;
    return (oauth as any)[prop];
  },
}) as Google | null;

export const facebookOAuth = new Proxy({} as object, {
  get(_target, prop) {
    const oauth = getFacebookOAuth();
    if (oauth === null) return null;
    return (oauth as any)[prop];
  },
}) as Facebook | null;

/**
 * Get OAuth provider client by name
 */
export function getOAuthProvider(provider: 'google' | 'facebook') {
  if (provider === 'google') {
    const oauth = getGoogleOAuth();
    if (!oauth) {
      throw new Error('Google OAuth is not configured');
    }
    return oauth;
  }
  if (provider === 'facebook') {
    const oauth = getFacebookOAuth();
    if (!oauth) {
      throw new Error('Facebook OAuth is not configured');
    }
    return oauth;
  }
  throw new Error(`Unsupported OAuth provider: ${provider}`);
}

/**
 * Check if a provider is configured
 */
export function isProviderConfigured(provider: 'google' | 'facebook'): boolean {
  if (provider === 'google') {
    return !!config.oauth?.google;
  }
  if (provider === 'facebook') {
    return !!config.oauth?.facebook;
  }
  return false;
}

