import type { RouteHelpers, RegisterRoutesOptions } from '@cruzjs/core/routing';
import { applyRouteOverrides } from '@cruzjs/core/routing/utils';

const PKG = '@cruzjs/saas';
const START_PKG = '@cruzjs/start';

/**
 * Register CruzJS Pro routes (billing page for orgs, billing API).
 *
 * Default routes:
 * - orgs/:slug/billing
 * - api/billing/plans
 * - api/billing/subscription
 * - api/billing/create-portal-session
 *
 * Non-billing org routes (overview, members, settings, invitations, create, accept invitation)
 * are now registered via registerCruzStartRoutes() in @cruzjs/start.
 *
 * @example
 * ```ts
 * ...registerCruzSaasRoutes(helpers, {
 *   overrides: {
 *     'orgs/:slug/billing': null, // disable billing page
 *   },
 * }),
 * ```
 */
export function registerCruzSaasRoutes(
  helpers: RouteHelpers,
  options?: RegisterRoutesOptions,
): any[] {
  const overrides = options?.overrides ?? {};
  const r = (file: string) => helpers.resolvePackageFile(PKG, file);

  // Build top-level routes
  const routes: any[] = [];

  if (overrides['orgs/:slug/billing'] !== null) {
    const file = overrides['orgs/:slug/billing']?.file ?? r('orgs/pages/OrgBillingPage.tsx');
    const childRoute = helpers.route('orgs/:slug/billing', file);
    if (options?.orgChildRoutes) {
      options.orgChildRoutes.push(childRoute);
    } else {
      routes.push(childRoute);
    }
  }

  // Billing API routes
  const billingApiDefaults = [
    { path: 'billing/plans', file: r('api/billing-plans.ts') },
    { path: 'billing/subscription', file: r('api/billing-subscription.ts') },
    { path: 'billing/create-portal-session', file: r('api/billing-portal.ts') },
  ];

  const billingApiRoutes = applyRouteOverrides(
    billingApiDefaults.map(d => ({ ...d, path: d.path })),
    helpers,
    Object.fromEntries(
      Object.entries(overrides)
        .filter(([k]) => k.startsWith('api/billing/'))
        .map(([k, v]) => [k.slice(4), v])
    ),
  );

  if (billingApiRoutes.length > 0) {
    routes.push(...helpers.prefix('api', billingApiRoutes));
  }

  return routes;
}
