import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { CruzContainer } from '../../di/container/cruz-container';

// ─── Mocks ────────────────────────────────────────────────────────────────────


// Create mock @Module-decorated classes at hoist time so loadModule() accepts them
const moduleMocks = vi.hoisted(() => {
  require('reflect-metadata');
  const { injectable: inv } = require('inversify');
  const MODULE_KEY = Symbol.for('aurora:module');
  const TOKEN_KEY = Symbol.for('aurora:di:token');

  function makeInjectable(name: string) {
    const cls = class {};
    Object.defineProperty(cls, 'name', { value: name });
    const token = Symbol.for(name);
    Reflect.defineMetadata(TOKEN_KEY, token, cls);
    inv()(cls);
    return cls;
  }

  // Services that buildContainerWithModules resolves from the container
  const RouteRegistry = makeInjectable('RouteRegistry');
  RouteRegistry.prototype.registerTRPCRouter = () => {};

  const EventEmitterService = makeInjectable('EventEmitterService');
  EventEmitterService.prototype.on = () => {};

  const ApiRouterDispatcher = makeInjectable('ApiRouterDispatcher');
  ApiRouterDispatcher.prototype.register = () => {};

  function makeModule(name: string, providers: any[] = []) {
    const cls = class {};
    Object.defineProperty(cls, 'name', { value: name });
    Reflect.defineMetadata(MODULE_KEY, {
      moduleClass: cls,
      imports: [],
      providers,
      trpcRouters: {},
      apiRouters: [],
      apiControllers: [],
      events: [],
    }, cls);
    return cls;
  }

  return {
    RouteRegistry,
    EventEmitterService,
    ApiRouterDispatcher,
    AuthModule: makeModule('AuthModule'),
    EmailModule: makeModule('EmailModule'),
    JobModule: makeModule('JobModule'),
    // SharedModule provides the services that application.server.ts resolves
    SharedModule: makeModule('SharedModule', [RouteRegistry, EventEmitterService, ApiRouterDispatcher]),
    UploadModule: makeModule('UploadModule'),
    AIModule: makeModule('AIModule'),
    HttpClientModule: makeModule('HttpClientModule'),
    ApiModule: makeModule('ApiModule'),
  };
});

// Mock core modules so they are no-op @Module classes
vi.mock('@cruzjs/core/auth/auth.module', () => ({
  AuthModule: moduleMocks.AuthModule,
}));
vi.mock('@cruzjs/core/email/email.module', () => ({
  EmailModule: moduleMocks.EmailModule,
}));
vi.mock('@cruzjs/core/jobs/job.module', () => ({
  JobModule: moduleMocks.JobModule,
}));
vi.mock('@cruzjs/core/shared/shared.module', () => ({
  SharedModule: moduleMocks.SharedModule,
}));
vi.mock('@cruzjs/core/upload/upload.module', () => ({
  UploadModule: moduleMocks.UploadModule,
}));
vi.mock('@cruzjs/core/ai/ai.module', () => ({
  AIModule: moduleMocks.AIModule,
}));
vi.mock('@cruzjs/core/http-client/http-client.module', () => ({
  HttpClientModule: moduleMocks.HttpClientModule,
}));
vi.mock('@cruzjs/core/api/api.module', () => ({
  ApiModule: moduleMocks.ApiModule,
}));

// Mock services that are resolved from the container during build
vi.mock('../route-registry', () => ({
  RouteRegistry: moduleMocks.RouteRegistry,
}));

vi.mock('@cruzjs/core/shared/events/event-emitter.service.server', () => ({
  EventEmitterService: moduleMocks.EventEmitterService,
}));

vi.mock('@cruzjs/core/api/api-router.dispatcher', () => ({
  ApiRouterDispatcher: moduleMocks.ApiRouterDispatcher,
}));

vi.mock('@cruzjs/core/trpc/router-class', () => ({
  isRouterClass: () => false,
  buildRouterFromInstance: vi.fn(),
}));

vi.mock('../local-queue-registry', () => ({
  registerLocalQueueConsumers: vi.fn(),
}));

vi.mock('@cruzjs/core/shared/cloudflare/context', () => ({
  CloudflareContext: { current: {} },
}));

vi.mock('@cruzjs/core/broadcasting', () => ({
  SSE_BACKEND: Symbol.for('SSE_BACKEND'),
  BROADCAST_ADAPTER: Symbol.for('BROADCAST_ADAPTER'),
}));

// ─── Import AFTER mocks are set up ───────────────────────────────────────────

const { getOrBuildContainer, resetContainerCache, buildContainerWithModules } =
  await import('../application.server');

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('application.server', () => {
  beforeEach(() => {
    resetContainerCache();
  });

  describe('getOrBuildContainer', () => {
    it('should return a container and freshlyBuilt=true on first call', async () => {
      const result = await getOrBuildContainer([]);

      expect(result.container).toBeInstanceOf(CruzContainer);
      expect(result.freshlyBuilt).toBe(true);
    });

    it('should return the cached container with freshlyBuilt=false on second call', async () => {
      const first = await getOrBuildContainer([]);
      const second = await getOrBuildContainer([]);

      expect(second.container).toBe(first.container);
      expect(second.freshlyBuilt).toBe(false);
    });
  });

  describe('resetContainerCache', () => {
    it('should clear the cache so the next call builds a fresh container', async () => {
      const first = await getOrBuildContainer([]);

      resetContainerCache();

      const second = await getOrBuildContainer([]);
      expect(second.container).not.toBe(first.container);
      expect(second.freshlyBuilt).toBe(true);
    });
  });

  describe('buildContainerWithModules', () => {
    it('should return a CruzContainer instance', async () => {
      const container = await buildContainerWithModules([]);
      expect(container).toBeInstanceOf(CruzContainer);
    });

    it('should always create a new container (not cached)', async () => {
      const a = await buildContainerWithModules([]);
      const b = await buildContainerWithModules([]);
      expect(a).not.toBe(b);
    });
  });

  describe('concurrent getOrBuildContainer calls', () => {
    it('should return the same container for concurrent calls', async () => {
      const [a, b, c] = await Promise.all([
        getOrBuildContainer([]),
        getOrBuildContainer([]),
        getOrBuildContainer([]),
      ]);

      expect(a.container).toBe(b.container);
      expect(b.container).toBe(c.container);
    });
  });
});
