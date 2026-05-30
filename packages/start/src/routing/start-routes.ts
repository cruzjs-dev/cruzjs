import type { RouteHelpers, RegisterRoutesOptions } from '@cruzjs/core/routing';
import { applyRouteOverrides } from '@cruzjs/core/routing/utils';

const PKG = '@cruzjs/start';

/**
 * Register CruzJS Start routes (dashboard, settings, orgs, invitations, social auth).
 *
 * Default routes:
 * - dashboard
 * - settings
 * - profile
 * - profile/settings
 * - orgs/:slug/dashboard
 * - invitations/:token (accept invitation page)
 * - orgs/new (create org page)
 * - orgs/:slug (layout + overview, members, settings, invitations)
 * - auth/:provider (OAuth redirect)
 * - auth/:provider/callback (OAuth callback)
 *
 * The org layout uses a layout route at `orgs/:slug` with nested child routes.
 * Note: orgs/:slug/billing is registered via registerCruzSaasRoutes() in @cruzjs/saas.
 *
 * @example
 * ```ts
 * ...registerCruzStartRoutes(helpers, {
 *   overrides: {
 *     'settings': null, // disable settings page
 *     'orgs/:slug/invitations': null, // disable invitations page
 *   },
 * }),
 * ```
 */
export function registerCruzStartRoutes(
  helpers: RouteHelpers,
  options?: RegisterRoutesOptions,
): any[] {
  const overrides = options?.overrides ?? {};
  const r = (file: string) => helpers.resolvePackageFile(PKG, file);

  // Standard page routes
  const pageRoutes = applyRouteOverrides(
    [
      { path: 'dashboard', file: r('pages/DashboardPage.tsx') },
      { path: 'settings', file: r('pages/SettingsPage.tsx') },
      { path: 'settings/sessions', file: r('pages/settings/SessionsPage.tsx') },
      { path: 'settings/danger', file: r('pages/settings/DangerZonePage.tsx') },
      { path: 'profile', file: r('pages/ProfilePage.tsx') },
      { path: 'profile/settings', file: r('pages/ProfileSettingsPage.tsx') },
      { path: 'orgs/:slug/dashboard', file: r('pages/OrgDashboardPage.tsx') },
    ],
    helpers,
    overrides,
  );

  // Build org child routes with overrides
  const orgChildDefaults = [
    { path: 'orgs/:slug', file: r('orgs/pages/OrgOverviewPage.tsx') },
    { path: 'orgs/:slug/overview', file: r('orgs/pages/OrgOverviewPage.tsx'), id: 'org-overview-explicit' },
    { path: 'orgs/:slug/members', file: r('orgs/pages/OrgMembersPage.tsx') },
    { path: 'orgs/:slug/settings', file: r('orgs/pages/OrgSettingsPage.tsx') },
    { path: 'orgs/:slug/invitations', file: r('orgs/pages/OrgInvitationsPage.tsx') },
  ];

  const orgChildren = [
    ...applyRouteOverrides(orgChildDefaults, helpers, overrides),
    ...(options?.orgChildRoutes ?? []),
  ];

  // Build top-level routes
  const routes: any[] = [...pageRoutes];

  // Invitation acceptance
  if (overrides['invitations/:token'] !== null) {
    const file = overrides['invitations/:token']?.file ?? r('orgs/pages/AcceptInvitationPage.tsx');
    routes.push(helpers.route('invitations/:token', file));
  }

  // Create org
  if (overrides['orgs/new'] !== null) {
    const file = overrides['orgs/new']?.file ?? r('orgs/pages/CreateOrgPage.tsx');
    routes.push(helpers.route('orgs/new', file));
  }

  // Org layout with children
  if (overrides['orgs/:slug/_layout'] !== null) {
    const layoutFile = overrides['orgs/:slug/_layout']?.file ?? r('orgs/pages/OrgLayoutRoute.tsx');
    routes.push(helpers.layout(layoutFile, orgChildren));
  }

  // Social auth routes (OAuth redirect + callback)
  // Note: These are registered after core auth/login, auth/register, etc. which take precedence.
  if (overrides['auth/:provider'] !== null) {
    const file = overrides['auth/:provider']?.file ?? r('social-auth/routes/auth.provider.tsx');
    routes.push(helpers.route('auth/:provider', file));
  }
  if (overrides['auth/:provider/callback'] !== null) {
    const file = overrides['auth/:provider/callback']?.file ?? r('social-auth/routes/auth.provider.callback.tsx');
    routes.push(helpers.route('auth/:provider/callback', file));
  }

  return routes;
}
