// Service
export { DashboardService } from './dashboard.service';

// Router
export { dashboardTrpc } from './dashboard.trpc';

// Module
export { DashboardModule } from './dashboard.module';

// Types
export type {
  WidgetType,
  ChartType,
  StatMetric,
  ListMetric,
  WidgetConfig,
  CreateDashboardInput,
  UpdateDashboardInput,
  ListDashboardsInput,
  GetDashboardInput,
  DeleteDashboardInput,
  GetWidgetDataInput,
} from './dashboard.types';

export {
  WidgetTypeValues,
  ChartTypeValues,
  StatMetricValues,
  ListMetricValues,
  WidgetConfigSchema,
  CreateDashboardInputSchema,
  UpdateDashboardInputSchema,
  ListDashboardsInputSchema,
  GetDashboardInputSchema,
  DeleteDashboardInputSchema,
  GetWidgetDataInputSchema,
} from './dashboard.types';

// Components
export * from './components';

// Admin UI
export { JobsDashboard } from './JobsDashboard';
export { JobsTable } from './JobsTable';
export { JobDetail } from './JobDetail';
export { AdminTable } from './AdminTable';
export { AdminTableFilters } from './AdminTableFilters';
export { AdminTablePagination } from './AdminTablePagination';
export { AdminBulkActions } from './AdminBulkActions';
export { useAdminResource } from './useAdminResource';
export type { AdminSortState } from './useAdminResource';
