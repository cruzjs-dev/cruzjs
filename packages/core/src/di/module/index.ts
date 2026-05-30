/**
 * Module System
 *
 * NestJS-like declarative module definitions for Aurora DI.
 */

export type {
  Scope,
  ProviderToken,
  ClassProvider,
  ClassProviderWithOptions,
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
} from './types';

export {
  loadModule,
  loadModules,
  getCollectedRouters,
  getCollectedApiRouters,
  getCollectedControllers,
  getCollectedEvents,
} from './module-loader';
