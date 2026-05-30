/**
 * Social Auth Module
 *
 * Registers the SocialOAuthService, SocialAuthTrpc router, SocialAuthApiRouter,
 * and page routes. OAuth providers are registered via multi-injection using the
 * OAUTH_PROVIDER symbol.
 *
 * To add providers, register them in your app module:
 * ```ts
 * @Module({
 *   providers: [
 *     {
 *       provide: OAUTH_PROVIDER,
 *       useFactory: () => new GitHubProvider({ clientId: '...', clientSecret: '...' }),
 *       multi: true,
 *     },
 *   ],
 * })
 * export class MyAppModule {}
 * ```
 */

import { Module } from '@cruzjs/core/di';
import { SocialOAuthService } from './oauth.service';
import { SocialAuthTrpc } from './social-auth.trpc';
import { SocialAuthApiRouter } from './social-auth.api-router';
import { socialAuthRoutes } from './social-auth.routes';

@Module({
  providers: [SocialOAuthService, SocialAuthTrpc, SocialAuthApiRouter],
  trpcRouters: {
    socialAuth: SocialAuthTrpc,
  },
  apiRouters: [SocialAuthApiRouter],
  pageRoutes: socialAuthRoutes,
})
export class SocialAuthModule {}
