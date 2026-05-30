/**
 * Rate Limit Decorator
 *
 * Decorator for OOP TrpcRouter routes that applies rate limiting.
 * Stores metadata on the method descriptor; the middleware is applied
 * when the router is built by the module loader.
 *
 * @example
 * ```typescript
 * @Router()
 * export class PostsRouter extends TrpcRouter {
 *   @Inject(RateLimitService) private rateLimitService!: RateLimitService;
 *
 *   @RateLimit({ name: 'api', key: (ctx) => RateLimitService.keyFromUser(ctx.session.user.id) })
 *   @Route() create = protectedProcedure
 *     .input(createPostSchema)
 *     .mutation(async ({ ctx, input }) => this.postsService.create(ctx.session.user.id, input));
 * }
 * ```
 */

const RATE_LIMIT_METADATA_KEY = Symbol.for('cruzjs:rate-limit');

export type RateLimitDecoratorConfig = {
  /** Name of a registered limiter (defined via RateLimitService.defineLimiter()) */
  name: string;
  /** Optional key extractor function; defaults to IP-based extraction */
  key?: (ctx: any) => string;
};

/**
 * Decorator that marks a TrpcRouter route for rate limiting.
 *
 * The rate limit is applied as tRPC middleware when the router is constructed.
 * The named limiter must be registered with RateLimitService.defineLimiter()
 * before any requests are handled.
 */
export function RateLimit(config: RateLimitDecoratorConfig) {
  return function (_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(RATE_LIMIT_METADATA_KEY, config, _target, propertyKey);
    return descriptor;
  };
}

/**
 * Retrieve the RateLimit decorator metadata from a route method.
 */
export function getRateLimitMetadata(
  target: any,
  propertyKey: string,
): RateLimitDecoratorConfig | undefined {
  return Reflect.getMetadata(RATE_LIMIT_METADATA_KEY, target, propertyKey);
}
