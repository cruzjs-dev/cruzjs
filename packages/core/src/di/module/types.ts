/**
 * Module Types
 *
 * Type definitions for the Aurora @Module decorator system.
 * Provides NestJS-like declarative module definitions.
 */

import type { AnyRouter } from '@trpc/server';
import type { AppEvent } from '../../shared/events/event';
import type { TrpcRouter } from '../../trpc/router-class';
import type { CruzContainer } from '../container/cruz-container';
import type { EventListenerDef } from '../../shared/events/define-listener';
import type { ServiceClass, Token } from '../types';

/**
 * Provider scope - controls instance lifecycle
 */
export type Scope = 'singleton' | 'transient';

/**
 * Token that can identify a provider.
 * Can be a class, symbol token, or string.
 */
export type ProviderToken<T = unknown> = ServiceClass<T> | Token<T> | symbol | string;

/**
 * Simple class provider - just the class itself.
 * Binds to itself as a singleton.
 */
export type ClassProvider<T = unknown> = ServiceClass<T>;

/**
 * Class provider with explicit options.
 * Allows specifying scope without changing the binding target.
 */
export interface ClassProviderWithOptions<T = unknown> {
  provide: ProviderToken<T>;
  scope?: Scope;
}

/**
 * UseClass provider - binds one token to a different implementation class.
 * Useful for interfaces/abstractions where you want to swap implementations.
 *
 * @example
 * { provide: UserHydrator, useClass: CustomUserHydrator }
 */
export interface UseClassProvider<T = unknown> {
  provide: ProviderToken<T>;
  useClass: ServiceClass<T>;
  scope?: Scope;
}

/**
 * UseValue provider - binds a token to a constant value.
 * Useful for infrastructure tokens like database connections.
 *
 * @example
 * { provide: DRIZZLE, useValue: DrizzleService.getDb() }
 */
export interface UseValueProvider<T = unknown> {
  provide: ProviderToken<T>;
  useValue: T;
}

/**
 * UseFactory provider - creates the value using a factory function.
 * Dependencies can be injected via the `inject` array.
 *
 * @example
 * {
 *   provide: CacheService,
 *   useFactory: (redis, config) => new CacheService(redis, config.get('cache.ttl')),
 *   inject: [RedisService, ConfigService],
 * }
 */
export interface UseFactoryProvider<T = unknown> {
  provide: ProviderToken<T>;
  useFactory: (...args: unknown[]) => T;
  inject?: ProviderToken[];
  scope?: Scope;
}

/**
 * UseExisting provider - aliases one token to another.
 * Resolving the `provide` token will resolve the `useExisting` token instead.
 *
 * @example
 * { provide: 'DATABASE', useExisting: DRIZZLE }
 */
export interface UseExistingProvider<T = unknown> {
  provide: ProviderToken<T>;
  useExisting: ProviderToken<T>;
}

/**
 * Multi provider - allows multiple implementations for the same token.
 * Use with @MultiInject() to get all implementations.
 *
 * @example
 * { provide: JOB_HANDLER, useClass: SendEmailJobHandler, multi: true }
 * { provide: JOB_HANDLER, useClass: EventListenerJobHandler, multi: true }
 */
export interface MultiProvider<T = unknown> {
  provide: ProviderToken<T>;
  useClass: ServiceClass<T>;
  multi: true;
  scope?: Scope;
}

/**
 * Union of all provider types
 */
export type Provider<T = unknown> =
  | ClassProvider<T>
  | ClassProviderWithOptions<T>
  | UseClassProvider<T>
  | UseValueProvider<T>
  | UseFactoryProvider<T>
  | UseExistingProvider<T>
  | MultiProvider<T>;

/**
 * Module class type - a class decorated with @Module()
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Module class constructors may have varying DI-injected signatures
export type ModuleClass = new (...args: any[]) => unknown;

/**
 * A tRPC router value: either an AnyRouter instance (from `router({...})`)
 * or a class constructor decorated with `@Router()` that extends TrpcRouter.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Constructor type requires `any` for Inversify compatibility
export type TrpcRouterValue = AnyRouter | (new (...args: any[]) => TrpcRouter);

/**
 * Router map - maps router names to tRPC routers (instances or @Router() classes).
 */
export type RouterMap = Record<string, TrpcRouterValue>;

/**
 * Event class type - a class that extends AppEvent
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Event constructors have varying signatures
export type EventClass<T extends AppEvent = AppEvent> = new (...args: any[]) => T;

/**
 * Event listener function type
 */
export type EventListener<T extends AppEvent = AppEvent> = (event: T, container?: CruzContainer) => Promise<void> | void;

/**
 * Event listener registration - binds an event class to a handler.
 * Multiple listeners can be registered for the same event.
 *
 * @example
 * events: [
 *   { event: UserRegisteredEvent, listener: sendWelcomeEmail },
 *   { event: UserRegisteredEvent, listener: createProfile },
 *   { event: OrderCreatedEvent, listener: sendOrderConfirmation },
 * ]
 */
export interface EventListenerRegistration<T extends AppEvent = AppEvent> {
  event: EventClass<T>;
  listener: EventListener<T>;
}

/**
 * Class constructor type for API controllers.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- API router constructors require `any` for Inversify DI compatibility
export type ClassConstructor = new (...args: any[]) => unknown;

// Re-export RouteFactory from routing/types for external consumers
export type { RouteFactory } from '../../routing/types';

// Import locally for use in ModuleOptions/ModuleMetadata below
import type { RouteFactory } from '../../routing/types';

/**
 * Options for the @Module() decorator
 */
export interface ModuleOptions {
  /**
   * Other modules to import. Their providers become available to this module.
   */
  imports?: ModuleClass[];

  /**
   * Providers to register in this module.
   */
  providers?: Provider[];

  /**
   * tRPC routers to register in this module.
   * Maps router names to router instances.
   *
   * @example
   * trpcRouters: {
   *   auth: authTrpc,
   *   org: orgTrpc,
   * }
   */
  trpcRouters?: RouterMap;

  /**
   * Event listeners to register in this module.
   * Multiple listeners can be registered for the same event.
   *
   * @example
   * events: [
   *   { event: UserRegisteredEvent, listener: sendWelcomeEmail },
   *   { event: UserRegisteredEvent, listener: createUserProfile },
   *   { event: OrderCreatedEvent, listener: notifyWarehouse },
   * ]
   */
  events?: (EventListenerRegistration | EventListenerDef)[];

  /**
   * API routers to register in this module.
   * Routers must be decorated with @ApiRouter() and @Injectable().
   *
   * @example
   * apiRouters: [UsersApiRouter, PostsApiRouter]
   */
  apiRouters?: ClassConstructor[];

  /**
   * @deprecated Use `apiRouters` instead.
   */
  apiControllers?: ClassConstructor[];

  /**
   * React Router route config entries for this module.
   * Declared as a factory so helpers are injected at routes.ts build time.
   * Pass module to `createCruzRoutes({ modules: [MyModule] })` to activate.
   *
   * @example
   * pageRoutes: (helpers) => [
   *   ...helpers.prefix('forums', [
   *     helpers.index('features/forum/routes/index.tsx'),
   *     helpers.route(':id', 'features/forum/routes/$id.tsx'),
   *   ]),
   * ]
   */
  pageRoutes?: RouteFactory;

  /**
   * Environment variables that this module requires to function.
   * Validated at container build time (first request). If any are missing,
   * the app will throw with a descriptive error message.
   *
   * @example
   * requiredEnv: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']
   */
  requiredEnv?: string[];

  /**
   * When `true`, the module is deferred during the initial `loadModule()` pass
   * and stored in a lazy-modules set instead. Call `loadLazyModules(container)`
   * later (e.g. on first request to a route owned by this module) to load them.
   *
   * Use this for heavy feature modules that are not needed on every request,
   * such as admin dashboards, analytics, or rarely-used integrations.
   *
   * Lazy modules still participate in router and event collection once loaded,
   * but their providers are not bound until `loadLazyModules` is invoked.
   *
   * @default false
   *
   * @example
   * ```typescript
   * @Module({
   *   lazy: true,
   *   providers: [HeavyAnalyticsService],
   *   trpcRouters: { analytics: AnalyticsTrpc },
   * })
   * export class AnalyticsModule {}
   * ```
   */
  lazy?: boolean;
}

/**
 * Stored module metadata (includes the class reference).
 * Always uses the canonical field names (trpcRouters, pageRoutes).
 */
export interface ModuleMetadata {
  moduleClass: ModuleClass;
  imports?: ModuleClass[];
  providers?: Provider[];
  trpcRouters?: RouterMap;
  apiRouters?: ClassConstructor[];
  /** @deprecated Use `apiRouters` instead. */
  apiControllers?: ClassConstructor[];
  pageRoutes?: RouteFactory;
  events?: (EventListenerRegistration | EventListenerDef)[];
  requiredEnv?: string[];
  lazy?: boolean;
}
