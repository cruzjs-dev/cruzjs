/**
 * Permission-Checked tRPC Procedure Builders
 *
 * Composable procedure variants that enforce RBAC permission checks
 * before the handler executes. These wrap `orgProcedure` with a middleware
 * that resolves `IPermissionService` from the DI container and calls
 * `hasPermission()`.
 *
 * @example
 * ```typescript
 * @Router()
 * export class InvoicesRouter extends TrpcRouter {
 *   @Route() list = orgQuery('invoice:read')
 *     .input(listSchema)
 *     .query(async ({ ctx }) => { ... });
 *
 *   @Route() create = orgMutation('invoice:write')
 *     .input(createSchema)
 *     .mutation(async ({ ctx, input }) => { ... });
 * }
 * ```
 */

import { TRPCError } from '@trpc/server';
import { orgProcedure } from './context';
import { PERMISSION_SERVICE, type IPermissionService } from '../orgs/interfaces';
import type { Permission } from '../orgs/org.models';

/**
 * Middleware that resolves IPermissionService from the DI container
 * and checks the given permission against the org context.
 *
 * Throws FORBIDDEN if the user lacks the required permission.
 */
function requirePermissionMiddleware(permission: string) {
  return async (opts: { ctx: any; next: Function }) => {
    const { ctx, next } = opts;
    const permissionService = ctx.container.get<IPermissionService>(PERMISSION_SERVICE);
    const hasAccess = await permissionService.hasPermission(
      ctx.session.user.id,
      ctx.org.orgId,
      permission as Permission,
    );

    if (!hasAccess) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Permission denied: ${permission}`,
      });
    }

    return next({ ctx });
  };
}

/**
 * Org-scoped query procedure with enforced permission check.
 *
 * @param permission - Permission string to check (e.g. `'invoice:read'`)
 *
 * @example
 * ```typescript
 * @Route() list = orgQuery('invoice:read')
 *   .input(listSchema)
 *   .query(async ({ ctx }) => { ... });
 * ```
 */
export const orgQuery = (permission: string) =>
  orgProcedure.use(requirePermissionMiddleware(permission));

/**
 * Org-scoped mutation procedure with enforced permission check.
 *
 * @param permission - Permission string to check (e.g. `'invoice:write'`)
 *
 * @example
 * ```typescript
 * @Route() create = orgMutation('invoice:write')
 *   .input(createSchema)
 *   .mutation(async ({ ctx, input }) => { ... });
 * ```
 */
export const orgMutation = (permission: string) =>
  orgProcedure.use(requirePermissionMiddleware(permission));

/**
 * Org-scoped subscription procedure with enforced permission check.
 *
 * @param permission - Permission string to check (e.g. `'invoice:read'`)
 *
 * @example
 * ```typescript
 * @Route() onUpdate = orgSubscription('invoice:read')
 *   .subscription(async ({ ctx }) => { ... });
 * ```
 */
export const orgSubscription = (permission: string) =>
  orgProcedure.use(requirePermissionMiddleware(permission));
