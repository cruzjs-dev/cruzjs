import { getOAuthProvider, isProviderConfigured } from './oauth-providers';
import type { OAuthProvider } from './auth.models';

/**
 * OAuth utility functions
 */

/**
 * Get OAuth provider client instance
 */
export function getProviderClient(provider: OAuthProvider) {
  return getOAuthProvider(provider);
}

/**
 * Check if OAuth provider is configured
 */
export function isProviderAvailable(provider: OAuthProvider): boolean {
  return isProviderConfigured(provider);
}

/**
 * Get list of available OAuth providers
 */
export function getAvailableProviders(): OAuthProvider[] {
  const providers: OAuthProvider[] = [];
  
  if (isProviderConfigured('google')) {
    providers.push('google');
  }
  
  if (isProviderConfigured('facebook')) {
    providers.push('facebook');
  }
  
  return providers;
}

