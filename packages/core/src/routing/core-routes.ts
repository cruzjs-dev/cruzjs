import type { RouteHelpers, RegisterRoutesOptions } from './types';
import { applyRouteOverrides } from './utils';

const PKG = '@cruzjs/core';

/**
 * Register CruzJS core routes (authentication + core API endpoints).
 *
 * Page routes: auth/login, auth/register, auth/forgot-password,
 *   auth/reset-password/:token, auth/verify-email/:token
 *
 * API routes (under api/ prefix): health, trpc/*, email-logs,
 *   email-preview, jobs/callback
 *
 * @example
 * ```ts
 * ...registerCruzCoreRoutes(helpers, {
 *   overrides: {
 *     'auth/login': { file: 'routes/my-custom-login.tsx' },
 *     'auth/register': null, // disable registration
 *     'api/health': null,    // disable health endpoint
 *   },
 * }),
 * ```
 */
export function registerCruzCoreRoutes(
  helpers: RouteHelpers,
  options?: RegisterRoutesOptions,
): any[] {
  const overrides = options?.overrides ?? {};
  const r = (file: string) => helpers.resolvePackageFile(PKG, file);

  const pageRoutes = applyRouteOverrides(
    [
      { path: 'auth/login', file: r('auth/pages/LoginPage.tsx') },
      { path: 'auth/register', file: r('auth/pages/RegisterPage.tsx') },
      { path: 'auth/forgot-password', file: r('auth/pages/ForgotPasswordPage.tsx') },
      { path: 'auth/reset-password/:token', file: r('auth/pages/ResetPasswordPage.tsx') },
      { path: 'auth/verify-email/:token', file: r('auth/pages/VerifyEmailPage.tsx') },
    ],
    helpers,
    overrides,
  );

  const apiDefaults = [
    { path: 'health', file: r('api/health.ts') },
    { path: 'trpc/*', file: 'routes/api/trpc.$.ts' },
    { path: 'email-logs', file: r('api/email-logs.ts') },
    { path: 'email-preview', file: r('api/email-preview.tsx') },
    { path: 'jobs/callback', file: r('api/jobs-callback.ts') },
    // REST API controller catch-all — must be last so specific routes win
    { path: '*', file: r('api/api.catch-all.ts') },
  ];

  // Apply overrides using api/-prefixed keys
  const apiRoutes = applyRouteOverrides(
    apiDefaults.map(d => ({ ...d, path: d.path })),
    helpers,
    // Remap api/X override keys to just X for the prefix block
    Object.fromEntries(
      Object.entries(overrides)
        .filter(([k]) => k.startsWith('api/'))
        .map(([k, v]) => [k.slice(4), v])
    ),
  );

  return [
    ...pageRoutes,
    ...helpers.prefix('api', apiRoutes),
  ];
}
