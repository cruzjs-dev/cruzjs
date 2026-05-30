/**
 * Aurora Container
 *
 * Extended Inversify Container with Aurora-aware methods.
 * Provides class-based binding and resolution that automatically
 * uses Symbol.for() tokens under the hood.
 */

import { Container } from 'inversify';
import type { BindInWhenOnFluentSyntax, BindToFluentSyntax } from 'inversify';
import { getToken } from '../tokens/token-registry';
import type { ServiceClass } from '../types';
import {
  loadModule,
  loadModules,
  getCollectedRouters,
  getCollectedApiRouters,
  getCollectedControllers,
  getCollectedEvents,
  getCollectedRequiredEnv,
} from '../module/module-loader';
import type { ModuleClass, RouterMap, EventListenerRegistration, ClassConstructor } from '../module/types';
import type { EventListenerDef } from '../../shared/events/define-listener';

/**
 * Aurora-enhanced Inversify Container.
 *
 * Extends the standard Inversify Container with methods that work with
 * class references directly, automatically managing Symbol.for() tokens.
 *
 * @example
 * ```typescript
 * const container = new CruzContainer();
 *
 * // Register using class reference (auto-generates token)
 * container.register(CohortService).inSingletonScope();
 *
 * // Resolve using class reference
 * const cohort = container.resolve(CohortService);
 *
 * // Still supports raw Inversify methods for infrastructure tokens
 * container.bind(DRIZZLE).toConstantValue(db);
 * container.get(DRIZZLE);
 * ```
 */
export class CruzContainer extends Container {
  /**
   * Override get() to handle both symbol tokens and class references.
   *
   * When a class reference is passed, it automatically converts to the
   * Symbol.for() token. This provides backwards compatibility with code
   * that uses container.get(ClassName) directly.
   *
   * @param serviceIdentifier - The service identifier (symbol, string, or class)
   * @returns The resolved instance
   */
  get<T>(serviceIdentifier: symbol | string | ServiceClass<T>): T {
    try {
      // If it's a class/function, convert to token
      if (typeof serviceIdentifier === 'function') {
        const token = getToken(serviceIdentifier as ServiceClass<T>);
        return super.get<T>(token);
      }
      // Otherwise use as-is (symbol or string)
      return super.get<T>(serviceIdentifier);
    } catch (error) {
      throw CruzContainer.buildResolutionError(serviceIdentifier, error);
    }
  }

  /**
   * Override getAll() to handle both symbol tokens and class references.
   */
  getAll<T>(serviceIdentifier: symbol | string | ServiceClass<T>): T[] {
    try {
      if (typeof serviceIdentifier === 'function') {
        const token = getToken(serviceIdentifier as ServiceClass<T>);
        return super.getAll<T>(token);
      }
      return super.getAll<T>(serviceIdentifier);
    } catch (error) {
      throw CruzContainer.buildResolutionError(serviceIdentifier, error);
    }
  }

  /**
   * Register an injectable class using its auto-generated token.
   *
   * @param injectable - The injectable class to register
   * @returns The binding syntax for further configuration
   *
   * @example
   * ```typescript
   * container.register(CohortService).inSingletonScope();
   * container.register(CohortService).inTransientScope();
   * ```
   */
  register<T>(injectable: ServiceClass<T>): BindInWhenOnFluentSyntax<T> {
    const token = getToken(injectable);
    return this.bind<T>(token).to(injectable);
  }

  /**
   * Resolve an injectable by its class reference.
   *
   * @param injectable - The injectable class to resolve
   * @returns The resolved instance
   *
   * @example
   * ```typescript
   * const cohortService = container.resolve(CohortService);
   * ```
   */
  resolve<T>(injectable: ServiceClass<T>): T {
    try {
      const token = getToken(injectable);
      return this.get<T>(token);
    } catch (error) {
      // If get() already wrapped it with our message, re-throw as-is
      if (error instanceof Error && error.message.startsWith('[CruzJS]')) {
        throw error;
      }
      throw CruzContainer.buildResolutionError(injectable, error);
    }
  }

  /**
   * Resolve all implementations of an injectable.
   *
   * @param injectable - The injectable class to resolve
   * @returns Array of resolved instances
   *
   * @example
   * ```typescript
   * const handlers = container.resolveAll(JobHandler);
   * ```
   */
  resolveAll<T>(injectable: ServiceClass<T>): T[] {
    const token = getToken(injectable);
    return this.getAll<T>(token);
  }

  /**
   * Check if an injectable is registered.
   *
   * @param injectable - The injectable class to check
   * @returns True if the injectable has a binding
   */
  isRegistered(injectable: ServiceClass): boolean {
    const token = getToken(injectable);
    return this.isBound(token);
  }

  /**
   * Unregister an injectable.
   *
   * @param injectable - The injectable class to unregister
   */
  unregister(injectable: ServiceClass): void {
    const token = getToken(injectable);
    if (this.isBound(token)) {
      this.unbind(token);
    }
  }

  /**
   * Replace an injectable registration (unregister if exists, then register).
   *
   * Useful for replacing default implementations with custom ones.
   *
   * @param injectable - The injectable class to replace
   * @returns The binding syntax for the new binding
   *
   * @example
   * ```typescript
   * // Replace default implementation
   * container.replace(UserHydrator).to(CustomUserHydrator);
   * ```
   */
  replace<T>(injectable: ServiceClass<T>): BindToFluentSyntax<T> {
    const token = getToken(injectable);
    if (this.isBound(token)) {
      this.unbind(token);
    }
    return this.bind<T>(token);
  }

  /**
   * Load a @Module-decorated class into the container.
   *
   * Handles module imports (loads imported modules first) and
   * prevents duplicate module loading.
   *
   * @param moduleClass - The module class to load
   *
   * @example
   * ```typescript
   * @Module({
   *   providers: [CohortService, SourcesService],
   * })
   * class PipelineModule {}
   *
   * container.loadModule(PipelineModule);
   * ```
   */
  loadModule(moduleClass: ModuleClass): void {
    loadModule(this, moduleClass);
  }

  /**
   * Load multiple @Module-decorated classes into the container.
   *
   * @param modules - The module classes to load
   *
   * @example
   * ```typescript
   * container.loadModules([SharedModule, AuthModule, PipelineModule]);
   * ```
   */
  loadModules(modules: ModuleClass[]): void {
    loadModules(this, modules);
  }

  /**
   * Get all routers collected from loaded modules.
   *
   * @returns Map of router names to router instances
   *
   * @example
   * ```typescript
   * container.loadModules([AuthModule, PipelineModule]);
   * const routers = container.getCollectedRouters();
   * for (const [name, router] of Object.entries(routers)) {
   *   routeRegistry.registerTRPCRouter(name, router);
   * }
   * ```
   */
  getCollectedRouters(): RouterMap {
    return getCollectedRouters(this);
  }

  /**
   * Get all API routers collected from loaded modules.
   *
   * @returns Array of API router class constructors
   */
  getCollectedApiRouters(): ClassConstructor[] {
    return getCollectedApiRouters(this);
  }

  /** @deprecated Use `getCollectedApiRouters()` instead. */
  getCollectedControllers(): ClassConstructor[] {
    return getCollectedControllers(this);
  }

  /**
   * Get all event listeners collected from loaded modules.
   *
   * @returns Array of event listener registrations
   *
   * @example
   * ```typescript
   * container.loadModules([AuthModule, PipelineModule]);
   * const events = container.getCollectedEvents();
   * for (const { event, listener } of events) {
   *   eventEmitter.on(event, listener);
   * }
   * ```
   */
  getCollectedEvents(): (EventListenerRegistration | EventListenerDef)[] {
    return getCollectedEvents(this);
  }

  /**
   * Get all required environment variables collected from loaded modules.
   *
   * @returns Map of variable names to the module name that declared them
   *
   * @example
   * ```typescript
   * container.loadModules([BillingModule]);
   * const envMap = container.getCollectedRequiredEnv();
   * // Map { 'STRIPE_SECRET_KEY' => 'BillingModule' }
   * ```
   */
  getCollectedRequiredEnv(): Map<string, string> {
    return getCollectedRequiredEnv(this);
  }

  /**
   * Build a descriptive error message for DI resolution failures.
   * Wraps the original Inversify error with common causes and a link to docs.
   */
  private static buildResolutionError(
    token: symbol | string | Function,
    originalError: unknown,
  ): Error {
    const tokenName =
      typeof token === 'symbol'
        ? (token.description ?? String(token))
        : typeof token === 'function'
          ? token.name
          : String(token);

    const message =
      `[CruzJS] Failed to resolve dependency: "${tokenName}"\n` +
      `\n` +
      `Common causes:\n` +
      `  - Service not added to any @Module({ providers: [...] })\n` +
      `  - Module not registered in createCruzApp({ modules: [...] })\n` +
      `  - Missing @injectable() decorator on the service class\n` +
      `  - Circular dependency between services\n` +
      `\n` +
      `See: .claude/kb/03-DI-INVERSIFY.md\n` +
      `\nOriginal error: ${originalError instanceof Error ? originalError.message : String(originalError)}`;

    return new Error(message, { cause: originalError });
  }
}
