/**
 * OOP-style tRPC Router
 *
 * Provides a class-based approach to defining tRPC routers with DI support.
 * Services are injected via @Inject property decorators.
 * Procedures are marked with @Route() and collected by the module loader.
 *
 * @example
 * ```typescript
 * @Router()
 * export class PostsRouter extends TrpcRouter {
 *   @Inject(PostsService) private postsService!: PostsService;
 *
 *   @Route() listBySubreddit = publicProcedure
 *     .input(z.object({ subredditId: z.string() }))
 *     .query(async ({ input }) => this.postsService.listBySubreddit(input.subredditId));
 *
 *   @Route() create = protectedProcedure
 *     .input(createPostSchema)
 *     .mutation(async ({ ctx, input }) =>
 *       this.postsService.create(ctx.session.user.id, input));
 * }
 *
 * @Module({
 *   providers: [PostsService, PostsRouter],
 *   trpcRouters: { posts: PostsRouter },
 * })
 * export class PostsModule {}
 * ```
 */

import 'reflect-metadata';
import { injectable } from 'inversify';
import type { AnyProcedure, AnyRouter } from '@trpc/server';
import { setToken } from '../di/tokens/token-registry';

// NOTE: We intentionally do NOT import from './context' here to avoid a circular
// dependency: di/index.ts → module-loader → router-class → context → session → drizzle → di/index.ts
// The `router` function is passed as a parameter to buildRouterFromInstance instead.

const ROUTER_METADATA_KEY = Symbol.for('cruzjs:router');
const ROUTE_METADATA_KEY = Symbol.for('cruzjs:route');

/**
 * Abstract base class for OOP-style tRPC routers.
 * Extend this and decorate the class with @Router() to enable DI and route collection.
 */
export abstract class TrpcRouter {}

/**
 * Marks a class as an OOP tRPC router.
 * Automatically makes the class injectable via DI (no need for a separate @Injectable()).
 *
 * @example
 * ```typescript
 * @Router()
 * export class PostsRouter extends TrpcRouter { ... }
 * ```
 */
export function Router(): ClassDecorator {
  return <TFunction extends Function>(target: TFunction): TFunction | void => {
    // Generate and store DI token (Symbol.for(ClassName))
    const token = Symbol.for(target.name);
    setToken(target, token);

    // Make class injectable by Inversify
    injectable()(target as unknown as new (...args: never[]) => object);

    // Mark as a router class for isRouterClass() detection
    Reflect.defineMetadata(ROUTER_METADATA_KEY, true, target);
  };
}

/**
 * Marks a property as a tRPC route to be collected by the module loader.
 * The property must be a valid tRPC procedure (built with publicProcedure, protectedProcedure, etc.).
 *
 * @example
 * ```typescript
 * @Route() list = publicProcedure.query(async () => this.service.list());
 * @Route() create = protectedProcedure.input(schema).mutation(async ({ ctx, input }) => ...);
 * ```
 */
export function Route(): PropertyDecorator {
  return (target, propertyKey) => {
    const routes: (string | symbol)[] =
      Reflect.getMetadata(ROUTE_METADATA_KEY, target.constructor) ?? [];
    routes.push(propertyKey);
    Reflect.defineMetadata(ROUTE_METADATA_KEY, routes, target.constructor);
  };
}

/**
 * Check if a value is a class decorated with @Router().
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRouterClass(value: unknown): value is new (...args: any[]) => TrpcRouter {
  return typeof value === 'function' && Reflect.hasMetadata(ROUTER_METADATA_KEY, value);
}

/**
 * Get all property names marked with @Route() on a router class.
 */
export function getRouteProperties(target: Function): (string | symbol)[] {
  return Reflect.getMetadata(ROUTE_METADATA_KEY, target) ?? [];
}

/**
 * Extracts tRPC procedure properties from a TrpcRouter instance type.
 * Useful for building the AppRouter type from class-based routers.
 *
 * @example
 * ```typescript
 * // router.ts (type-only composition for client)
 * const appRouter = router({
 *   ...registerCruzCoreTrpcRouters(),
 *   posts: router({} as RouterProcedures<PostsTrpc>),
 * });
 * export type AppRouter = typeof appRouter;
 * ```
 */
export type RouterProcedures<T extends TrpcRouter> = {
  [K in keyof T as T[K] extends AnyProcedure ? K : never]: T[K] extends AnyProcedure ? T[K] : never;
};

/**
 * Build a tRPC router from a resolved TrpcRouter instance by collecting all @Route()-marked
 * properties. The `routerFn` is the `router` function from `@cruzjs/core/trpc/context`.
 *
 * We accept `routerFn` as a parameter (rather than importing it directly) to avoid a circular
 * import chain through the DI module system.
 */
export function buildRouterFromInstance(
  instance: TrpcRouter,
  routerFn: (procedures: Record<string, AnyProcedure>) => AnyRouter
): AnyRouter {
  const props = getRouteProperties(instance.constructor as Function);
  const procedures: Record<string, AnyProcedure> = {};
  for (const prop of props) {
    procedures[prop as string] = (instance as unknown as Record<string, AnyProcedure>)[
      prop as string
    ];
  }
  return routerFn(procedures);
}
