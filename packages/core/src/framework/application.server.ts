// Core modules
import { _registerServerFunctions } from './bootstrap';
import { AuthModule } from '../auth/auth.module';
import { CruzContainer, type ModuleClass, getToken } from '../di';
import { EmailModule } from '../email/email.module';
import { isRouterClass, buildRouterFromInstance } from '../trpc/router-class';
import { router } from '../trpc/context';
import { getPropertyInjections } from '../di';
import { JobModule } from '../jobs/job.module';
import { EventEmitterService } from '../shared/events/event-emitter.service.server';
import { SharedModule } from '../shared/shared.module';
import { UploadModule } from '../upload/upload.module';
import { AIModule } from '../ai/ai.module';
import { HttpClientModule } from '../http-client/http-client.module';
import { ApiModule } from '../api/api.module';
import { ApiRouterDispatcher } from '../api/api-router.dispatcher';
import { isApiRouter } from '../api/api.decorators';
import { registerLocalQueueConsumers } from './local-queue-registry';
import { RouteRegistry } from './route-registry';
import type { RuntimeAdapter } from '../runtime';
import { SSE_BACKEND, BROADCAST_ADAPTER } from '../broadcasting';
import { CloudflareContext } from '../shared/cloudflare/context';

/**
 * Core modules loaded by the framework.
 * These are loaded first, before user modules.
 */
const coreModules: ModuleClass[] = [
  SharedModule,
  AuthModule,
  EmailModule,
  JobModule,
  UploadModule,
  AIModule,
  HttpClientModule,
  ApiModule,
];

// ─── Container Cache ─────────────────────────────────────────────────────────
// Module-level singleton — survives across requests in the same Worker isolate.

let cachedContainer: CruzContainer | null = null;
let containerBuildPromise: Promise<CruzContainer> | null = null;

/**
 * Get or build the DI container. The container is built once and cached at
 * module scope so it survives across requests within the same Worker isolate.
 *
 * CloudflareContext.init() must still be called on every request BEFORE this
 * function — the container is cached but per-request env bindings are not.
 *
 * @returns A tuple of [container, freshlyBuilt] where freshlyBuilt indicates
 *          whether the container was just created (true) or retrieved from cache (false).
 */
export async function getOrBuildContainer(
  userModules: ModuleClass[],
  adapter?: RuntimeAdapter,
  configRequiredEnv?: string[],
): Promise<{ container: CruzContainer; freshlyBuilt: boolean }> {
  if (cachedContainer) return { container: cachedContainer, freshlyBuilt: false };

  // Prevent concurrent builds (multiple simultaneous first requests)
  if (!containerBuildPromise) {
    containerBuildPromise = buildContainerWithModules(userModules, adapter, configRequiredEnv)
      .then((container) => {
        cachedContainer = container;
        containerBuildPromise = null;
        return container;
      })
      .catch((err) => {
        containerBuildPromise = null;
        throw err;
      });
  }

  const container = await containerBuildPromise;
  return { container, freshlyBuilt: true };
}

/**
 * Reset the cached container. Useful for testing and Vite HMR during development
 * to force a full container rebuild on the next request.
 */
export function resetContainerCache(): void {
  cachedContainer = null;
  containerBuildPromise = null;
}

/**
 * Build a DI container from an explicit list of module classes.
 * Core framework modules are always loaded first.
 *
 * Prefer `getOrBuildContainer` for production use — this function always
 * creates a new container and should only be called directly for testing
 * or one-off scenarios.
 *
 * @param userModules - Module classes to load
 * @param adapter - Optional runtime adapter
 * @param configRequiredEnv - Required env vars declared in CruzAppConfig
 */
export async function buildContainerWithModules(
  userModules: ModuleClass[],
  adapter?: RuntimeAdapter,
  configRequiredEnv?: string[],
): Promise<CruzContainer> {
  const container = new CruzContainer();

  // Load core modules first
  container.loadModules(coreModules);

  // Phase 1: Load user modules
  for (const mod of userModules) {
    container.loadModule(mod);
  }

  // Phase 1b: Validate required environment variables
  validateRequiredEnv(container, configRequiredEnv);

  // Bind adapter-provided implementations (override module defaults)
  if (adapter) {
    const sseBackend = adapter.getSSEBackend?.();
    if (sseBackend) {
      if (container.isBound(SSE_BACKEND)) container.unbind(SSE_BACKEND);
      container.bind(SSE_BACKEND).toConstantValue(sseBackend);
    }

    const broadcastAdapter = adapter.getBroadcast?.();
    if (broadcastAdapter) {
      if (container.isBound(BROADCAST_ADAPTER)) container.unbind(BROADCAST_ADAPTER);
      container.bind(BROADCAST_ADAPTER).toConstantValue(broadcastAdapter);
    }
  }

  // Phase 2: Collect and register tRPC routers from @Module declarations.
  // Class-based routers (@Router() classes) are resolved from DI and built here.
  const routeRegistry = container.resolve(RouteRegistry);
  const collectedRouters = container.getCollectedRouters();
  for (const [name, routerOrClass] of Object.entries(collectedRouters)) {
    if (isRouterClass(routerOrClass)) {
      const token = getToken(routerOrClass);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instance = container.get(token) as Record<string | symbol, any>;
      // Manually inject @Inject-decorated properties (Inversify v7 doesn't support
      // @inject on regular properties; we store metadata and inject here instead)
      const injections = getPropertyInjections(routerOrClass);
      for (const { propertyKey, token: depToken } of injections) {
        instance[propertyKey as string] = container.get(depToken);
      }
      routeRegistry.registerTRPCRouter(name, buildRouterFromInstance(instance as never, router));
    } else {
      routeRegistry.registerTRPCRouter(name, routerOrClass);
    }
  }

  // Phase 2b: Collect and register API routers from @Module declarations
  try {
    const dispatcher = container.resolve(ApiRouterDispatcher);
    const collectedApiRouters = container.getCollectedApiRouters();
    for (const routerClass of collectedApiRouters) {
      if (!container.isRegistered(routerClass)) {
        container.register(routerClass).inSingletonScope();
      }
      dispatcher.register(routerClass);
    }
  } catch {
    // URLPattern may not be available in all runtimes (e.g. Node.js dev server)
  }

  // Phase 4: Register event listeners from @Module declarations
  const eventEmitter = container.resolve(EventEmitterService);
  const collectedEvents = container.getCollectedEvents();
  for (const { event, listener } of collectedEvents) {
    eventEmitter.on(event, (e: any) => listener(e, container));
  }

  // Phase 6: Register local queue consumers (dev only)
  // Re-registered on every container build to survive Vite HMR module invalidation.
  // In production, queue messages go through the CF queue() handler instead.
  registerLocalQueueConsumers(container);

  return container;
}

/**
 * @deprecated Use `buildContainerWithModules` instead.
 */
export async function buildContainerWithProviders(
  userProviders: Array<{ module?: ModuleClass; [key: string]: unknown }>
): Promise<CruzContainer> {
  const modules = userProviders
    .filter((p) => p.module)
    .map((p) => p.module as ModuleClass);
  return buildContainerWithModules(modules);
}

// ─── Environment Validation ──────────────────────────────────────────────────

/**
 * Validate that all required environment variables are present.
 * Checks CloudflareContext env bindings first, then falls back to process.env.
 *
 * @param container - The container with loaded modules
 * @param configRequiredEnv - Additional env vars from CruzAppConfig
 */
function validateRequiredEnv(
  container: CruzContainer,
  configRequiredEnv?: string[],
): void {
  // Collect from modules
  const moduleEnvMap = container.getCollectedRequiredEnv();

  // Merge config-level required env
  if (configRequiredEnv) {
    for (const envVar of configRequiredEnv) {
      if (!moduleEnvMap.has(envVar)) {
        moduleEnvMap.set(envVar, 'CruzAppConfig');
      }
    }
  }

  if (moduleEnvMap.size === 0) return;

  // Check each variable against CF env and process.env
  const cfEnv = CloudflareContext.current;
  const missing: Array<{ name: string; declaredBy: string }> = [];

  for (const [envVar, declaredBy] of moduleEnvMap) {
    const inCfEnv = cfEnv?.[envVar] !== undefined && cfEnv[envVar] !== null;
    const inProcessEnv = typeof process !== 'undefined' && process.env?.[envVar] !== undefined;

    if (!inCfEnv && !inProcessEnv) {
      missing.push({ name: envVar, declaredBy });
    }
  }

  if (missing.length > 0) {
    const lines = missing.map((m) => `  - ${m.name} (declared by: ${m.declaredBy})`);
    throw new Error(
      `[CruzJS] Missing required environment variables:\n${lines.join('\n')}\n\n` +
      `Set these variables in your .dev.vars file (local) or wrangler.toml / CF dashboard (production).`,
    );
  }
}

// Register server functions so that middleware.ts and api.handler.ts can call
// them without importing this .server.ts file directly.
_registerServerFunctions({ getOrBuildContainer, buildContainerWithModules });

// When modules are registered after the container was already built (common in
// Vite dev SSR where requests arrive before entry.server.tsx finishes loading),
// invalidate the cached container so the next request rebuilds it with all modules.
import { _setOnRegisterCallback } from './module-registry';
_setOnRegisterCallback(() => {
  if (cachedContainer) {
    resetContainerCache();
  }
});
