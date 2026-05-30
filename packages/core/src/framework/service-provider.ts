import type { EventEmitterService } from '../shared/events/event-emitter.service.server';
import type { AnyRouter } from '@trpc/server';
import { Container } from 'inversify';
import type { RouteObject } from 'react-router';
import type { ModuleClass } from '../di';

/**
 * Service Provider Interface
 *
 * Similar to Laravel's Service Provider pattern.
 * Allows users to extend the framework by registering:
 * - @Module classes (preferred - handles providers, routers, and events)
 * - tRPC routers
 * - React Router routes
 * - Event listeners
 *
 * Job handlers are registered in @Module providers using multi-injection:
 * { provide: JOB_HANDLER, useClass: MyHandler, multi: true }
 *
 * Core modules load first, then user modules.
 *
 * @example
 * ```typescript
 * @Module({
 *   providers: [MyService],
 *   trpcRouters: { myFeature: myRouter },
 *   events: [
 *     { event: UserCreatedEvent, listener: sendWelcomeEmail },
 *   ],
 * })
 * class MyModule {}
 *
 * // In createCruzApp:
 * createCruzApp({ modules: [MyModule], ... })
 * ```
 */
export interface ServiceProvider {
  /**
   * The @Module class for this provider.
   * When specified, the module's providers, routers, and events are automatically loaded.
   */
  module?: ModuleClass;

  /**
   * Register services in the DI container.
   */
  register?(container: Container): void | Promise<void>;

  /**
   * Register tRPC routers.
   */
  registerRouters?():
    | Record<string, AnyRouter>
    | Promise<Record<string, AnyRouter>>;

  /**
   * Register React Router routes
   * Returns an array of route objects
   */
  registerRoutes?(): RouteObject[] | Promise<RouteObject[]>;

  /**
   * Register event listeners.
   */
  registerEventListeners?(
    container: Container,
    eventEmitter: EventEmitterService
  ): void | Promise<void>;

  /**
   * Boot method - called after all providers are registered
   * Use this for any initialization that depends on other services
   */
  boot?(container: Container): void | Promise<void>;
}
