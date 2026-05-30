/**
 * Route registration types for CruzJS framework packages.
 *
 * Packages export `registerXRoutes(helpers, options?)` functions that return
 * route config entries. The app's `routes.ts` passes React Router's route
 * helpers and optional overrides.
 */

/** React Router route config helpers passed from the app's routes.ts */
export type RouteHelpers = {
  route: (...args: any[]) => any;
  layout: (...args: any[]) => any;
  index: (...args: any[]) => any;
  prefix: (...args: any[]) => any[];
  /**
   * Resolve a package source file to a path React Router can load.
   * Called by registration functions so they can point directly at package
   * source files instead of requiring thin re-export stubs in the app.
   *
   * @param pkg  - Package name, e.g. `'@cruzjs/core'`
   * @param file - File path within the package's `src/`, e.g. `'auth/pages/LoginPage.tsx'`
   * @returns A file path resolvable by React Router's Vite plugin
   */
  resolvePackageFile: (pkg: string, file: string) => string;
};

/**
 * Override a route's file path, or set to `null` to remove the route entirely.
 * If `undefined` (or omitted), the default file path is used.
 */
export type RouteOverride = {
  file: string;
  children?: any[];
} | null;

/**
 * Map of route path → override. Keys match the route paths used in the
 * register function (e.g. 'auth/login', 'orgs/:slug/settings').
 */
export type RouteOverrides = Record<string, RouteOverride | undefined>;

export type RegisterRoutesOptions = {
  overrides?: RouteOverrides;
  /** Mutable array — registrars push org child routes here so they get nested under the org layout. */
  orgChildRoutes?: any[];
};

/**
 * A framework route registrar function — the shape exported by each package
 * (`registerCruzCoreRoutes`, `registerCruzSaasRoutes`, etc.).
 */
export type RouteRegistrar = (helpers: RouteHelpers, options?: RegisterRoutesOptions) => any[];

/**
 * A feature route factory — a plain function (no DI imports) that returns
 * route config entries. Intended for `features/<name>/<name>.routes.ts` files.
 *
 * @example
 * ```ts
 * // features/notes/notes.routes.ts
 * import type { RouteFactory } from '@cruzjs/core/routing';
 * export default ((helpers) => [
 *   ...helpers.prefix('notes', [
 *     helpers.index('features/notes/routes/index.tsx'),
 *     helpers.route('new', 'features/notes/routes/new.tsx'),
 *     helpers.route(':id', 'features/notes/routes/$id.tsx'),
 *   ]),
 * ]) satisfies RouteFactory;
 * ```
 */
export type RouteFactory = (helpers: RouteHelpers) => any[];
