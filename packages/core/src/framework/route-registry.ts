import type { AnyRouter } from '@trpc/server';
import { injectable } from 'inversify';
import type { RouteObject } from 'react-router';

/**
 * Route Registry
 * Centralized registry for tRPC routers and React Router routes
 * Allows providers to register routes without modifying core files
 */
@injectable()
export class RouteRegistry {
  private trpcRouters: Map<string, AnyRouter> = new Map();
  private reactRoutes: RouteObject[] = [];

  /**
   * Register a tRPC router
   * @param name - Router name (e.g., 'auth', 'org', 'user')
   * @param router - tRPC router instance
   */
  registerTRPCRouter(name: string, router: AnyRouter): void {
    if (this.trpcRouters.has(name)) {
      console.warn(
        `[RouteRegistry] tRPC router '${name}' already registered, overwriting`
      );
    }
    this.trpcRouters.set(name, router);
  }

  /**
   * Register React Router routes
   * @param routes - Array of route objects
   */
  registerRoutes(routes: RouteObject[]): void {
    this.reactRoutes.push(...routes);
  }

  /**
   * Get all registered tRPC routers
   * @returns Map of router names to router instances
   */
  getTRPCRouters(): Map<string, AnyRouter> {
    return new Map(this.trpcRouters);
  }

  /**
   * Get all registered React Router routes
   * @returns Array of route objects
   */
  getRoutes(): RouteObject[] {
    return [...this.reactRoutes];
  }

  /**
   * Check if a tRPC router is registered
   */
  hasTRPCRouter(name: string): boolean {
    return this.trpcRouters.has(name);
  }

  /**
   * Clear all registered routes (useful for testing)
   */
  clear(): void {
    this.trpcRouters.clear();
    this.reactRoutes = [];
  }
}

