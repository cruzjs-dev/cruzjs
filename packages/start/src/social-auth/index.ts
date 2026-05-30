// Types
export type {
  OAuthUserProfile,
  OAuthTokens,
  OAuthProviderConfig,
  OAuthCallbackResult,
  SocialAccountInfo,
  OAuthState,
} from './social-auth.types';
export { SocialProvider, SOCIAL_PROVIDER_VALUES } from './social-auth.types';

// Provider interface
export type { OAuthProvider } from './oauth.provider';
export { OAUTH_PROVIDER } from './oauth.provider';

// Service
export {
  SocialOAuthService,
  generateState,
  validateState,
  generateCodeVerifier,
  generateCodeChallenge,
  encodeOAuthState,
  decodeOAuthState,
} from './oauth.service';

// Schema
export { socialAccounts } from './social-auth.schema';
export type { SocialAccount, NewSocialAccount } from './social-auth.schema';

// Validation
export {
  getAuthUrlSchema,
  handleCallbackSchema,
  disconnectSchema,
  getConnectionSchema,
  syncAccountSchema,
} from './social-auth.validation';
export type {
  GetAuthUrlInput,
  HandleCallbackInput,
  DisconnectInput,
  GetConnectionInput,
  SyncAccountInput,
} from './social-auth.validation';

// tRPC Router
export { SocialAuthTrpc } from './social-auth.trpc';

// REST API Router
export { SocialAuthApiRouter } from './social-auth.api-router';

// Routes
export { socialAuthRoutes } from './social-auth.routes';

// Module
export { SocialAuthModule } from './social-auth.module';

// Providers
export { GitHubProvider } from './providers/github.provider';
export { GoogleProvider } from './providers/google.provider';
export { DiscordProvider } from './providers/discord.provider';
export { TwitterProvider } from './providers/twitter.provider';
export { LinkedInProvider } from './providers/linkedin.provider';
export { MicrosoftProvider } from './providers/microsoft.provider';
export { AppleProvider } from './providers/apple.provider';
