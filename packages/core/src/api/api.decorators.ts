/**
 * REST API Router Decorators
 *
 * NestJS-style decorators for class-based REST API routers.
 * Provides @ApiRouter, @Get/@Post/etc., and parameter decorators.
 */

import 'reflect-metadata';
import type {
  ApiRouterMetadata,
  ApiRouteMetadata,
  ApiParamMetadata,
  HttpMethod,
  HttpStatus,
} from './api.types';

// ── Metadata keys ────────────────────────────────────────────────────────

const API_ROUTER_METADATA = Symbol.for('cruzjs:api-router');
const ROUTE_METADATA_PREFIX = Symbol.for('cruzjs:api-route:');
const ROUTE_KEYS_METADATA = Symbol.for('cruzjs:api-route-keys');
const PARAMS_METADATA_PREFIX = Symbol.for('cruzjs:api-params:');

const HTTP_CODE_PREFIX = Symbol.for('cruzjs:api-httpcode:');

function routeMetaKey(propertyKey: string): string {
  return `cruzjs:api-route:${propertyKey}`;
}

function httpCodeMetaKey(propertyKey: string): string {
  return `cruzjs:api-httpcode:${propertyKey}`;
}

function paramsMetaKey(propertyKey: string): string {
  return `cruzjs:api-params:${propertyKey}`;
}

// ── Class decorators ─────────────────────────────────────────────────────

/**
 * Marks a class as a REST API router with a route prefix.
 *
 * @example
 * ```typescript
 * @ApiRouter('/api/users')
 * @Injectable()
 * export class UsersApiRouter { ... }
 * ```
 */
export function ApiRouter(prefix: string, options?: { version?: string }): ClassDecorator {
  return (target) => {
    const metadata: ApiRouterMetadata = {
      prefix: prefix.startsWith('/') ? prefix : `/${prefix}`,
      version: options?.version,
    };
    Reflect.defineMetadata(API_ROUTER_METADATA, metadata, target);
    return target;
  };
}

/** @deprecated Use `@ApiRouter(prefix)` instead. */
export const Controller = ApiRouter;

// ── Method decorators ────────────────────────────────────────────────────

function createMethodDecorator(method: HttpMethod, path?: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const key = String(propertyKey);
    const metadata: ApiRouteMetadata = {
      method,
      path: path ?? '',
    };
    Reflect.defineMetadata(routeMetaKey(key), metadata, target.constructor);

    // Track route keys on the class
    const keys: string[] = Reflect.getMetadata(ROUTE_KEYS_METADATA, target.constructor) ?? [];
    if (!keys.includes(key)) {
      keys.push(key);
    }
    Reflect.defineMetadata(ROUTE_KEYS_METADATA, keys, target.constructor);

    return descriptor;
  };
}

export function Get(path?: string): MethodDecorator {
  return createMethodDecorator('GET', path);
}

export function Post(path?: string): MethodDecorator {
  return createMethodDecorator('POST', path);
}

export function Put(path?: string): MethodDecorator {
  return createMethodDecorator('PUT', path);
}

export function Patch(path?: string): MethodDecorator {
  return createMethodDecorator('PATCH', path);
}

export function Delete(path?: string): MethodDecorator {
  return createMethodDecorator('DELETE', path);
}

export function Head(path?: string): MethodDecorator {
  return createMethodDecorator('HEAD', path);
}

export function Options(path?: string): MethodDecorator {
  return createMethodDecorator('OPTIONS', path);
}

/**
 * Override the default HTTP status code for a route handler.
 * Works regardless of decorator ordering (can be placed before or after @Get/@Post/etc.).
 *
 * @example
 * ```typescript
 * @Post()
 * @HttpCode(201)
 * async create(@Body() body: CreateInput) { ... }
 * ```
 */
export function HttpCode(statusCode: number): MethodDecorator {
  return (target, propertyKey) => {
    const key = String(propertyKey);
    // Store separately so it works regardless of decorator application order.
    // TypeScript applies decorators bottom-up, so @HttpCode may fire before @Post.
    Reflect.defineMetadata(httpCodeMetaKey(key), statusCode, target.constructor);
  };
}

// ── Parameter decorators ─────────────────────────────────────────────────

function createParamDecorator(
  type: ApiParamMetadata['type'],
  key?: string,
): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    const methodKey = String(propertyKey);
    const constructor = typeof target === 'function' ? target : target.constructor;
    const existing: ApiParamMetadata[] =
      Reflect.getMetadata(paramsMetaKey(methodKey), constructor) ?? [];
    existing.push({ type, key, index: parameterIndex });
    Reflect.defineMetadata(paramsMetaKey(methodKey), existing, constructor);
  };
}

/**
 * Inject the parsed request body (or a specific field from it).
 *
 * @example
 * ```typescript
 * async create(@Body() body: CreateInput) { ... }
 * async create(@Body('name') name: string) { ... }
 * ```
 */
export function Body(key?: string): ParameterDecorator {
  return createParamDecorator('body', key);
}

/**
 * Inject a URL parameter value.
 *
 * @example
 * ```typescript
 * async get(@Param('id') id: string) { ... }
 * ```
 */
export function Param(key: string): ParameterDecorator {
  return createParamDecorator('param', key);
}

/**
 * Inject a query string parameter (or the full query object as Record).
 *
 * @example
 * ```typescript
 * async list(@Query('page') page?: string) { ... }
 * async list(@Query() query: Record<string, string>) { ... }
 * ```
 */
export function Query(key?: string): ParameterDecorator {
  return createParamDecorator('query', key);
}

/**
 * Inject a request header (or all headers as Record).
 *
 * @example
 * ```typescript
 * async handle(@Headers('authorization') auth: string) { ... }
 * async handle(@Headers() headers: Record<string, string>) { ... }
 * ```
 */
export function Headers(key?: string): ParameterDecorator {
  return createParamDecorator('headers', key);
}

/**
 * Inject the raw Request object.
 */
export function Req(): ParameterDecorator {
  return createParamDecorator('req');
}

/**
 * Inject the current user session (or null if unauthenticated).
 */
export function Session(): ParameterDecorator {
  return createParamDecorator('session');
}

/**
 * Inject the client IP address.
 */
export function Ip(): ParameterDecorator {
  return createParamDecorator('ip');
}

// ── Metadata retrieval ───────────────────────────────────────────────────

/**
 * Get the @ApiRouter metadata for a class.
 */
export function getApiRouterMetadata(target: any): ApiRouterMetadata | undefined {
  return Reflect.getMetadata(API_ROUTER_METADATA, target);
}

/** @deprecated Use `getApiRouterMetadata()` instead. */
export const getControllerMetadata = getApiRouterMetadata;

/**
 * Get the route metadata for a specific method on an API router.
 * Merges @HttpCode metadata if present.
 */
export function getRouteMetadata(target: any, propertyKey: string): ApiRouteMetadata | undefined {
  const meta: ApiRouteMetadata | undefined = Reflect.getMetadata(routeMetaKey(propertyKey), target);
  if (!meta) return undefined;

  // Merge @HttpCode override if set
  const httpCode: number | undefined = Reflect.getMetadata(httpCodeMetaKey(propertyKey), target);
  if (httpCode !== undefined) {
    meta.statusCode = httpCode as HttpStatus;
  }

  return meta;
}

/**
 * Get the parameter metadata for a specific method on an API router.
 */
export function getParamMetadata(target: any, propertyKey: string): ApiParamMetadata[] {
  return Reflect.getMetadata(paramsMetaKey(propertyKey), target) ?? [];
}

/**
 * Get all method names that have @Route decorators on an API router class.
 */
export function getApiRouterRouteKeys(target: any): string[] {
  return Reflect.getMetadata(ROUTE_KEYS_METADATA, target) ?? [];
}

/** @deprecated Use `getApiRouterRouteKeys()` instead. */
export const getControllerRouteKeys = getApiRouterRouteKeys;

/**
 * Check if a class is decorated with @ApiRouter.
 */
export function isApiRouter(target: any): boolean {
  return typeof target === 'function' && Reflect.hasMetadata(API_ROUTER_METADATA, target);
}

/** @deprecated Use `isApiRouter()` instead. */
export const isController = isApiRouter;
