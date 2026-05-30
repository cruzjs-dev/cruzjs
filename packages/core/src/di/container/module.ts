/**
 * Module Helper
 *
 * Simplified ContainerModule creation with Aurora-aware binding.
 */

import { ContainerModule, type BindInWhenOnFluentSyntax, type ContainerModuleLoadOptions } from 'inversify';
import { getToken } from '../tokens/token-registry';
import type { ServiceClass } from '../types';

/**
 * Aurora-aware binding function type.
 * Takes a service class and returns the binding syntax.
 */
export interface CruzBinder {
  <T>(serviceClass: ServiceClass<T>): BindInWhenOnFluentSyntax<T>;
}

/**
 * Raw binding options from Inversify's ContainerModule.
 */
export type RawBindingOptions = ContainerModuleLoadOptions;

/**
 * Create a ContainerModule with Aurora-aware binding.
 *
 * Provides a simplified `bind` function that accepts class references
 * and automatically handles Symbol.for() token generation. Also exposes
 * the raw Inversify binding options for infrastructure bindings.
 *
 * @example
 * ```typescript
 * // Simple module with class-based binding
 * export const CohortContainer = createModule((bind) => {
 *   bind(CohortService).inSingletonScope();
 *   bind(SourcesService).inSingletonScope();
 * });
 *
 * // Module with both Aurora and raw bindings
 * export const SharedContainer = createModule((bind, raw) => {
 *   // Aurora-style class binding
 *   bind(ConfigService).inSingletonScope();
 *   bind(Logger).inSingletonScope();
 *
 *   // Raw binding for infrastructure tokens
 *   raw.bind(DRIZZLE).toConstantValue(DrizzleService.getDb());
 *   raw.bind(POOL).toConstantValue(DrizzleService.getPool());
 * });
 * ```
 *
 * @param callback - Function that receives the bind helper and raw options
 * @returns A ContainerModule that can be loaded into a container
 */
export function createModule(
  callback: (bind: CruzBinder, raw: RawBindingOptions) => void
): ContainerModule {
  return new ContainerModule((options) => {
    // Create Aurora-aware bind function
    const auroraBind: CruzBinder = <T>(serviceClass: ServiceClass<T>) => {
      const token = getToken(serviceClass);
      return options.bind<T>(token).to(serviceClass);
    };

    // Provide both Aurora bind and raw options
    callback(auroraBind, options);
  });
}
