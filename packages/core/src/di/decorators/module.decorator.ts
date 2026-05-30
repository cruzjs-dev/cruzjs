/**
 * @Module Decorator
 *
 * Declarative module definition for Aurora DI.
 * Similar to NestJS @Module() decorator.
 */

import 'reflect-metadata';
import type { ModuleOptions, ModuleMetadata, ModuleClass } from '../module/types';

const MODULE_METADATA_KEY = Symbol.for('aurora:module');

/**
 * Decorator that marks a class as a module and defines its providers.
 *
 * @example
 * ```typescript
 * @Module({
 *   providers: [CohortService, SourcesService],
 *   trpcRouters: {
 *     cohort: cohortTrpc,
 *   },
 * })
 * export class PipelineModule {}
 *
 * // With advanced providers
 * @Module({
 *   imports: [SharedModule],
 *   providers: [
 *     CohortService,
 *     { provide: DRIZZLE, useValue: DrizzleService.getDb() },
 *     { provide: JOB_HANDLER, useClass: SendEmailHandler, multi: true },
 *   ],
 *   trpcRouters: {
 *     cohort: cohortTrpc,
 *     sources: sourcesTrpc,
 *   },
 * })
 * export class PipelineModule {}
 * ```
 */
export function Module(options: ModuleOptions): ClassDecorator {
  return (target) => {
    const metadata: ModuleMetadata = {
      moduleClass: target as unknown as ModuleClass,
      imports: options.imports ?? [],
      providers: options.providers ?? [],
      trpcRouters: options.trpcRouters ?? {},
      apiRouters: [...(options.apiRouters ?? []), ...(options.apiControllers ?? [])],
      apiControllers: [...(options.apiRouters ?? []), ...(options.apiControllers ?? [])],
      events: options.events ?? [],
      pageRoutes: options.pageRoutes,
      requiredEnv: options.requiredEnv,
      lazy: options.lazy,
    };
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, target);
    return target;
  };
}

/**
 * Get the metadata for a module class.
 *
 * @param moduleClass - The module class to get metadata for
 * @returns The module metadata, or undefined if not a module
 */
export function getModuleMetadata(moduleClass: ModuleClass): ModuleMetadata | undefined {
  return Reflect.getMetadata(MODULE_METADATA_KEY, moduleClass);
}

/**
 * Check if a class is a module (decorated with @Module).
 *
 * @param target - The target to check
 * @returns True if the target is a module class
 */
export function isModule(target: unknown): target is ModuleClass {
  return (
    typeof target === 'function' &&
    Reflect.hasMetadata(MODULE_METADATA_KEY, target)
  );
}
