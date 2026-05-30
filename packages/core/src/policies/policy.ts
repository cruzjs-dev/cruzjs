/**
 * Object-Level Authorization Policies
 *
 * Per-record authorization that goes beyond RBAC.
 * Policies check whether a specific user can perform a specific action
 * on a specific resource instance.
 *
 * @example Define a policy
 * ```typescript
 * const PostPolicy = definePolicy<Post>({
 *   view: (ctx, post) => post.published || post.authorId === ctx.user.id,
 *   update: (ctx, post) => post.authorId === ctx.user.id || ctx.org?.role === 'ADMIN',
 *   delete: (ctx, post) => post.authorId === ctx.user.id || ctx.org?.role === 'OWNER',
 * });
 * ```
 *
 * @example Enforce in a tRPC procedure
 * ```typescript
 * const post = await postService.findById(input.id);
 * await enforce(PostPolicy, 'update', ctx, post);
 * ```
 *
 * @example Check without throwing
 * ```typescript
 * const allowed = await can(PostPolicy, 'update', ctx, post);
 * ```
 */

import { TRPCError } from '@trpc/server';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Context available when evaluating a policy.
 * Derived from the tRPC context's session + org data.
 */
export interface PolicyContext {
  /** The authenticated user */
  user: {
    id: string;
  };
  /** Organization context, present when the request is org-scoped */
  org?: {
    orgId: string;
    role: string;
  } | null;
}

/**
 * Action being checked against a policy.
 * Standard CRUD abilities plus any custom string action.
 */
export type PolicyAbility = 'view' | 'create' | 'update' | 'delete' | 'restore' | (string & {});

/**
 * A policy check function.
 * Receives the actor context and the resource instance, returns whether the action is allowed.
 */
export type PolicyFn<TResource = unknown> = (
  ctx: PolicyContext,
  resource: TResource,
) => boolean | Promise<boolean>;

/**
 * A complete policy for a resource type.
 * Maps ability names to policy check functions.
 */
export type ResourcePolicy<TResource = unknown> = {
  [ability in PolicyAbility]?: PolicyFn<TResource>;
};

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Define a resource policy.
 * Pure type-safe factory — returns the policy object as-is.
 *
 * @example
 * ```typescript
 * const PostPolicy = definePolicy<Post>({
 *   view: (ctx, post) => post.published || post.authorId === ctx.user.id,
 *   update: (ctx, post) => post.authorId === ctx.user.id || ctx.org?.role === 'ADMIN',
 *   delete: (ctx, post) => post.authorId === ctx.user.id || ctx.org?.role === 'OWNER',
 * });
 * ```
 */
export function definePolicy<TResource>(
  policy: ResourcePolicy<TResource>,
): ResourcePolicy<TResource> {
  return policy;
}

// ─── Enforcement ─────────────────────────────────────────────────────────────

/**
 * Enforce a policy — throws `TRPCError` with FORBIDDEN if denied.
 *
 * When no policy function is defined for the given ability, access is **allowed**
 * (fail-open for unconfigured abilities). Define an explicit deny if needed.
 *
 * @throws {TRPCError} with code FORBIDDEN when the policy returns false
 */
export async function enforce<TResource>(
  policy: ResourcePolicy<TResource>,
  ability: PolicyAbility,
  ctx: PolicyContext,
  resource: TResource,
): Promise<void> {
  const fn = policy[ability];
  if (!fn) return; // No policy defined for this ability = allow
  const allowed = await fn(ctx, resource);
  if (!allowed) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Not authorized to ${ability} this resource`,
    });
  }
}

/**
 * Check a policy without throwing.
 * Returns `true` if the action is allowed, `false` otherwise.
 *
 * When no policy function is defined for the given ability, returns `true`.
 */
export async function can<TResource>(
  policy: ResourcePolicy<TResource>,
  ability: PolicyAbility,
  ctx: PolicyContext,
  resource: TResource,
): Promise<boolean> {
  const fn = policy[ability];
  if (!fn) return true;
  return fn(ctx, resource);
}

/**
 * Inverse of `can` — returns `true` when the action is **denied**.
 */
export async function cannot<TResource>(
  policy: ResourcePolicy<TResource>,
  ability: PolicyAbility,
  ctx: PolicyContext,
  resource: TResource,
): Promise<boolean> {
  return !(await can(policy, ability, ctx, resource));
}

// ─── Context Builder ─────────────────────────────────────────────────────────

/**
 * Build a PolicyContext from the tRPC context.
 * Works with both protectedProcedure (session only) and orgProcedure (session + org).
 *
 * @example
 * ```typescript
 * // In a tRPC procedure:
 * const policyCtx = buildPolicyContext(ctx);
 * await enforce(PostPolicy, 'update', policyCtx, post);
 * ```
 */
export function buildPolicyContext(ctx: Record<string, unknown>): PolicyContext {
  const session = ctx['session'] as { user?: { id?: string } } | null;
  const org = ctx['org'] as { orgId?: string; role?: string } | null;

  if (!session?.user?.id) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required for policy evaluation',
    });
  }

  return {
    user: { id: session.user.id },
    org: org?.orgId
      ? { orgId: org.orgId, role: org.role ?? '' }
      : null,
  };
}
