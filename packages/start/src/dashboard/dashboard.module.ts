import { Module } from '@cruzjs/core/di';
import { DashboardService } from './dashboard.service';
import { dashboardTrpc } from './dashboard.trpc';

/**
 * Dashboard Module
 *
 * Registers DashboardService and the dashboard tRPC router.
 */
@Module({
  providers: [DashboardService],
  trpcRouters: {
    dashboard: dashboardTrpc,
  },
})
export class DashboardModule {}
