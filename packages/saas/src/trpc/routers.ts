import { AdminTrpc } from '../admin/admin.trpc';
import { BillingTrpc } from '../billing/billing.trpc';
import type { RegisterTrpcOptions } from '@cruzjs/core/trpc/routers';

/**
 * Pro-only routers (admin, billing).
 * Org/member/invitation routers are now in @cruzjs/start and registered via OrgModule.
 *
 * NOTE: Both admin and billing routers are now OOP classes. They are registered via
 * their respective module's trpcRouters. This function keeps the class references
 * for backward compatibility with apps that spread `registerCruzSaasTrpcRouters()`
 * into their appRouter.
 */
const proDefaults = {
  admin: AdminTrpc,
  billing: BillingTrpc,
} as const;

type ProTrpcRouters = typeof proDefaults;

/**
 * Register CruzJS Pro tRPC routers (admin, billing).
 * Org routers have moved to @cruzjs/start.
 *
 * @example
 * ```ts
 * ...registerCruzSaasTrpcRouters({
 *   overrides: {
 *     billing: null, // disable billing router
 *   },
 * }),
 * ```
 */
export function registerCruzSaasTrpcRouters(options?: RegisterTrpcOptions): ProTrpcRouters {
  if (!options?.overrides) return proDefaults;

  const overrides = options.overrides;
  const result: Record<string, any> = {};
  for (const [key, defaultRouter] of Object.entries(proDefaults)) {
    if (key in overrides) {
      if (overrides[key] !== null) {
        result[key] = overrides[key];
      }
    } else {
      result[key] = defaultRouter;
    }
  }

  return result as ProTrpcRouters;
}
