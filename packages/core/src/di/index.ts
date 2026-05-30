/**
 * Aurora DI
 *
 * Dependency injection utilities for the Aurora framework.
 * Wraps Inversify with automatic Symbol.for() token management
 * to ensure compatibility with Vite SSR module isolation.
 *
 * @example
 * ```typescript
 * // Service definition
 * import { Injectable, Inject, Module } from '@cruzjs/core/di';
 *
 * @Injectable()
 * export class CohortService {
 *   constructor(@Inject(DRIZZLE) private db: DrizzleDatabase) {}
 * }
 *
 * // Declarative module (preferred)
 * @Module({
 *   providers: [CohortService],
 * })
 * export class CohortModule {}
 *
 * // Load module into container
 * container.loadModule(CohortModule);
 *
 * // Service resolution
 * const service = container.resolve(CohortService);
 * ```
 *
 * @module @cruzjs/core/di
 */

// Ensure reflect-metadata is loaded before any decorator code
import 'reflect-metadata';

// Types
export type {
  Token,
  ServiceClass,
  ServiceIdentifier,
  InjectableOptions,
} from './types';

// Decorators
export { Injectable } from './decorators/injectable.decorator';
export { Inject, MultiInject, Optional, getPropertyInjections } from './decorators/inject.decorator';
export type { PropertyInjectionEntry } from './decorators/inject.decorator';
export { Module, getModuleMetadata, isModule } from './decorators/module.decorator';

// Tokens
export { createToken } from './tokens/create-token';
export { getToken, setToken, hasToken } from './tokens/token-registry';

// Container
export { CruzContainer } from './container/cruz-container';
export {
  createModule,
  type CruzBinder,
  type RawBindingOptions,
} from './container/module';

// Module system
export type {
  Scope,
  ProviderToken,
  ClassProvider,
  ClassProviderWithOptions,
  ClassConstructor,
  UseClassProvider,
  UseValueProvider,
  UseFactoryProvider,
  UseExistingProvider,
  MultiProvider,
  Provider,
  ModuleClass,
  RouterMap,
  EventClass,
  EventListener,
  EventListenerRegistration,
  ModuleOptions,
  ModuleMetadata,
} from './module/types';

// Type-safe event listeners
export { defineEventListener } from '../shared/events/define-listener';
export type { EventListenerDef } from '../shared/events/define-listener';
export {
  loadModule,
  loadModules,
  getCollectedRouters,
  getCollectedApiRouters,
  getCollectedControllers,
  getCollectedEvents,
} from './module/module-loader';

// Re-export commonly used Inversify types for convenience
export { ContainerModule } from 'inversify';
export type {
  BindInWhenOnFluentSyntax,
  BindToFluentSyntax,
  ContainerModuleLoadOptions,
} from 'inversify';
