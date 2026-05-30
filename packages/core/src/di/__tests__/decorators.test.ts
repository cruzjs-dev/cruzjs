import { describe, it, expect, beforeEach } from 'vitest';
import 'reflect-metadata';

import { Injectable } from '../decorators/injectable.decorator';
import { Inject, getPropertyInjections } from '../decorators/inject.decorator';
import { Module, getModuleMetadata, isModule } from '../decorators/module.decorator';
import { createToken } from '../tokens/create-token';
import { getToken, setToken, hasToken } from '../tokens/token-registry';

// ── @Injectable() ──────────────────────────────────────────────────────────────

describe('Injectable decorator', () => {
  it('should mark a class as injectable (inversify metadata)', () => {
    @Injectable()
    class TestService {}

    // Inversify v7 stores '@inversifyjs/core/classIsInjectableFlagReflectKey'
    const isInversifyInjectable = Reflect.hasOwnMetadata(
      '@inversifyjs/core/classIsInjectableFlagReflectKey',
      TestService,
    );
    expect(isInversifyInjectable).toBe(true);
  });

  it('should generate a Symbol.for() token from the class name', () => {
    @Injectable()
    class MyServiceA {}

    const token = getToken(MyServiceA);
    expect(typeof token).toBe('symbol');
    expect(token).toBe(Symbol.for('MyServiceA'));
  });

  it('should use a custom name when provided', () => {
    @Injectable({ name: 'CustomTokenName' })
    class SomeService {}

    const token = getToken(SomeService);
    expect(token).toBe(Symbol.for('CustomTokenName'));
  });

  it('should set the token so hasToken() returns true', () => {
    @Injectable()
    class TokenCheckService {}

    expect(hasToken(TokenCheckService)).toBe(true);
  });
});

// ── createToken<T>() ───────────────────────────────────────────────────────────

describe('createToken', () => {
  it('should create a symbol with the provided name', () => {
    const token = createToken<string>('MyToken');
    expect(typeof token).toBe('symbol');
    expect(token).toBe(Symbol.for('MyToken'));
  });

  it('should return the same symbol for the same name', () => {
    const t1 = createToken<number>('SharedToken');
    const t2 = createToken<number>('SharedToken');
    expect(t1).toBe(t2);
  });

  it('should return different symbols for different names', () => {
    const t1 = createToken<string>('TokenAlpha');
    const t2 = createToken<string>('TokenBeta');
    expect(t1).not.toBe(t2);
  });
});

// ── Token Registry ─────────────────────────────────────────────────────────────

describe('Token Registry (setToken / getToken / hasToken)', () => {
  it('setToken + getToken should round-trip', () => {
    class PlainService {}
    const sym = Symbol.for('PlainService');
    setToken(PlainService, sym);
    expect(getToken(PlainService)).toBe(sym);
  });

  it('getToken should auto-generate a token from class name when none set', () => {
    class AutoTokenService {}
    // No setToken call — getToken should create Symbol.for('AutoTokenService')
    const token = getToken(AutoTokenService);
    expect(token).toBe(Symbol.for('AutoTokenService'));
  });

  it('hasToken should return false before setToken', () => {
    class UnsetService {}
    expect(hasToken(UnsetService)).toBe(false);
  });

  it('hasToken should return true after getToken auto-generates', () => {
    class AutoGenService {}
    getToken(AutoGenService); // triggers auto-generation
    expect(hasToken(AutoGenService)).toBe(true);
  });
});

// ── @Module() ──────────────────────────────────────────────────────────────────

describe('Module decorator', () => {
  it('should store module metadata on the class', () => {
    @Injectable()
    class SomeProvider {}

    @Module({
      providers: [SomeProvider],
    })
    class TestModule {}

    const metadata = getModuleMetadata(TestModule);
    expect(metadata).toBeDefined();
    expect(metadata!.providers).toContain(SomeProvider);
    expect(metadata!.moduleClass).toBe(TestModule);
  });

  it('should default empty arrays for optional options', () => {
    @Module({})
    class EmptyModule {}

    const metadata = getModuleMetadata(EmptyModule);
    expect(metadata).toBeDefined();
    expect(metadata!.imports).toEqual([]);
    expect(metadata!.providers).toEqual([]);
    expect(metadata!.trpcRouters).toEqual({});
    expect(metadata!.events).toEqual([]);
  });

  it('should store trpcRouters map', () => {
    const fakeRouter = {} as any;

    @Module({
      trpcRouters: { myRouter: fakeRouter },
    })
    class RouterModule {}

    const metadata = getModuleMetadata(RouterModule);
    expect(metadata!.trpcRouters).toEqual({ myRouter: fakeRouter });
  });

  it('should store requiredEnv', () => {
    @Module({
      requiredEnv: ['STRIPE_KEY', 'API_SECRET'],
    })
    class EnvModule {}

    const metadata = getModuleMetadata(EnvModule);
    expect(metadata!.requiredEnv).toEqual(['STRIPE_KEY', 'API_SECRET']);
  });

  it('should store lazy flag', () => {
    @Module({ lazy: true })
    class LazyModule {}

    const metadata = getModuleMetadata(LazyModule);
    expect(metadata!.lazy).toBe(true);
  });
});

// ── isModule() ─────────────────────────────────────────────────────────────────

describe('isModule', () => {
  it('should return true for @Module decorated classes', () => {
    @Module({})
    class DecoratedModule {}

    expect(isModule(DecoratedModule)).toBe(true);
  });

  it('should return false for plain classes', () => {
    class PlainClass {}
    expect(isModule(PlainClass)).toBe(false);
  });

  it('should return false for non-function values', () => {
    expect(isModule('string')).toBe(false);
    expect(isModule(42)).toBe(false);
    expect(isModule(null)).toBe(false);
    expect(isModule(undefined)).toBe(false);
  });
});

// ── @Inject() property decorator ───────────────────────────────────────────────

describe('Inject property decorator (getPropertyInjections)', () => {
  it('should store property injection metadata', () => {
    const TOKEN = createToken<string>('PropInjectTest');

    class MyRouter {
      @Inject(TOKEN) myProp!: string;
    }

    const injections = getPropertyInjections(MyRouter);
    expect(injections).toHaveLength(1);
    expect(injections[0].propertyKey).toBe('myProp');
    expect(injections[0].token).toBe(TOKEN);
  });

  it('should handle multiple property injections', () => {
    const TOKEN_A = createToken<string>('MultiPropA');
    const TOKEN_B = createToken<number>('MultiPropB');

    class MultiPropRouter {
      @Inject(TOKEN_A) propA!: string;
      @Inject(TOKEN_B) propB!: number;
    }

    const injections = getPropertyInjections(MultiPropRouter);
    expect(injections).toHaveLength(2);
    expect(injections.map((i) => i.propertyKey)).toContain('propA');
    expect(injections.map((i) => i.propertyKey)).toContain('propB');
  });

  it('should resolve class references to tokens via getToken', () => {
    @Injectable()
    class DepService {}

    class ConsumerRouter {
      @Inject(DepService) dep!: DepService;
    }

    const injections = getPropertyInjections(ConsumerRouter);
    expect(injections).toHaveLength(1);
    expect(injections[0].token).toBe(getToken(DepService));
  });
});
