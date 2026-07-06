/**
 * Module Loader
 *
 * Loads @Module-decorated classes into an CruzContainer.
 * Handles all provider types, module imports, and router collection.
 */

import type { Container } from 'inversify';
import type {
  Provider,
  ModuleClass,
  UseClassProvider,
  UseValueProvider,
  UseFactoryProvider,
  UseExistingProvider,
  MultiProvider,
  ClassProviderWithOptions,
  ProviderToken,
  RouterMap,
  EventListenerRegistration,
  ClassConstructor,
} from './types';
import type { EventListenerDef } from '../../shared/events/define-listener';
import { getModuleMetadata } from '../decorators/module.decorator';
import { getToken } from '../tokens/token-registry';

// Use Symbol.for to detect @Router()-decorated classes without importing router-class.ts.
// Importing router-class.ts here would create a circular dependency:
// di/index.ts → module-loader → router-class → context → session → drizzle → di/index.ts
// Class-based routers are stored in the RouterMap as class references.
// application.server.ts resolves and builds them after all providers are bound.
const ROUTER_METADATA_KEY = Symbol.for('cruzjs:router');

function isRouterClass(value: unknown): boolean {
  return typeof value === 'function' && Reflect.hasMetadata(ROUTER_METADATA_KEY, value);
}

/**
 * Track loaded modules per container to prevent duplicate loading.
 * Uses WeakMap so containers can be garbage collected.
 */
const loadedModules = new WeakMap<Container, Set<ModuleClass>>();

/**
 * Collect routers from loaded modules for a container.
 * Routers are stored per-container to support per-request containers.
 */
const collectedRouters = new WeakMap<Container, RouterMap>();


/**
 * Collect event listeners from loaded modules for a container.
 * Events are stored per-container to support per-request containers.
 */
const collectedEvents = new WeakMap<Container, (EventListenerRegistration | EventListenerDef)[]>();

/**
 * Collect API routers from loaded modules for a container.
 * Routers are stored per-container to support per-request containers.
 */
const collectedApiRouters = new WeakMap<Container, ClassConstructor[]>();

/**
 * Collect required environment variables from loaded modules for a container.
 * Maps variable name to the module class name that declared it.
 */
const collectedRequiredEnv = new WeakMap<Container, Map<string, string>>();

/**
 * Store modules marked with `lazy: true` for deferred loading.
 * These modules are skipped during the initial `loadModule()` pass and
 * loaded later via `loadLazyModules(container)`.
 */
const lazyModules = new WeakMap<Container, Set<ModuleClass>>();

/**
 * Resolve a provider token to a symbol.
 */
function resolveProviderToken(token: ProviderToken): symbol {
  if (typeof token === 'symbol') return token;
  if (typeof token === 'string') return Symbol.for(token);
  if (typeof token === 'function') return getToken(token);
  throw new Error(`Invalid provider token: ${String(token)}`);
}

// Type guards for provider types
function isUseClassProvider(p: Provider): p is UseClassProvider {
  return typeof p === 'object' && 'useClass' in p && !('multi' in p);
}

function isUseValueProvider(p: Provider): p is UseValueProvider {
  return typeof p === 'object' && 'useValue' in p;
}

function isUseFactoryProvider(p: Provider): p is UseFactoryProvider {
  return typeof p === 'object' && 'useFactory' in p;
}

function isUseExistingProvider(p: Provider): p is UseExistingProvider {
  return typeof p === 'object' && 'useExisting' in p;
}

function isMultiProvider(p: Provider): p is MultiProvider {
  return typeof p === 'object' && 'multi' in p && p.multi === true;
}

function isClassProviderWithOptions(p: Provider): p is ClassProviderWithOptions {
  return (
    typeof p === 'object' &&
    'provide' in p &&
    !('useClass' in p) &&
    !('useValue' in p) &&
    !('useFactory' in p) &&
    !('useExisting' in p) &&
    !('multi' in p)
  );
}

function isSimpleClassProvider(p: Provider): p is new (...args: unknown[]) => unknown {
  return typeof p === 'function';
}

/**
 * Bind a single provider to the container.
 */
function bindProvider(container: Container, provider: Provider): void {
  if (isSimpleClassProvider(provider)) {
    // Simple class - bind with Symbol.for token (primary)
    const token = getToken(provider);
    container.bind(token).to(provider).inSingletonScope();
    // Also bind with class reference for backwards compatibility with @inject(ClassName)
    if (!container.isBound(provider)) {
      container.bind(provider).toService(token);
    }
    return;
  }

  if (isClassProviderWithOptions(provider)) {
    // Class with scope option - bind to itself with specified scope
    const token = resolveProviderToken(provider.provide);
    // Need to get the class if provide is a class
    const targetClass =
      typeof provider.provide === 'function' ? provider.provide : null;
    if (!targetClass) {
      throw new Error(
        `ClassProviderWithOptions requires 'provide' to be a class, got: ${String(provider.provide)}`
      );
    }
    const binding = container.bind(token).to(targetClass);
    if (provider.scope === 'transient') {
      binding.inTransientScope();
    } else {
      binding.inSingletonScope();
    }
    // Also bind with class reference for backwards compatibility
    if (!container.isBound(targetClass)) {
      container.bind(targetClass).toService(token);
    }
    return;
  }

  if (isUseValueProvider(provider)) {
    // UseValue - constant value
    const token = resolveProviderToken(provider.provide);
    container.bind(token).toConstantValue(provider.useValue);
    return;
  }

  if (isMultiProvider(provider)) {
    // Multi - multiple bindings to same token (for @MultiInject)
    const token = resolveProviderToken(provider.provide);
    const binding = container.bind(token).to(provider.useClass);
    if (provider.scope === 'transient') {
      binding.inTransientScope();
    } else {
      binding.inSingletonScope();
    }
    return;
  }

  if (isUseClassProvider(provider)) {
    // UseClass - bind provide token to useClass implementation
    const token = resolveProviderToken(provider.provide);
    // Rebind if already bound (allows later modules to override earlier defaults)
    if (container.isBound(token)) {
      container.unbind(token);
    }
    const binding = container.bind(token).to(provider.useClass);
    if (provider.scope === 'transient') {
      binding.inTransientScope();
    } else {
      binding.inSingletonScope();
    }
    return;
  }

  if (isUseFactoryProvider(provider)) {
    // UseFactory - dynamic factory function
    const token = resolveProviderToken(provider.provide);
    const binding = container.bind(token).toDynamicValue((context) => {
      const deps = (provider.inject ?? []).map((dep) => {
        const depToken = resolveProviderToken(dep);
        return context.get(depToken);
      });
      return provider.useFactory(...deps);
    });
    if (provider.scope === 'transient') {
      binding.inTransientScope();
    } else {
      binding.inSingletonScope();
    }
    return;
  }

  if (isUseExistingProvider(provider)) {
    // UseExisting - alias to another token
    const token = resolveProviderToken(provider.provide);
    const existingToken = resolveProviderToken(provider.useExisting);
    container
      .bind(token)
      .toDynamicValue((context) => context.get(existingToken));
    return;
  }

  throw new Error(`Unknown provider type: ${JSON.stringify(provider)}`);
}

/**
 * Load a @Module-decorated class into a container.
 *
 * - Handles module imports (loads imported modules first)
 * - Prevents duplicate module loading
 * - Processes all provider types
 * - Collects routers for later registration
 *
 * @param container - The container to load into
 * @param moduleClass - The module class to load
 */
export function loadModule(container: Container, moduleClass: ModuleClass): void {
  // Get or create loaded set for this container
  if (!loadedModules.has(container)) {
    loadedModules.set(container, new Set());
  }
  const loaded = loadedModules.get(container)!;

  // Get or create routers map for this container
  if (!collectedRouters.has(container)) {
    collectedRouters.set(container, {});
  }
  const routers = collectedRouters.get(container)!;

  // Get or create events array for this container
  if (!collectedEvents.has(container)) {
    collectedEvents.set(container, []);
  }
  const events = collectedEvents.get(container)!;

  // Get or create API routers array for this container
  if (!collectedApiRouters.has(container)) {
    collectedApiRouters.set(container, []);
  }
  const apiRouters = collectedApiRouters.get(container)!;

  // Get or create required env map for this container
  if (!collectedRequiredEnv.has(container)) {
    collectedRequiredEnv.set(container, new Map());
  }
  const requiredEnv = collectedRequiredEnv.get(container)!;

  // Get or create lazy modules set for this container
  if (!lazyModules.has(container)) {
    lazyModules.set(container, new Set());
  }
  const lazy = lazyModules.get(container)!;

  // Skip if already loaded
  if (loaded.has(moduleClass)) return;
  loaded.add(moduleClass);

  // Get module metadata
  const metadata = getModuleMetadata(moduleClass);
  if (!metadata) {
    throw new Error(
      `${moduleClass.name} is not a valid module. Did you forget @Module()?`
    );
  }

  // Defer lazy modules: store them for later loading via loadLazyModules()
  if (metadata.lazy) {
    lazy.add(moduleClass);
    return;
  }

  // Load imports first (recursive)
  for (const importedModule of metadata.imports ?? []) {
    loadModule(container, importedModule);
  }

  // Process providers
  for (const provider of metadata.providers ?? []) {
    bindProvider(container, provider);
  }

  // Collect routers - merge into the routers map.
  // Class-based routers (@Router() classes) are stored as class references.
  // application.server.ts resolves and builds them after all providers are bound.
  // Supports both trpcRouters (preferred) and routers (deprecated).
  const moduleRouters = metadata.trpcRouters;
  if (moduleRouters) {
    Object.assign(routers, moduleRouters);
  }

  // Collect API routers - append to the apiRouters array
  if (metadata.apiRouters) {
    apiRouters.push(...metadata.apiRouters);
  }

  // Collect events - append to the events array
  if (metadata.events) {
    events.push(...metadata.events);
  }

  // Collect required environment variables
  if (metadata.requiredEnv) {
    for (const envVar of metadata.requiredEnv) {
      requiredEnv.set(envVar, moduleClass.name);
    }
  }
}

/**
 * Load multiple modules into a container.
 *
 * @param container - The container to load into
 * @param modules - The module classes to load
 */
export function loadModules(container: Container, modules: ModuleClass[]): void {
  for (const moduleClass of modules) {
    loadModule(container, moduleClass);
  }
}

/**
 * Get all routers collected from loaded modules.
 * Values may be tRPC router instances OR class references (@Router()-decorated classes).
 * Class-based routers are resolved and built by application.server.ts in Phase 2.
 *
 * @param container - The container to get routers for
 * @returns Map of router names to router instances or class references
 */
export function getCollectedRouters(container: Container): RouterMap {
  return collectedRouters.get(container) ?? {};
}

/**
 * Get all API routers collected from loaded modules.
 *
 * @param container - The container to get API routers for
 * @returns Array of API router class constructors
 */
export function getCollectedApiRouters(container: Container): ClassConstructor[] {
  return collectedApiRouters.get(container) ?? [];
}

/** @deprecated Use `getCollectedApiRouters()` instead. */
export const getCollectedControllers = getCollectedApiRouters;

/**
 * Get all event listeners collected from loaded modules.
 *
 * @param container - The container to get events for
 * @returns Array of event listener registrations
 */
export function getCollectedEvents(container: Container): (EventListenerRegistration | EventListenerDef)[] {
  return collectedEvents.get(container) ?? [];
}

/**
 * Get all required environment variables collected from loaded modules.
 *
 * @param container - The container to get required env for
 * @returns Map of variable names to the module name that declared them
 */
export function getCollectedRequiredEnv(container: Container): Map<string, string> {
  return collectedRequiredEnv.get(container) ?? new Map();
}

/**
 * Load all modules that were deferred with `lazy: true` during the initial
 * `loadModule()` / `loadModules()` pass.
 *
 * Lazy modules are fully loaded (providers bound, routers/events collected)
 * exactly as if they had been loaded eagerly. Once loaded, they are removed
 * from the lazy set and will not be processed again.
 *
 * **Intended use case:** Call this at an appropriate time after the initial
 * container build — for example, on the first request that hits a route
 * owned by a lazy module, or in a background task after startup.
 *
 * @param container - The container to load lazy modules into
 * @returns The number of lazy modules that were loaded
 *
 * @example
 * ```typescript
 * // In a middleware or route handler:
 * const loaded = loadLazyModules(container);
 * if (loaded > 0) {
 *   console.log(`Loaded ${loaded} deferred module(s)`);
 * }
 * ```
 */
export function loadLazyModules(container: Container): number {
  const lazy = lazyModules.get(container);
  if (!lazy || lazy.size === 0) return 0;

  const modules = [...lazy];
  lazy.clear();

  // Remove the loaded flag so loadModule can process them
  const loaded = loadedModules.get(container);
  for (const mod of modules) {
    loaded?.delete(mod);
  }

  // Temporarily clear the lazy flag in metadata so loadModule processes normally
  for (const mod of modules) {
    const metadata = getModuleMetadata(mod);
    if (metadata) {
      metadata.lazy = false;
    }
  }

  // Load each deferred module through the standard path
  for (const mod of modules) {
    loadModule(container, mod);
  }

  // Restore the lazy flag on metadata (so the decorator metadata stays truthful)
  for (const mod of modules) {
    const metadata = getModuleMetadata(mod);
    if (metadata) {
      metadata.lazy = true;
    }
  }

  return modules.length;
}

/**
 * Get all modules that are currently deferred (marked `lazy: true` but not yet loaded).
 *
 * @param container - The container to check
 * @returns Set of deferred module classes
 */
export function getLazyModules(container: Container): Set<ModuleClass> {
  return lazyModules.get(container) ?? new Set();
}
