/**
 * tRPC Middleware for Object-Level Policy Enforcement
 *
 * Provides a `withPolicy` middleware that loads a resource and checks
 * a policy before the handler executes. This is useful for mutation
 * procedures where the resource must be fetched and authorized before
 * proceeding.
 *
 * @example
 * ```typescript
 * const InvoicePolicy = definePolicy<Invoice>({
 *   update: (ctx, invoice) => invoice.createdById === ctx.user.id || ctx.org?.role === 'ADMIN',
 *   delete: (ctx, invoice) => invoice.createdById === ctx.user.id || ctx.org?.role === 'OWNER',
 * });
 *
 * @Router()
 * export class InvoicesRouter extends TrpcRouter {
 *   @Inject(InvoicesService) private invoicesService!: InvoicesService;
 *
 *   @Route() update = orgProcedure
 *     .input(z.object({ id: z.string(), data: updateSchema }))
 *     .use(withPolicy(InvoicePolicy, 'update', async ({ input, ctx }) => {
 *       const svc = ctx.container.resolve(InvoicesServiceToken);
 *       return svc.getById(input.id);
 *     }))
 *     .mutation(async ({ ctx, input }) => { ... });
 * }
 * ```
 */

import { TRPCError } from '@trpc/server';
import {
  type ResourcePolicy,
  type PolicyAbility,
  buildPolicyContext,
  enforce,
} from './policy';

/**
 * Function that loads the resource to be authorized.
 * Receives the tRPC middleware opts (input + ctx) and returns the resource
 * instance, or null/undefined if not found.
 */
export type ResourceLoader<TResource, TInput = unknown> = (opts: {
  input: TInput;
  ctx: Record<string, unknown>;
}) => Promise<TResource | null | undefined> | TResource | null | undefined;

/**
 * tRPC middleware for object-level policy enforcement.
 *
 * Loads the resource via `getResource`, builds a `PolicyContext` from the
 * tRPC context, and calls `enforce()`. If the resource is not found,
 * throws NOT_FOUND. If the policy denies access, throws FORBIDDEN.
 *
 * The loaded resource is attached to `ctx.policyResource` so the handler
 * can reuse it without a second DB query.
 *
 * @param policy - The resource policy (created with `definePolicy()`)
 * @param ability - The action to check (e.g. `'update'`, `'delete'`)
 * @param getResource - Async function that loads the resource from input/ctx
 *
 * @example
 * ```typescript
 * @Route() update = orgProcedure
 *   .input(z.object({ id: z.string(), data: updateSchema }))
 *   .use(withPolicy(InvoicePolicy, 'update', async ({ input, ctx }) => {
 *     const svc = ctx.container.resolve(InvoicesServiceToken);
 *     return svc.getById(input.id);
 *   }))
 *   .mutation(async ({ ctx, input }) => {
 *     // ctx.policyResource contains the already-loaded invoice
 *     const invoice = ctx.policyResource;
 *     // ...
 *   });
 * ```
 */
export function withPolicy<TResource>(
  policy: ResourcePolicy<TResource>,
  ability: PolicyAbility,
  getResource: ResourceLoader<TResource>,
) {
  return async (opts: { ctx: any; input: any; next: Function }) => {
    const { ctx, input, next } = opts;

    // Load the resource
    const resource = await getResource({ input, ctx });

    if (resource == null) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Resource not found',
      });
    }

    // Build policy context and enforce
    const policyCtx = buildPolicyContext(ctx as Record<string, unknown>);
    await enforce(policy, ability, policyCtx, resource);

    // Pass the loaded resource downstream so the handler can reuse it
    return next({
      ctx: {
        ...ctx,
        policyResource: resource,
      },
    });
  };
}
