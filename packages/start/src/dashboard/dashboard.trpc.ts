import { orgProcedure, router } from '@cruzjs/core/trpc/context';
import { z } from 'zod';
import { DashboardService } from './dashboard.service';
import {
  CreateDashboardInputSchema,
  UpdateDashboardInputSchema,
  ListDashboardsInputSchema,
  GetDashboardInputSchema,
  DeleteDashboardInputSchema,
  GetWidgetDataInputSchema,
} from './dashboard.types';

/**
 * Dashboard Router
 *
 * tRPC endpoints for dashboard layout CRUD and widget data resolution.
 * All endpoints use orgProcedure for multi-tenant isolation.
 */
export const dashboardTrpc = router({
  /**
   * Create a new dashboard layout.
   */
  create: orgProcedure
    .input(CreateDashboardInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get<DashboardService>(DashboardService);
      return service.createDashboard(ctx.org.org.orgId, ctx.org.org.userId, input);
    }),

  /**
   * Update a dashboard layout (name, widgets, default status).
   */
  update: orgProcedure
    .input(UpdateDashboardInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get<DashboardService>(DashboardService);
      return service.updateDashboard(ctx.org.org.orgId, ctx.org.org.userId, input);
    }),

  /**
   * List all dashboards for the current user.
   */
  list: orgProcedure
    .input(ListDashboardsInputSchema)
    .query(async ({ ctx }) => {
      const service = ctx.container.get<DashboardService>(DashboardService);
      return service.listDashboards(ctx.org.org.orgId, ctx.org.org.userId);
    }),

  /**
   * Get a single dashboard by ID.
   */
  get: orgProcedure
    .input(GetDashboardInputSchema)
    .query(async ({ ctx, input }) => {
      const service = ctx.container.get<DashboardService>(DashboardService);
      return service.getDashboard(ctx.org.org.orgId, ctx.org.org.userId, input);
    }),

  /**
   * Delete a dashboard layout.
   */
  delete: orgProcedure
    .input(DeleteDashboardInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get<DashboardService>(DashboardService);
      return service.deleteDashboard(ctx.org.org.orgId, ctx.org.org.userId, input);
    }),

  /**
   * Set a dashboard as the default.
   */
  setDefault: orgProcedure
    .input(z.object({ dashboardId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get<DashboardService>(DashboardService);
      return service.setDefault(ctx.org.org.orgId, ctx.org.org.userId, input.dashboardId);
    }),

  /**
   * Get resolved data for a single widget.
   * Resolves widget data based on widget type and config.
   */
  getWidgetData: orgProcedure
    .input(GetWidgetDataInputSchema)
    .query(async ({ ctx, input }) => {
      const service = ctx.container.get<DashboardService>(DashboardService);
      return service.getWidgetData(ctx.org.org.orgId, input);
    }),
});
