/**
 * Maintenance Mode tRPC Router
 *
 * Admin-only endpoints for toggling maintenance mode.
 * Status is public (so clients can show the maintenance page).
 */

import { Inject } from '../di';
import { TrpcRouter, Router, Route } from '../trpc/router-class';
import { publicProcedure, protectedProcedure } from '../trpc/context';
import { MaintenanceService } from './maintenance.service';
import { enableMaintenanceSchema } from './maintenance.validation';

@Router()
export class MaintenanceTrpc extends TrpcRouter {
  @Inject(MaintenanceService) private service!: MaintenanceService;

  /**
   * Get current maintenance status (public — no auth required).
   * Does not expose the bypass secret.
   */
  @Route() status = publicProcedure.query(async () => {
    return this.service.getStatus();
  });

  /**
   * Enable maintenance mode (requires authentication).
   */
  @Route() enable = protectedProcedure
    .input(enableMaintenanceSchema)
    .mutation(async ({ ctx, input }) => {
      await this.service.enable({
        message: input.message,
        retryAfter: input.retryAfter,
        secret: input.secret,
        enabledBy: ctx.session.user.id,
      });
      return { success: true };
    });

  /**
   * Disable maintenance mode (requires authentication).
   */
  @Route() disable = protectedProcedure.mutation(async () => {
    await this.service.disable();
    return { success: true };
  });
}
