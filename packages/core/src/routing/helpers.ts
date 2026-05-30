import path from 'path';
import fs from 'fs';
import type { RouteHelpers } from './types';

type ReactRouterHelpers = {
  route: (...args: any[]) => any;
  layout: (...args: any[]) => any;
  index: (...args: any[]) => any;
  prefix: (...args: any[]) => any[];
};

/**
 * Create route helpers that include package file resolution.
 *
 * The `appDir` should be the directory containing `routes.ts` (typically
 * the app's `src/` directory). Package files are resolved relative to
 * this directory so React Router's Vite plugin can find them.
 *
 * @example
 * ```ts
 * // routes.ts
 * import { createRouteHelpers } from '@cruzjs/core/routing';
 * import { route, index, layout, prefix } from '@react-router/dev/routes';
 *
 * const helpers = createRouteHelpers(
 *   { route, index, layout, prefix },
 *   import.meta.dirname,
 * );
 * ```
 */
export function createRouteHelpers(
  rr: ReactRouterHelpers,
  appDir: string,
): RouteHelpers {
  return {
    ...rr,
    resolvePackageFile: (pkg: string, file: string) => {
      // @cruzjs/core → core, @cruzjs/saas → pro, @cruzjs/start → start
      const pkgName = pkg.replace(/^@cruzjs\//, '');
      // Try monorepo path first (apps/web/src → ../../../packages/<pkg>/src)
      const monoPath = path.resolve(appDir, `../../../packages/${pkgName}/src/${file}`);
      if (fs.existsSync(monoPath)) {
        return path.relative(appDir, monoPath);
      }
      // Fall back to node_modules (standalone app: src/ → ../node_modules/@cruzjs/<pkg>/src)
      const nmPath = path.resolve(appDir, `../node_modules/@cruzjs/${pkgName}/src/${file}`);
      return path.relative(appDir, nmPath);
    },
  };
}
