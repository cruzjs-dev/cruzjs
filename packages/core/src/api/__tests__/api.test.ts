/**
 * REST API Router Tests
 *
 * Verifies decorators, metadata storage, dispatcher matching/dispatch,
 * ApiResponse builders, and module integration.
 */

import 'urlpattern-polyfill';
import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ApiRouter,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Head,
  Options,
  HttpCode,
  Body,
  Param,
  Query,
  Headers,
  Req,
  Session,
  Ip,
  getApiRouterMetadata,
  getRouteMetadata,
  getParamMetadata,
  getApiRouterRouteKeys,
  isApiRouter,
} from '../api.decorators';
import { ApiResponse } from '../api-response';
import { ApiRouterDispatcher } from '../api-router.dispatcher';
import { Injectable } from '../../di';
import type { HttpStatus } from '../api.types';

// ─── Helper: Create a minimal mock container ─────────────────────────────

function createMockContainer(instances: Map<any, any> = new Map()) {
  return {
    resolve: vi.fn((cls: any) => instances.get(cls) ?? new cls()),
    get: vi.fn((token: any) => instances.get(token)),
    isBound: vi.fn(() => false),
    bind: vi.fn(() => ({ toSelf: () => ({ inSingletonScope: () => {} }) })),
  } as any;
}

// ─── Helper: build a Request with optional body ──────────────────────────

function buildRequest(
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
): Request {
  const init: RequestInit = { method, headers: headers ?? {} };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { ...init.headers, 'Content-Type': 'application/json' } as any;
  }
  return new Request(url, init);
}

// ─── Test API Routers ───────────────────────────────────────────────────

@ApiRouter('/api/users')
@Injectable()
class UsersApiRouter {
  @Get()
  async list(@Query('page') page?: string) {
    return { users: [], page: Number(page ?? 1) };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return { id, name: 'Test User' };
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: any) {
    return { id: 'new-id', ...body };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return { id, ...body };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return null; // Should become 204
  }
}

@ApiRouter('/api/v2/items', { version: 'v2' })
@Injectable()
class ItemsApiRouter {
  @Get()
  async list() {
    return [];
  }

  @Post()
  async create(
    @Body('name') name: string,
    @Headers('authorization') auth: string,
    @Session() session: any,
    @Ip() ip: string | null,
    @Req() req: Request,
  ) {
    return { name, auth, session, ip, hasReq: !!req };
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() body: any) {
    return { id, ...body };
  }
}

class NotAnApiRouter {
  doStuff() {
    return 'hello';
  }
}

@ApiRouter('/api/headers-test')
@Injectable()
class HeadersTestApiRouter {
  @Get()
  async allHeaders(@Headers() headers: Record<string, string>) {
    return headers;
  }

  @Get('query-all')
  async allQuery(@Query() query: Record<string, string>) {
    return query;
  }
}

// ─── Decorator Tests ─────────────────────────────────────────────────────

describe('API Decorators', () => {
  describe('@ApiRouter', () => {
    it('stores prefix metadata on the class', () => {
      const meta = getApiRouterMetadata(UsersApiRouter);
      expect(meta).toBeDefined();
      expect(meta!.prefix).toBe('/api/users');
    });

    it('stores version when provided', () => {
      const meta = getApiRouterMetadata(ItemsApiRouter);
      expect(meta).toBeDefined();
      expect(meta!.prefix).toBe('/api/v2/items');
      expect(meta!.version).toBe('v2');
    });

    it('normalizes prefix to start with /', () => {
      @ApiRouter('no-slash')
      class NoSlash {}
      const meta = getApiRouterMetadata(NoSlash);
      expect(meta!.prefix).toBe('/no-slash');
    });
  });

  describe('@Get, @Post, @Put, @Patch, @Delete, @Head, @Options', () => {
    it('@Get stores GET method with empty path', () => {
      const meta = getRouteMetadata(UsersApiRouter, 'list');
      expect(meta).toBeDefined();
      expect(meta!.method).toBe('GET');
      expect(meta!.path).toBe('');
    });

    it('@Get(":id") stores path with param', () => {
      const meta = getRouteMetadata(UsersApiRouter, 'getById');
      expect(meta!.method).toBe('GET');
      expect(meta!.path).toBe(':id');
    });

    it('@Post stores POST method', () => {
      const meta = getRouteMetadata(UsersApiRouter, 'create');
      expect(meta!.method).toBe('POST');
    });

    it('@Put stores PUT method', () => {
      const meta = getRouteMetadata(UsersApiRouter, 'update');
      expect(meta!.method).toBe('PUT');
    });

    it('@Delete stores DELETE method', () => {
      const meta = getRouteMetadata(UsersApiRouter, 'remove');
      expect(meta!.method).toBe('DELETE');
    });

    it('@Patch stores PATCH method', () => {
      const meta = getRouteMetadata(ItemsApiRouter, 'patch');
      expect(meta!.method).toBe('PATCH');
    });

    it('@Head stores HEAD method', () => {
      @ApiRouter('/test')
      class TestRouter {
        @Head()
        headRoute() {
          return null;
        }
      }
      const meta = getRouteMetadata(TestRouter, 'headRoute');
      expect(meta!.method).toBe('HEAD');
    });

    it('@Options stores OPTIONS method', () => {
      @ApiRouter('/test')
      class TestRouter {
        @Options()
        optionsRoute() {
          return null;
        }
      }
      const meta = getRouteMetadata(TestRouter, 'optionsRoute');
      expect(meta!.method).toBe('OPTIONS');
    });
  });

  describe('@HttpCode', () => {
    it('overrides the status code for a route', () => {
      const meta = getRouteMetadata(UsersApiRouter, 'create');
      expect(meta!.statusCode).toBe(201);
    });
  });

  describe('Parameter decorators', () => {
    it('@Body() resolves full body', () => {
      const params = getParamMetadata(UsersApiRouter, 'create');
      const bodyParam = params.find((p) => p.type === 'body');
      expect(bodyParam).toBeDefined();
      expect(bodyParam!.key).toBeUndefined();
    });

    it('@Body("name") resolves specific field', () => {
      const params = getParamMetadata(ItemsApiRouter, 'create');
      const bodyParam = params.find((p) => p.type === 'body');
      expect(bodyParam).toBeDefined();
      expect(bodyParam!.key).toBe('name');
    });

    it('@Param("id") resolves URL param', () => {
      const params = getParamMetadata(UsersApiRouter, 'getById');
      const paramEntry = params.find((p) => p.type === 'param');
      expect(paramEntry).toBeDefined();
      expect(paramEntry!.key).toBe('id');
    });

    it('@Query("page") resolves query param', () => {
      const params = getParamMetadata(UsersApiRouter, 'list');
      const queryParam = params.find((p) => p.type === 'query');
      expect(queryParam).toBeDefined();
      expect(queryParam!.key).toBe('page');
    });

    it('@Query() resolves full query object', () => {
      const params = getParamMetadata(HeadersTestApiRouter, 'allQuery');
      const queryParam = params.find((p) => p.type === 'query');
      expect(queryParam).toBeDefined();
      expect(queryParam!.key).toBeUndefined();
    });

    it('@Headers("authorization") resolves specific header', () => {
      const params = getParamMetadata(ItemsApiRouter, 'create');
      const headerParam = params.find((p) => p.type === 'headers');
      expect(headerParam).toBeDefined();
      expect(headerParam!.key).toBe('authorization');
    });

    it('@Headers() resolves all headers', () => {
      const params = getParamMetadata(HeadersTestApiRouter, 'allHeaders');
      const headerParam = params.find((p) => p.type === 'headers');
      expect(headerParam).toBeDefined();
      expect(headerParam!.key).toBeUndefined();
    });

    it('@Session() resolves session', () => {
      const params = getParamMetadata(ItemsApiRouter, 'create');
      const sessionParam = params.find((p) => p.type === 'session');
      expect(sessionParam).toBeDefined();
    });

    it('@Ip() resolves IP', () => {
      const params = getParamMetadata(ItemsApiRouter, 'create');
      const ipParam = params.find((p) => p.type === 'ip');
      expect(ipParam).toBeDefined();
    });

    it('@Req() resolves request', () => {
      const params = getParamMetadata(ItemsApiRouter, 'create');
      const reqParam = params.find((p) => p.type === 'req');
      expect(reqParam).toBeDefined();
    });
  });

  describe('getApiRouterRouteKeys', () => {
    it('returns all method names with route decorators', () => {
      const keys = getApiRouterRouteKeys(UsersApiRouter);
      expect(keys).toContain('list');
      expect(keys).toContain('getById');
      expect(keys).toContain('create');
      expect(keys).toContain('update');
      expect(keys).toContain('remove');
      expect(keys.length).toBe(5);
    });
  });

  describe('isApiRouter', () => {
    it('returns true for @ApiRouter classes', () => {
      expect(isApiRouter(UsersApiRouter)).toBe(true);
    });

    it('returns false for plain classes', () => {
      expect(isApiRouter(NotAnApiRouter)).toBe(false);
    });

    it('returns false for non-functions', () => {
      expect(isApiRouter(42)).toBe(false);
      expect(isApiRouter(null)).toBe(false);
    });
  });
});

// ─── ApiRouterDispatcher Tests ──────────────────────────────────────────

describe('ApiRouterDispatcher', () => {
  let dispatcher: ApiRouterDispatcher;

  beforeEach(() => {
    dispatcher = new (ApiRouterDispatcher as any)() as ApiRouterDispatcher;
  });

  describe('register', () => {
    it('builds URLPatterns for all routes on an API router', () => {
      dispatcher.register(UsersApiRouter);
      const routes = dispatcher.listRoutes();
      expect(routes.length).toBe(5);
      expect(routes.map((r) => r.path)).toContain('/api/users');
      expect(routes.map((r) => r.path)).toContain('/api/users/:id');
    });

    it('throws for non-API-router classes', () => {
      expect(() => dispatcher.register(NotAnApiRouter)).toThrow('not decorated with @ApiRouter');
    });
  });

  describe('match', () => {
    beforeEach(() => {
      dispatcher.register(UsersApiRouter);
    });

    it('matches GET /api/users', () => {
      const request = buildRequest('GET', 'http://localhost/api/users');
      const result = dispatcher.match(request);
      expect(result).not.toBeNull();
      expect(result!.entry.methodKey).toBe('list');
    });

    it('matches GET /api/users/123', () => {
      const request = buildRequest('GET', 'http://localhost/api/users/123');
      const result = dispatcher.match(request);
      expect(result).not.toBeNull();
      expect(result!.entry.methodKey).toBe('getById');
    });

    it('matches POST /api/users', () => {
      const request = buildRequest('POST', 'http://localhost/api/users');
      const result = dispatcher.match(request);
      expect(result).not.toBeNull();
      expect(result!.entry.methodKey).toBe('create');
    });

    it('returns null for non-matching routes', () => {
      const request = buildRequest('GET', 'http://localhost/api/posts');
      const result = dispatcher.match(request);
      expect(result).toBeNull();
    });

    it('returns null for wrong HTTP method', () => {
      const request = buildRequest('PATCH', 'http://localhost/api/users');
      const result = dispatcher.match(request);
      expect(result).toBeNull();
    });
  });

  describe('dispatch', () => {
    beforeEach(() => {
      dispatcher.register(UsersApiRouter);
    });

    it('calls router method with resolved params and wraps plain object in JSON response', async () => {
      const request = buildRequest('GET', 'http://localhost/api/users/abc');
      const match = dispatcher.match(request)!;

      const container = createMockContainer(
        new Map([[UsersApiRouter, new UsersApiRouter()]]),
      );

      // Mock getSession to return null (no session)
      vi.mock('@cruzjs/core/shared/middleware/session.middleware', () => ({
        getSession: vi.fn().mockResolvedValue(null),
      }));

      const response = await dispatcher.dispatch(request, container, match.entry, match.urlMatch);
      expect(response.status).toBe(200);
      const json = await response.json() as any;
      expect(json).toEqual({ id: 'abc', name: 'Test User' });
    });

    it('passes through Response objects returned by router', async () => {
      const request = buildRequest('DELETE', 'http://localhost/api/users/abc');
      const match = dispatcher.match(request)!;

      const container = createMockContainer(
        new Map([[UsersApiRouter, new UsersApiRouter()]]),
      );

      const response = await dispatcher.dispatch(request, container, match.entry, match.urlMatch);
      // null return -> 204 No Content
      expect(response.status).toBe(204);
    });

    it('resolves @Body() from JSON request body', async () => {
      const body = { name: 'Alice', email: 'alice@example.com' };
      const request = buildRequest('POST', 'http://localhost/api/users', body);
      const match = dispatcher.match(request)!;

      const container = createMockContainer(
        new Map([[UsersApiRouter, new UsersApiRouter()]]),
      );

      const response = await dispatcher.dispatch(request, container, match.entry, match.urlMatch);
      expect(response.status).toBe(201);
      const json = await response.json() as any;
      expect(json.name).toBe('Alice');
      expect(json.email).toBe('alice@example.com');
      expect(json.id).toBe('new-id');
    });

    it('resolves @Query("page") from query string', async () => {
      const request = buildRequest('GET', 'http://localhost/api/users?page=3');
      const match = dispatcher.match(request)!;

      const container = createMockContainer(
        new Map([[UsersApiRouter, new UsersApiRouter()]]),
      );

      const response = await dispatcher.dispatch(request, container, match.entry, match.urlMatch);
      const json = await response.json() as any;
      expect(json.page).toBe(3);
    });
  });

  describe('listRoutes', () => {
    it('returns registered routes with metadata', () => {
      dispatcher.register(UsersApiRouter);
      const routes = dispatcher.listRoutes();
      expect(routes.length).toBe(5);
      for (const route of routes) {
        expect(route.controller).toBe('UsersApiRouter');
        expect(route.method).toBeDefined();
        expect(route.path).toBeDefined();
        expect(route.handler).toBeDefined();
      }
    });
  });
});

// ─── ApiResponse Tests ───────────────────────────────────────────────────

describe('ApiResponse', () => {
  it('ok() returns 200 JSON response', async () => {
    const response = ApiResponse.ok({ id: 1, name: 'Test' });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    const json = await response.json() as any;
    expect(json).toEqual({ id: 1, name: 'Test' });
  });

  it('ok() accepts custom headers', async () => {
    const response = ApiResponse.ok({ ok: true }, { 'X-Custom': 'value' });
    expect(response.headers.get('X-Custom')).toBe('value');
  });

  it('created() returns 201 with Location header', async () => {
    const response = ApiResponse.created({ id: 'new' }, '/api/users/new');
    expect(response.status).toBe(201);
    expect(response.headers.get('Location')).toBe('/api/users/new');
    const json = await response.json() as any;
    expect(json).toEqual({ id: 'new' });
  });

  it('created() works without location', async () => {
    const response = ApiResponse.created({ id: 'new' });
    expect(response.status).toBe(201);
    expect(response.headers.get('Location')).toBeNull();
  });

  it('accepted() returns 202', () => {
    const response = ApiResponse.accepted();
    expect(response.status).toBe(202);
  });

  it('noContent() returns 204', () => {
    const response = ApiResponse.noContent();
    expect(response.status).toBe(204);
  });

  it('notFound() returns 404 JSON', async () => {
    const response = ApiResponse.notFound('User not found');
    expect(response.status).toBe(404);
    const json = await response.json() as any;
    expect(json.error.code).toBe('NOT_FOUND');
    expect(json.error.message).toBe('User not found');
    expect(json.timestamp).toBeDefined();
  });

  it('badRequest() with validation errors', async () => {
    const errors = [{ field: 'email', message: 'invalid' }];
    const response = ApiResponse.badRequest('Validation failed', errors);
    expect(response.status).toBe(400);
    const json = await response.json() as any;
    expect(json.error.code).toBe('BAD_REQUEST');
    expect(json.error.details).toEqual(errors);
  });

  it('unauthorized() returns 401', async () => {
    const response = ApiResponse.unauthorized();
    expect(response.status).toBe(401);
    const json = await response.json() as any;
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('forbidden() returns 403', async () => {
    const response = ApiResponse.forbidden();
    expect(response.status).toBe(403);
    const json = await response.json() as any;
    expect(json.error.code).toBe('FORBIDDEN');
  });

  it('conflict() returns 409', async () => {
    const response = ApiResponse.conflict('Already exists');
    expect(response.status).toBe(409);
    const json = await response.json() as any;
    expect(json.error.code).toBe('CONFLICT');
  });

  it('unprocessableEntity() returns 422', async () => {
    const response = ApiResponse.unprocessableEntity('Invalid data', { foo: 'bar' });
    expect(response.status).toBe(422);
    const json = await response.json() as any;
    expect(json.error.code).toBe('UNPROCESSABLE_ENTITY');
    expect(json.error.details).toEqual({ foo: 'bar' });
  });

  it('tooManyRequests() returns 429 with Retry-After', () => {
    const response = ApiResponse.tooManyRequests(60);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
  });

  it('internalError() returns 500', async () => {
    const response = ApiResponse.internalError('Something broke', 'stack trace');
    expect(response.status).toBe(500);
    const json = await response.json() as any;
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(json.error.details).toBe('stack trace');
  });

  it('json() creates generic JSON response', async () => {
    const response = ApiResponse.json({ hello: 'world' }, 299);
    expect(response.status).toBe(299);
    const json = await response.json() as any;
    expect(json).toEqual({ hello: 'world' });
  });

  it('redirect() returns 302 by default', () => {
    const response = ApiResponse.redirect('https://example.com');
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://example.com');
  });

  it('redirect() returns 301 when permanent', () => {
    const response = ApiResponse.redirect('https://example.com', true);
    expect(response.status).toBe(301);
  });
});

// ─── Module apiRouters field ─────────────────────────────────────────────

describe('Module apiRouters field', () => {
  it('is collected by the module decorator', async () => {
    const { Module, getModuleMetadata } = await import('@cruzjs/core/di');

    @Module({
      providers: [UsersApiRouter],
      apiRouters: [UsersApiRouter],
    })
    class TestModule {}

    const metadata = getModuleMetadata(TestModule);
    expect(metadata).toBeDefined();
    expect(metadata!.apiRouters).toContain(UsersApiRouter);
    expect(metadata!.apiRouters!.length).toBe(1);
  });

  it('defaults to empty array when not specified', async () => {
    const { Module, getModuleMetadata } = await import('@cruzjs/core/di');

    @Module({
      providers: [],
    })
    class EmptyModule {}

    const metadata = getModuleMetadata(EmptyModule);
    expect(metadata).toBeDefined();
    expect(metadata!.apiRouters).toEqual([]);
  });
});
