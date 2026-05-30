/**
 * Auto-Discovery Utilities
 *
 * Helpers for automatically discovering @Module-decorated classes and schema
 * exports from Vite's `import.meta.glob` results. This eliminates the need
 * to manually import and list every module or schema file.
 *
 * @example
 * ```ts
 * // server.cloudflare.ts
 * const moduleGlob = import.meta.glob('./features/**\/*.module.ts');
 * const modules = await autoDiscoverModules(moduleGlob);
 *
 * const schemaGlob = import.meta.glob('./features/**\/*.schema.ts');
 * const schema = await autoDiscoverSchemas(schemaGlob);
 * ```
 */

import type { ModuleClass } from '../di';
import { isModule } from '../di/decorators/module.decorator';

/**
 * A Vite `import.meta.glob` result — a record of file paths to lazy loaders.
 */
export type ViteGlob = Record<string, () => Promise<Record<string, unknown>>>;

/**
 * Auto-discovers @Module-decorated classes from Vite's import.meta.glob result.
 *
 * Iterates every matched file, loads it, and inspects each named export.
 * Any export that is a class decorated with `@Module()` is collected.
 *
 * @param glob - The result of `import.meta.glob('./features/**\/*.module.ts')`
 * @returns An array of discovered ModuleClass instances
 *
 * @example
 * ```ts
 * // server.cloudflare.ts
 * const moduleGlob = import.meta.glob('./features/**\/*.module.ts');
 * const modules = await autoDiscoverModules(moduleGlob);
 *
 * export default createCruzApp({
 *   schema,
 *   modules,
 *   pages: () => import('virtual:react-router/server-build'),
 * });
 * ```
 */
export async function autoDiscoverModules(glob: ViteGlob): Promise<ModuleClass[]> {
  const modules: ModuleClass[] = [];
  for (const [, loader] of Object.entries(glob)) {
    const mod = await loader();
    for (const [, value] of Object.entries(mod)) {
      if (isModule(value)) {
        modules.push(value);
      }
    }
  }
  return modules;
}

/**
 * Merges all named exports from a Vite glob result into a single object.
 *
 * Useful for aggregating Drizzle schema tables from multiple feature files
 * into the single `schema` object that `createCruzApp` expects.
 *
 * @param glob - The result of `import.meta.glob('./features/**\/*.schema.ts')`
 * @returns A merged record of all named exports
 *
 * @example
 * ```ts
 * // server.cloudflare.ts
 * const schemaGlob = import.meta.glob('./features/**\/*.schema.ts');
 * const schema = await autoDiscoverSchemas(schemaGlob);
 *
 * export default createCruzApp({
 *   schema,
 *   modules,
 *   pages: () => import('virtual:react-router/server-build'),
 * });
 * ```
 */
export async function autoDiscoverSchemas(glob: ViteGlob): Promise<Record<string, unknown>> {
  const schema: Record<string, unknown> = {};
  for (const [, loader] of Object.entries(glob)) {
    const mod = await loader();
    Object.assign(schema, mod);
  }
  return schema;
}
