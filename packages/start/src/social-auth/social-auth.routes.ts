/**
 * Social Auth Routes
 *
 * React Router route definitions for the OAuth redirect and callback flow.
 * These routes handle browser-side redirects (not API calls).
 *
 * Routes:
 * - /auth/:provider — Initiates OAuth flow, redirects to provider
 * - /auth/:provider/callback — Handles callback from provider
 */

import type { RouteHelpers } from '@cruzjs/core/routing';

const PKG = '@cruzjs/start';

export function socialAuthRoutes(helpers: RouteHelpers) {
  return [
    helpers.route(
      'auth/:provider',
      helpers.resolvePackageFile(PKG, 'social-auth/routes/auth.provider.tsx'),
    ),
    helpers.route(
      'auth/:provider/callback',
      helpers.resolvePackageFile(PKG, 'social-auth/routes/auth.provider.callback.tsx'),
    ),
  ];
}
