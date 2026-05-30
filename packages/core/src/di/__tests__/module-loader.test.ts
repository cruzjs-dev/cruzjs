import { describe, it, expect, beforeEach } from 'vitest';
import 'reflect-metadata';
import { Container } from 'inversify';
import { injectable } from 'inversify';
import { Module, getModuleMetadata } from '../decorators/module.decorator';
import { setToken, getToken } from '../tokens/token-registry';
import {
  loadModule,
  getCollectedRouters,
  getCollectedRequiredEnv,
} from '../module/module-loader';

// ─── Test helpers ─────────────────────────────────────────────────────────────

/** Create a minimal @injectable() class with a Symbol.for token. */
function createInjectableClass(name: string) {
  @injectable()
  class Service {}
  Object.defineProperty(Service, 'name', { value: name });
  setToken(Service, Symbol.for(name));
  return Service;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('module-loader', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe('loadModule with a simple service provider', () => {
    it('should bind a service class so it is resolvable from the container', () => {
      const TestService = createInjectableClass('MLTestService');

      @Module({ providers: [TestService] })
      class TestModule {}

      loadModule(container, TestModule);

      const token = getToken(TestService);
      expect(container.isBound(token)).toBe(true);

      const instance = container.get(token);
      expect(instance).toBeInstanceOf(TestService);
    });
  });

  describe('loadModule with useValue provider', () => {
    it('should bind a constant value to the specified token', () => {
      const TOKEN = Symbol.for('ml-test-config');
      const configValue = { apiUrl: 'https://test.example.com', retries: 3 };

      @Module({
        providers: [{ provide: TOKEN, useValue: configValue }],
      })
      class ConfigModule {}

      loadModule(container, ConfigModule);

      expect(container.isBound(TOKEN)).toBe(true);
      expect(container.get(TOKEN)).toBe(configValue);
    });
  });

  describe('loadModule with useFactory provider', () => {
    it('should bind using a factory function', () => {
      const TOKEN = Symbol.for('ml-test-factory-value');
      const GREETING_TOKEN = Symbol.for('ml-test-greeting');

      @Module({
        providers: [
          { provide: GREETING_TOKEN, useValue: 'Hello' },
          {
            provide: TOKEN,
            useFactory: (greeting: string) => `${greeting}, World!`,
            inject: [GREETING_TOKEN],
          },
        ],
      })
      class FactoryModule {}

      loadModule(container, FactoryModule);

      expect(container.get(TOKEN)).toBe('Hello, World!');
    });
  });

  describe('loading the same module twice', () => {
    it('should not double-bind providers', () => {
      const TestService = createInjectableClass('MLDupeService');

      @Module({ providers: [TestService] })
      class DuplicateModule {}

      loadModule(container, DuplicateModule);
      loadModule(container, DuplicateModule);

      const token = getToken(TestService);
      // getAll returns all bindings; should be exactly 1, not 2
      const instances = container.getAll(token);
      expect(instances).toHaveLength(1);
    });
  });

  describe('requiredEnv collection', () => {
    it('should collect required environment variable names from the module', () => {
      @Module({
        providers: [],
        requiredEnv: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
      })
      class BillingModule {}

      loadModule(container, BillingModule);

      const envMap = getCollectedRequiredEnv(container);
      expect(envMap.get('STRIPE_SECRET_KEY')).toBe('BillingModule');
      expect(envMap.get('STRIPE_WEBHOOK_SECRET')).toBe('BillingModule');
      expect(envMap.size).toBe(2);
    });

    it('should merge required env from multiple modules', () => {
      @Module({ providers: [], requiredEnv: ['API_KEY'] })
      class ModuleA {}

      @Module({ providers: [], requiredEnv: ['DATABASE_URL'] })
      class ModuleB {}

      loadModule(container, ModuleA);
      loadModule(container, ModuleB);

      const envMap = getCollectedRequiredEnv(container);
      expect(envMap.has('API_KEY')).toBe(true);
      expect(envMap.has('DATABASE_URL')).toBe(true);
    });
  });

  describe('module imports', () => {
    it('should load imported modules first, making their providers available', () => {
      const SharedService = createInjectableClass('MLSharedService');
      const AppService = createInjectableClass('MLAppService');

      @Module({ providers: [SharedService] })
      class SharedModule {}

      @Module({
        imports: [SharedModule],
        providers: [AppService],
      })
      class AppModule {}

      loadModule(container, AppModule);

      expect(container.isBound(getToken(SharedService))).toBe(true);
      expect(container.isBound(getToken(AppService))).toBe(true);
    });
  });

  describe('trpcRouters collection', () => {
    it('should collect tRPC routers from the module', () => {
      const fakeRouter = { _def: {} }; // minimal router-like object

      @Module({
        providers: [],
        trpcRouters: { myFeature: fakeRouter as any },
      })
      class RouterModule {}

      loadModule(container, RouterModule);

      const routers = getCollectedRouters(container);
      expect(routers['myFeature']).toBe(fakeRouter);
    });
  });
});
