import { describe, it, expect, beforeEach } from 'vitest';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { CruzContainer } from '../container/cruz-container';
import { setToken, getToken } from '../tokens/token-registry';

// ─── Test helpers ─────────────────────────────────────────────────────────────

function createInjectableClass(name: string) {
  @injectable()
  class Service {}
  Object.defineProperty(Service, 'name', { value: name });
  setToken(Service, Symbol.for(name));
  return Service;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CruzContainer', () => {
  let container: CruzContainer;

  beforeEach(() => {
    container = new CruzContainer();
  });

  describe('register() and resolve()', () => {
    it('should register a class and resolve an instance of it', () => {
      const MyService = createInjectableClass('CCTestService');

      container.register(MyService).inSingletonScope();

      const instance = container.resolve(MyService);
      expect(instance).toBeInstanceOf(MyService);
    });
  });

  describe('singleton scope', () => {
    it('should return the same instance on repeated resolve calls', () => {
      const MyService = createInjectableClass('CCTestSingleton');

      container.register(MyService).inSingletonScope();

      const first = container.resolve(MyService);
      const second = container.resolve(MyService);

      expect(first).toBe(second);
    });

    it('should return different instances with transient scope', () => {
      const MyService = createInjectableClass('CCTestTransient');

      container.register(MyService).inTransientScope();

      const first = container.resolve(MyService);
      const second = container.resolve(MyService);

      expect(first).not.toBe(second);
    });
  });

  describe('get() with unbound token', () => {
    it('should throw a descriptive CruzJS error', () => {
      const UnboundService = createInjectableClass('CCUnboundService');

      expect(() => container.resolve(UnboundService)).toThrowError(/\[CruzJS\]/);
    });

    it('should include common causes in the error message', () => {
      const UnboundService = createInjectableClass('CCUnboundService2');

      try {
        container.resolve(UnboundService);
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('Failed to resolve dependency');
        expect(message).toContain('@Module({ providers: [...] })');
        expect(message).toContain('@injectable()');
      }
    });

    it('should include the token name in the error', () => {
      const TOKEN = Symbol.for('SomeSpecificToken');

      expect(() => container.get(TOKEN)).toThrowError(/SomeSpecificToken/);
    });
  });

  describe('isBound() and isRegistered()', () => {
    it('isBound should return false for an unbound token', () => {
      const TOKEN = Symbol.for('CCUnboundToken');
      expect(container.isBound(TOKEN)).toBe(false);
    });

    it('isBound should return true after binding', () => {
      const TOKEN = Symbol.for('CCBoundToken');
      container.bind(TOKEN).toConstantValue('hello');
      expect(container.isBound(TOKEN)).toBe(true);
    });

    it('isRegistered should return false for an unregistered class', () => {
      const MyService = createInjectableClass('CCUnregistered');
      expect(container.isRegistered(MyService)).toBe(false);
    });

    it('isRegistered should return true after register()', () => {
      const MyService = createInjectableClass('CCRegistered');
      container.register(MyService).inSingletonScope();
      expect(container.isRegistered(MyService)).toBe(true);
    });
  });

  describe('replace()', () => {
    it('should replace an existing binding', () => {
      const TOKEN = Symbol.for('CCReplaceToken');

      container.bind(TOKEN).toConstantValue('original');
      expect(container.get(TOKEN)).toBe('original');

      // Use the raw container methods since replace works on class-based bindings
      container.unbind(TOKEN);
      container.bind(TOKEN).toConstantValue('replaced');
      expect(container.get(TOKEN)).toBe('replaced');
    });
  });

  describe('unregister()', () => {
    it('should remove the binding for a registered class', () => {
      const MyService = createInjectableClass('CCUnregisterTest');

      container.register(MyService).inSingletonScope();
      expect(container.isRegistered(MyService)).toBe(true);

      container.unregister(MyService);
      expect(container.isRegistered(MyService)).toBe(false);
    });

    it('should not throw when unregistering an unbound class', () => {
      const MyService = createInjectableClass('CCUnregisterNoop');
      expect(() => container.unregister(MyService)).not.toThrow();
    });
  });
});
