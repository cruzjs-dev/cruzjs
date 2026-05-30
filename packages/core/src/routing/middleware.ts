// Dynamic imports keep this module free of decorator-heavy transitive deps so
// React Router's config loader can safely import the routing barrel.
import type { CruzContainer } from '../di';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { _getOrBuildContainerFn } from '../framework/bootstrap';

// ========================================
// EXTENDED ARGS TYPES WITH CONTAINER
// ========================================

export type LoaderFunctionArgsWithContainer = LoaderFunctionArgs & {
  container: CruzContainer;
};

export type ActionFunctionArgsWithContainer = ActionFunctionArgs & {
  container: CruzContainer;
};

// ========================================
// MIDDLEWARE PROCESSOR SYSTEM
// ========================================

export abstract class MiddlewareProcessor {
  abstract handleError(
    error: unknown,
    request: Request,
    context: 'loader' | 'action'
  ): Promise<void>;

  abstract handleStatusCode(
    status: number,
    request: Request,
    context: 'loader' | 'action'
  ): Promise<void>;
}

export class ConsoleLoggerMiddleware extends MiddlewareProcessor {
  async handleError(
    error: unknown,
    request: Request,
    context: 'loader' | 'action'
  ): Promise<void> {
    const message = `${
      context.charAt(0).toUpperCase() + context.slice(1)
    } error: ${error instanceof Error ? error.message : String(error)}`;
    console.error(message, {
      url: request.url,
      method: request.method,
      error,
    });
  }

  async handleStatusCode(
    status: number,
    request: Request,
    context: 'loader' | 'action'
  ): Promise<void> {
    if (status >= 500) {
      console.error(`HTTP ${status} response from ${context}: ${request.url}`);
    } else if (status >= 400) {
      console.warn(`HTTP ${status} response from ${context}: ${request.url}`);
    }
  }
}

const defaultProcessors: MiddlewareProcessor[] = [
  new ConsoleLoggerMiddleware(),
];

const processError = async (
  error: unknown,
  request: Request,
  context: 'loader' | 'action',
  processors: MiddlewareProcessor[]
) => {
  for (const processor of processors) {
    try {
      await processor.handleError(error, request, context);
    } catch (processorError) {
      console.error('Middleware processor error:', processorError);
    }
  }
};

const processStatusCode = async (
  status: number,
  request: Request,
  context: 'loader' | 'action',
  processors: MiddlewareProcessor[]
) => {
  for (const processor of processors) {
    try {
      await processor.handleStatusCode(status, request, context);
    } catch (processorError) {
      console.error('Middleware processor error:', processorError);
    }
  }
};

export type MiddlewareOptions = {
  allowedStatusCodes?: number[];
  processors?: MiddlewareProcessor[];
};

/**
 * Wrap a React Router loader function with Cruz middleware.
 *
 * - Initializes CloudflareContext from the load context
 * - Builds the DI container from registered modules
 * - Passes `container` into the handler args
 * - Logs errors and unexpected status codes
 *
 * @example
 * ```typescript
 * export const loader = async (args: LoaderFunctionArgs) =>
 *   handleCruzLoader([args], async ({ request, container }) => {
 *     const svc = container.get(MyService);
 *     return Response.json(await svc.list());
 *   });
 * ```
 */
export const handleCruzLoader = async <T = unknown>(
  argsArray: [LoaderFunctionArgs],
  fn: (args: LoaderFunctionArgsWithContainer) => Promise<T>,
  options?: MiddlewareOptions
): Promise<T> => {
  const [args] = argsArray;
  const { request } = args;
  const processors = options?.processors ?? defaultProcessors;

  try {
    const [{ CloudflareContext }, { getRegisteredModules }] = await Promise.all([
      import('@cruzjs/core/shared/cloudflare/context'),
      import('@cruzjs/core/framework/module-registry'),
    ]);
    await CloudflareContext.init(args.context);
    const { container } = await _getOrBuildContainerFn()(getRegisteredModules()) as { container: CruzContainer };
    const result = await fn({ ...args, container });

    if (result instanceof Response && result.status >= 400) {
      const isAllowed = options?.allowedStatusCodes?.includes(result.status);
      if (!isAllowed) {
        await processStatusCode(result.status, request, 'loader', processors);
      }
    }

    return result;
  } catch (error) {
    await processError(error, request, 'loader', processors);
    throw error;
  }
};

/**
 * Wrap a React Router action function with Cruz middleware.
 *
 * @example
 * ```typescript
 * export const action = async (args: ActionFunctionArgs) =>
 *   handleCruzAction([args], async ({ request, container }) => {
 *     const svc = container.get(MyService);
 *     const body = await request.json();
 *     return Response.json(await svc.create(body));
 *   });
 * ```
 */
export const handleCruzAction = async <T = unknown>(
  argsArray: [ActionFunctionArgs],
  fn: (args: ActionFunctionArgsWithContainer) => Promise<T>,
  options?: MiddlewareOptions
): Promise<T> => {
  const [args] = argsArray;
  const { request } = args;
  const processors = options?.processors ?? defaultProcessors;

  try {
    const [{ CloudflareContext }, { getRegisteredModules }] = await Promise.all([
      import('@cruzjs/core/shared/cloudflare/context'),
      import('@cruzjs/core/framework/module-registry'),
    ]);
    await CloudflareContext.init(args.context);
    const { container } = await _getOrBuildContainerFn()(getRegisteredModules()) as { container: CruzContainer };
    const result = await fn({ ...args, container });

    if (result instanceof Response && result.status >= 400) {
      const isAllowed = options?.allowedStatusCodes?.includes(result.status);
      if (!isAllowed) {
        await processStatusCode(result.status, request, 'action', processors);
      }
    }

    return result;
  } catch (error) {
    await processError(error, request, 'action', processors);
    throw error;
  }
};

/** @deprecated Use `handleCruzLoader` instead. */
export const withLoaderMiddleware = handleCruzLoader;

/** @deprecated Use `handleCruzAction` instead. */
export const withActionMiddleware = handleCruzAction;

export type { CruzContainer } from '../di';
