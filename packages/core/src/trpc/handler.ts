import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { AnyRouter } from '@trpc/server';
import { createContext, router } from './context';
import { RouteRegistry } from '../framework/route-registry';
import { getOrBuildContainer } from '../framework/application.server';
import { getRegisteredModules } from '../framework/module-registry';
import { CloudflareContext } from '../shared/cloudflare/context';
import type { CruzContainer } from '../di';
import type { ModuleClass } from '../di';

/**
 * Build tRPC router from RouteRegistry.
 * Uses the globally-registered modules unless an explicit override is provided.
 */
export const getAppRouter = async (
  modules?: ModuleClass[]
): Promise<{ appRouter: AnyRouter; container: CruzContainer }> => {
  const resolvedModules = modules ?? getRegisteredModules();
  const { container } = await getOrBuildContainer(resolvedModules);
  const routeRegistry = container.get<RouteRegistry>(RouteRegistry);
  const routers = routeRegistry.getTRPCRouters();

  const routerObj: Record<string, AnyRouter> = {};
  for (const [name, routerInstance] of routers) {
    routerObj[name] = routerInstance;
  }

  return { appRouter: router(routerObj), container };
};

/**
 * Handle a tRPC request.
 *
 * Modules are resolved from the global registry (set by `createCruzApp`).
 * No need to pass modules explicitly from route handlers.
 */
export const handleTRPCRequest = async (
  request: Request,
  params?: Record<string, string | undefined>,
  loadContext?: unknown,
) => {
  if (loadContext) {
    await CloudflareContext.init(loadContext);
  }
  const { appRouter, container } = await getAppRouter();

  // Mutable headers — procedures append Set-Cookie etc; piped back via responseMeta.
  const resHeaders = new Headers();

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: () => createContext(request, params, container, resHeaders),
    responseMeta: () => {
      const headers: Record<string, string> = {};
      resHeaders.forEach((value, key) => {
        headers[key] = value;
      });
      return { headers };
    },
    onError: ({ path, error }) => {
      console.error(
        `tRPC failed on ${path ?? '<no-path>'}: ${error.message}`,
        error.stack
      );
    },
  });
};
