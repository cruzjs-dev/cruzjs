import { createRouteHelpers } from './helpers';
import { registerCruzCoreRoutes } from './core-routes';
import { getModuleMetadata, type ModuleClass } from '../di';
import { getRegisteredModules } from '../framework/module-registry';
import type { RouteOverrides, RouteRegistrar, RouteFactory } from './types';

type ReactRouterHelpers = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  route: (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  layout: (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  index: (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prefix: (...args: any[]) => any[];
};

export type CreateCruzRoutesOptions = ReactRouterHelpers & {
  /**
   * The directory of your routes.ts file — pass `import.meta.dirname`.
   * Used to resolve package source files to paths React Router can load.
   */
  dir: string;

  /**
   * Additional framework route registrars and overrides. Core is always included.
   *
   * `registrars` — extra registrar functions (e.g. `registerCruzSaasRoutes`).
   * `overrides`  — flat map of route path → override, applied to all registrars.
   *
   * @example
   * framework: {
   *   registrars: [registerCruzSaasRoutes, registerCruzStartRoutes],
   *   overrides: {
   *     'auth/register': null,
   *     'auth/login': { file: 'routes/my-login.tsx' },
   *     'orgs/:slug/billing': null,
   *   },
   * }
   */
  framework?: {
    registrars?: RouteRegistrar[];
    overrides?: RouteOverrides;
  };

  /**
   * Feature modules that declare routes via their `pageRoutes` factory.
   * Routes are appended after all framework routes.
   *
   * When omitted, falls back to the modules registered by `createCruzApp`
   * (via `getRegisteredModules()`), so you only need to declare modules
   * in one place — `createCruzApp({ modules: [...] })`.
   *
   * @example
   * // Explicit — useful when routes.ts needs a different subset:
   * modules: [ForumModule, BlogModule]
   *
   * // Omitted — uses the same modules passed to createCruzApp:
   * // modules: undefined  (auto-resolved)
   */
  modules?: ModuleClass[];

  /**
   * Feature route factories — plain functions (no DI) from `features/<name>/<name>.routes.ts`.
   * Safe to import in `routes.ts` because they contain no decorator imports.
   * Routes are appended after framework routes and module routes.
   *
   * @example
   * import notesRoutes from './features/notes/notes.routes';
   * featureRoutes: [notesRoutes]
   */
  featureRoutes?: RouteFactory[];

  /**
   * Additional raw route config entries (index page, custom API routes, etc.).
   * Appended last, after framework routes and module routes.
   *
   * @example
   * routes: [
   *   index('routes/index.tsx'),
   *   ...prefix('api', [route('debug', 'routes/api/debug.ts')]),
   * ]
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routes?: any[];
};

/**
 * Build the complete React Router route config for a CruzJS app.
 *
 * Core routes are always included. Pass additional framework registrars and
 * overrides via `framework`, feature modules via `modules`, and any remaining
 * app-specific entries via `routes`.
 *
 * @example
 * ```ts
 * // apps/web/src/routes.ts
 * import { type RouteConfig, route, index, layout, prefix } from '@react-router/dev/routes';
 * import { createCruzRoutes } from '@cruzjs/core/routing';
 * import { registerCruzSaasRoutes } from '@cruzjs/saas/routing';
 * import { registerCruzStartRoutes } from '@cruzjs/start/routing';
 * import { ForumModule } from './features/forum/forum.module';
 *
 * export default createCruzRoutes({
 *   route, index, layout, prefix,
 *   dir: import.meta.dirname,
 *   framework: {
 *     registrars: [registerCruzSaasRoutes, registerCruzStartRoutes],
 *     overrides: {
 *       'auth/register': null,
 *       'orgs/:slug/billing': null,
 *     },
 *   },
 *   modules: [ForumModule],
 *   routes: [
 *     index('routes/index.tsx'),
 *     ...prefix('api', [route('debug', 'routes/api/debug.ts')]),
 *   ],
 * }) satisfies RouteConfig;
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createCruzRoutes(options: CreateCruzRoutesOptions): any[] {
  const { route, index, layout, prefix, dir, framework = {}, modules: explicitModules, featureRoutes = [], routes = [] } = options;
  const modules = explicitModules ?? getRegisteredModules();
  const { registrars = [], overrides = {} } = framework;

  const helpers = createRouteHelpers({ route, index, layout, prefix }, dir);
  const registrarOptions = { overrides, orgChildRoutes: [] as any[] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any[] = [
    ...registerCruzCoreRoutes(helpers, registrarOptions),
    ...registrars.flatMap((r) => r(helpers, registrarOptions)),
  ];

  for (const moduleClass of modules) {
    const metadata = getModuleMetadata(moduleClass);
    if (metadata?.pageRoutes) {
      result.push(...metadata.pageRoutes(helpers));
    }
  }

  for (const factory of featureRoutes) {
    result.push(...factory(helpers));
  }

  result.push(...routes);

  return result;
}
