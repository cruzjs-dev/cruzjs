/**
 * RouteRegistry Unit Tests
 *
 * Tests for tRPC router registration, React Router route registration,
 * retrieval, and clearing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RouteRegistry } from '../route-registry';
import type { AnyRouter } from '@trpc/server';
import type { RouteObject } from 'react-router';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function createMockRouter(name: string): AnyRouter {
  return { _def: { name } } as unknown as AnyRouter;
}

function createMockRoute(path: string): RouteObject {
  return { path, element: null };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RouteRegistry', () => {
  let registry: RouteRegistry;

  beforeEach(() => {
    registry = new RouteRegistry();
  });

  // ─── tRPC Router Registration ─────────────────────────────────────────────

  describe('registerTRPCRouter', () => {
    it('registers a tRPC router by name', () => {
      const router = createMockRouter('auth');
      registry.registerTRPCRouter('auth', router);

      expect(registry.hasTRPCRouter('auth')).toBe(true);
    });

    it('getTRPCRouters returns all registered routers', () => {
      const authRouter = createMockRouter('auth');
      const userRouter = createMockRouter('user');
      const orgRouter = createMockRouter('org');

      registry.registerTRPCRouter('auth', authRouter);
      registry.registerTRPCRouter('user', userRouter);
      registry.registerTRPCRouter('org', orgRouter);

      const routers = registry.getTRPCRouters();
      expect(routers.size).toBe(3);
      expect(routers.get('auth')).toBe(authRouter);
      expect(routers.get('user')).toBe(userRouter);
      expect(routers.get('org')).toBe(orgRouter);
    });

    it('overwrites router when same name is registered twice', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const router1 = createMockRouter('auth-v1');
      const router2 = createMockRouter('auth-v2');

      registry.registerTRPCRouter('auth', router1);
      registry.registerTRPCRouter('auth', router2);

      const routers = registry.getTRPCRouters();
      expect(routers.get('auth')).toBe(router2);
      expect(routers.size).toBe(1);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("tRPC router 'auth' already registered"),
      );

      warnSpy.mockRestore();
    });

    it('hasTRPCRouter returns false for unregistered name', () => {
      expect(registry.hasTRPCRouter('nonexistent')).toBe(false);
    });

    it('getTRPCRouters returns a copy (mutations do not affect registry)', () => {
      const router = createMockRouter('auth');
      registry.registerTRPCRouter('auth', router);

      const routers = registry.getTRPCRouters();
      routers.delete('auth');

      // Original registry should be unaffected
      expect(registry.hasTRPCRouter('auth')).toBe(true);
      expect(registry.getTRPCRouters().size).toBe(1);
    });
  });

  // ─── React Router Route Registration ──────────────────────────────────────

  describe('registerRoutes', () => {
    it('registers page routes', () => {
      const routes: RouteObject[] = [
        createMockRoute('/dashboard'),
        createMockRoute('/settings'),
      ];

      registry.registerRoutes(routes);

      const registered = registry.getRoutes();
      expect(registered).toHaveLength(2);
      expect(registered[0].path).toBe('/dashboard');
      expect(registered[1].path).toBe('/settings');
    });

    it('accumulates routes from multiple registrations', () => {
      registry.registerRoutes([createMockRoute('/page-a')]);
      registry.registerRoutes([createMockRoute('/page-b')]);
      registry.registerRoutes([createMockRoute('/page-c')]);

      const routes = registry.getRoutes();
      expect(routes).toHaveLength(3);
    });

    it('getRoutes returns a copy (mutations do not affect registry)', () => {
      registry.registerRoutes([createMockRoute('/dashboard')]);

      const routes = registry.getRoutes();
      routes.push(createMockRoute('/injected'));

      // Original registry should be unaffected
      expect(registry.getRoutes()).toHaveLength(1);
    });

    it('getRoutes returns empty array when no routes registered', () => {
      const routes = registry.getRoutes();
      expect(routes).toEqual([]);
      expect(routes).toHaveLength(0);
    });
  });

  // ─── Clear ────────────────────────────────────────────────────────────────

  describe('clear', () => {
    it('removes all tRPC routers and page routes', () => {
      registry.registerTRPCRouter('auth', createMockRouter('auth'));
      registry.registerTRPCRouter('user', createMockRouter('user'));
      registry.registerRoutes([
        createMockRoute('/dashboard'),
        createMockRoute('/settings'),
      ]);

      // Verify they exist
      expect(registry.getTRPCRouters().size).toBe(2);
      expect(registry.getRoutes()).toHaveLength(2);

      registry.clear();

      expect(registry.getTRPCRouters().size).toBe(0);
      expect(registry.getRoutes()).toHaveLength(0);
      expect(registry.hasTRPCRouter('auth')).toBe(false);
    });

    it('allows re-registration after clear', () => {
      registry.registerTRPCRouter('auth', createMockRouter('auth'));
      registry.clear();

      registry.registerTRPCRouter('auth', createMockRouter('auth-v2'));
      expect(registry.hasTRPCRouter('auth')).toBe(true);
      expect(registry.getTRPCRouters().size).toBe(1);
    });
  });
});
