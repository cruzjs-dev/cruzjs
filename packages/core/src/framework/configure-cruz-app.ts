/**
 * configureCruzApp — Side-effect bootstrap for apps that mount via React
 * Router pages (no separate Worker fetch handler).
 *
 * Sibling to `createCruzApp`, which returns a worker-style fetch handler.
 * `configureCruzApp` instead registers the schema and modules into the
 * framework's module-level registries; the container is then built lazily
 * on first request by tRPC / API middleware.
 *
 * Usage in app.server.ts:
 * ```ts
 * import 'reflect-metadata';
 * import { configureCruzApp } from '@cruzjs/core';
 * import { StartModule } from '@cruzjs/start';
 * import * as schema from './database/schema';
 *
 * configureCruzApp({
 *   schema,
 *   modules: [StartModule, MyFeatureModule],
 * });
 * ```
 *
 * Then `entry.server.tsx`:
 * ```ts
 * import './app.server';
 * export { handleRequest as default } from '@cruzjs/core/framework/entry-handler.server';
 * ```
 */

import type { ModuleClass } from '../di';
import { DrizzleService } from '../shared/database/drizzle.service';
import { registerModules } from './module-registry';

export type ConfigureCruzAppConfig = {
  /** Database schema object (from `import * as schema from './database/schema'`) */
  schema: Record<string, unknown>;

  /** Modules to load. Each module is a class decorated with @Module(). */
  modules?: ModuleClass[];
};

export function configureCruzApp(config: ConfigureCruzAppConfig): void {
  DrizzleService.setSchema(config.schema);
  registerModules(config.modules ?? []);
}
