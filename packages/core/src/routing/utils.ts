import type { RouteHelpers, RouteOverrides } from './types';

type RouteDef = {
  path: string;
  file: string;
  id?: string;
};

/**
 * Apply overrides to a list of simple route definitions.
 * Returns route config entries with overrides applied:
 * - `null` override → route removed
 * - `{ file }` override → route uses custom file
 * - `undefined` → default file used
 */
export function applyRouteOverrides(
  defaults: RouteDef[],
  helpers: RouteHelpers,
  overrides: RouteOverrides = {},
): any[] {
  const results: any[] = [];

  for (const def of defaults) {
    const override = overrides[def.path];
    if (override === null) continue;

    const file = override?.file ?? def.file;
    const children = override?.children;

    if (def.id) {
      results.push(helpers.route(def.path, file, { id: def.id }));
    } else if (children) {
      results.push(helpers.route(def.path, file, children));
    } else {
      results.push(helpers.route(def.path, file));
    }
  }

  return results;
}
