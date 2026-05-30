/**
 * API Router Dispatcher
 *
 * Registers API routers, matches incoming requests to routes,
 * and dispatches them by resolving router instances from the DI container.
 */

import 'reflect-metadata';
import { Injectable } from '../di';
import type { CruzContainer } from '../di';
import {
  getApiRouterMetadata,
  getApiRouterRouteKeys,
  getRouteMetadata,
  getParamMetadata,
} from './api.decorators';
import { getPropertyInjections } from '../di';
import { getSession } from '../shared/middleware/session.middleware';
import type {
  HttpMethod,
  HttpStatus,
  ApiRouteEntry,
  ApiParamMetadata,
} from './api.types';

@Injectable()
export class ApiRouterDispatcher {
  private readonly routes: ApiRouteEntry[] = [];

  /**
   * Register all routes from an API router class.
   * Reads @ApiRouter and @Get/@Post/etc. metadata and builds URLPatterns.
   */
  register(routerClass: new (...args: any[]) => any): void {
    const routerMeta = getApiRouterMetadata(routerClass);
    if (!routerMeta) {
      throw new Error(
        `${routerClass.name} is not decorated with @ApiRouter. Cannot register.`,
      );
    }

    const routeKeys = getApiRouterRouteKeys(routerClass);
    for (const methodKey of routeKeys) {
      const routeMeta = getRouteMetadata(routerClass, methodKey);
      if (!routeMeta) continue;

      const params = getParamMetadata(routerClass, methodKey);
      const fullPath = this.buildPath(routerMeta.prefix, routeMeta.path);
      const pattern = new URLPattern({ pathname: fullPath });

      // Default status code: POST -> 201, DELETE -> 200, others -> 200
      const defaultStatus: HttpStatus =
        routeMeta.method === 'POST' ? 201 : 200;

      this.routes.push({
        method: routeMeta.method,
        pattern,
        rawPath: fullPath,
        controllerClass: routerClass,
        methodKey,
        params,
        statusCode: routeMeta.statusCode ?? defaultStatus,
      });
    }
  }

  /**
   * Find the matching route entry for a request.
   */
  match(
    request: Request,
  ): { entry: ApiRouteEntry; urlMatch: URLPatternResult } | null {
    const method = request.method.toUpperCase() as HttpMethod;
    const url = new URL(request.url);

    for (const entry of this.routes) {
      if (entry.method !== method) continue;
      const result = entry.pattern.exec({ pathname: url.pathname });
      if (result) {
        return { entry, urlMatch: result };
      }
    }
    return null;
  }

  /**
   * Dispatch a request to the matched API router method.
   * Resolves the router from DI, injects parameters, and normalizes the response.
   */
  async dispatch(
    request: Request,
    container: CruzContainer,
    entry: ApiRouteEntry,
    urlMatch: URLPatternResult,
  ): Promise<Response> {
    // Resolve router from DI container
    const instance = container.resolve(entry.controllerClass) as Record<
      string | symbol,
      any
    >;

    // Manually inject @Inject-decorated properties (same pattern as TrpcRouter)
    const injections = getPropertyInjections(entry.controllerClass);
    for (const { propertyKey, token } of injections) {
      instance[propertyKey as string] = container.get(token);
    }

    // Resolve session for @Session() decorator
    const session = await getSession(request, container);

    // Resolve method parameters
    const args = await this.resolveParams(request, entry, urlMatch, session);

    // Call the router method
    const handler = instance[entry.methodKey];
    if (typeof handler !== 'function') {
      throw new Error(
        `${entry.controllerClass.name}.${entry.methodKey} is not a function`,
      );
    }
    const result = await handler.call(instance, ...args);

    return this.normalizeResponse(result, entry.statusCode);
  }

  /**
   * List all registered routes (for debugging/docs).
   */
  listRoutes(): Array<{
    method: HttpMethod;
    path: string;
    controller: string;
    handler: string;
  }> {
    return this.routes.map((r) => ({
      method: r.method,
      path: r.rawPath,
      controller: r.controllerClass.name,
      handler: r.methodKey,
    }));
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private async resolveParams(
    request: Request,
    entry: ApiRouteEntry,
    urlMatch: URLPatternResult,
    session: any,
  ): Promise<unknown[]> {
    // Sort params by index to fill positional args
    const sorted = [...entry.params].sort((a, b) => a.index - b.index);
    if (sorted.length === 0) return [];

    const maxIndex = sorted[sorted.length - 1].index;
    const args: unknown[] = new Array(maxIndex + 1).fill(undefined);

    // Lazily parse body only if needed
    let parsedBody: unknown | undefined;
    let bodyParsed = false;

    for (const param of sorted) {
      switch (param.type) {
        case 'body': {
          if (!bodyParsed) {
            parsedBody = await this.parseBody(request);
            bodyParsed = true;
          }
          if (param.key && parsedBody && typeof parsedBody === 'object') {
            args[param.index] = (parsedBody as Record<string, unknown>)[param.key];
          } else {
            args[param.index] = parsedBody;
          }
          break;
        }
        case 'param': {
          const urlParams = urlMatch.pathname.groups;
          args[param.index] = param.key ? urlParams[param.key] : urlParams;
          break;
        }
        case 'query': {
          const url = new URL(request.url);
          if (param.key) {
            args[param.index] = url.searchParams.get(param.key) ?? undefined;
          } else {
            // Return full query as plain object
            const queryObj: Record<string, string> = {};
            url.searchParams.forEach((value, key) => {
              queryObj[key] = value;
            });
            args[param.index] = queryObj;
          }
          break;
        }
        case 'headers': {
          if (param.key) {
            args[param.index] = request.headers.get(param.key) ?? undefined;
          } else {
            const headersObj: Record<string, string> = {};
            request.headers.forEach((value, key) => {
              headersObj[key] = value;
            });
            args[param.index] = headersObj;
          }
          break;
        }
        case 'req': {
          args[param.index] = request;
          break;
        }
        case 'session': {
          args[param.index] = session;
          break;
        }
        case 'ip': {
          args[param.index] = this.getClientIp(request);
          break;
        }
      }
    }

    return args;
  }

  private async parseBody(request: Request): Promise<unknown> {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      try {
        return await request.json();
      } catch {
        return null;
      }
    }

    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      try {
        const formData = await request.formData();
        const obj: Record<string, unknown> = {};
        formData.forEach((value, key) => {
          obj[key] = value;
        });
        return obj;
      } catch {
        return null;
      }
    }

    // Try JSON as fallback for requests without content-type
    try {
      const text = await request.text();
      if (text) {
        return JSON.parse(text);
      }
    } catch {
      // Ignore parse errors
    }

    return null;
  }

  private getClientIp(request: Request): string | null {
    return (
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      null
    );
  }

  private normalizeResponse(result: unknown, statusCode: HttpStatus): Response {
    // Pass through Response objects directly
    if (result instanceof Response) {
      return result;
    }

    // null/undefined -> 204 No Content
    if (result === null || result === undefined) {
      return new Response(null, { status: 204 });
    }

    // Wrap anything else in JSON
    return new Response(JSON.stringify(result), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Build the full pathname from router prefix and route path.
   * Normalizes slashes: `/users` + `:id` -> `/users/:id`
   */
  private buildPath(prefix: string, path: string): string {
    const normalizedPrefix = prefix.endsWith('/')
      ? prefix.slice(0, -1)
      : prefix;

    if (!path) {
      return normalizedPrefix || '/';
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedPrefix}${normalizedPath}`;
  }
}

/** @deprecated Use `ApiRouterDispatcher` instead. */
export const ControllerDispatcher = ApiRouterDispatcher;
