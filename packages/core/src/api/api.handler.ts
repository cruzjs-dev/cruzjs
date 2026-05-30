/**
 * API Request Handler
 *
 * Entry point for handling REST API requests from React Router route files.
 * Modules are resolved from the global registry set by createCruzApp.
 */

import 'reflect-metadata';
import { _getBuildContainerFn } from '../framework/bootstrap';
import { getRegisteredModules } from '../framework/module-registry';
import { CloudflareContext } from '../shared/cloudflare/context';
import { ApiRouterDispatcher } from './api-router.dispatcher';

/**
 * Handle an API request by matching it against registered API routers.
 *
 * Returns a Response if a router matches, or null if no match (so React Router can continue).
 */
export async function handleApiRequest(
  request: Request,
  loadContext?: unknown,
): Promise<Response | null> {
  if (loadContext) {
    await CloudflareContext.init(loadContext);
  }

  const modules = getRegisteredModules();
  const container = await _getBuildContainerFn()(modules);
  const dispatcher = container.resolve(ApiRouterDispatcher);

  const match = dispatcher.match(request);
  if (!match) {
    return null;
  }

  try {
    return await dispatcher.dispatch(request, container, match.entry, match.urlMatch);
  } catch (error) {
    console.error(
      `[ApiRouter] Error in ${match.entry.controllerClass.name}.${match.entry.methodKey}:`,
      error,
    );

    if (error instanceof Response) {
      return error;
    }

    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal Server Error',
          details: error instanceof Error ? error.message : String(error),
        },
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

/**
 * Get the API router dispatcher from a built container.
 * Convenience method for advanced use cases.
 */
export async function getApiRouterDispatcher(): Promise<ApiRouterDispatcher> {
  const modules = getRegisteredModules();
  const container = await _getBuildContainerFn()(modules);
  return container.resolve(ApiRouterDispatcher);
}

/** @deprecated Use `getApiRouterDispatcher()` instead. */
export const getControllerDispatcher = getApiRouterDispatcher;
