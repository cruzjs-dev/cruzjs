/**
 * Call Procedure
 *
 * Utility to call a tRPC procedure directly without HTTP transport.
 * Works with tRPC v11 by creating a standalone caller from the procedure's router.
 *
 * @example
 * ```typescript
 * import { callProcedure } from '@cruzjs/core/testing';
 * import { createTestContext } from '@cruzjs/core/testing';
 * import { myRouter } from './my.trpc';
 *
 * const ctx = createTestContext();
 * const caller = createRouterCaller(myRouter, ctx);
 * const result = await caller.list({ page: 1 });
 * ```
 */

import type { Context } from '../trpc/context';
import type { AnyTRPCRouter } from '@trpc/server';

/**
 * Create a tRPC caller from a router and context.
 *
 * Uses tRPC v11's `createCallerFactory` pattern to invoke procedures
 * directly without HTTP. This is the recommended approach for testing
 * tRPC routers.
 *
 * @param router - A tRPC router (created via `router({ ... })`)
 * @param ctx - The tRPC context (use `createTestContext()` for tests)
 * @returns A caller object with the same shape as the router's procedures
 *
 * @example
 * ```typescript
 * const caller = createRouterCaller(userRouter, ctx);
 * const user = await caller.getById({ id: '123' });
 * ```
 */
export function createRouterCaller<TRouter extends AnyTRPCRouter>(
  routerInstance: TRouter,
  ctx: Context,
) {
  return routerInstance.createCaller(ctx);
}

/**
 * Call a single procedure on a router.
 *
 * Convenience wrapper for calling one procedure by name without creating
 * a full caller object.
 *
 * @param routerInstance - The tRPC router
 * @param procedureName - Name of the procedure to call
 * @param ctx - The tRPC context
 * @param input - Optional input for the procedure
 * @returns The procedure result
 *
 * @example
 * ```typescript
 * const result = await callProcedure(userRouter, 'getById', ctx, { id: '123' });
 * ```
 */
export async function callProcedure<TRouter extends AnyTRPCRouter>(
  routerInstance: TRouter,
  procedureName: string,
  ctx: Context,
  input?: unknown,
): Promise<unknown> {
  const caller = routerInstance.createCaller(ctx);
  const procedure = (caller as Record<string, Function>)[procedureName];

  if (typeof procedure !== 'function') {
    throw new Error(
      `Procedure "${procedureName}" not found on router. ` +
      `Available procedures: ${Object.keys(caller as object).join(', ')}`,
    );
  }

  return procedure(input);
}
