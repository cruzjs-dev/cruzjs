import { z } from 'zod';

// ============================================================================
// Widget Types
// ============================================================================

export const WidgetTypeValues = [
  'STAT', 'CHART', 'LIST', 'FEED',
] as const;
export type WidgetType = (typeof WidgetTypeValues)[number];

export const ChartTypeValues = ['LINE', 'BAR', 'AREA', 'PIE'] as const;
export type ChartType = (typeof ChartTypeValues)[number];

export const StatMetricValues = [
  'TOTAL_EXECUTIONS', 'ACTIVE_AGENTS', 'OPEN_GATES',
  'FAILURE_RATE', 'AVG_COST', 'TOTAL_COST',
  'OPEN_WORK_ITEMS', 'COMPLETED_WORK_ITEMS',
] as const;
export type StatMetric = (typeof StatMetricValues)[number];

export const ListMetricValues = [
  'RECENT_EXECUTIONS', 'RECENT_FAILURES', 'PENDING_GATES',
  'OVERDUE_WORK_ITEMS',
] as const;
export type ListMetric = (typeof ListMetricValues)[number];

/**
 * Widget configuration stored within DashboardLayout.widgets JSON array.
 */
export const WidgetConfigSchema = z.object({
  id: z.string(), // Unique widget instance ID
  type: z.enum(WidgetTypeValues),
  title: z.string(),
  // Grid positioning (12-column grid)
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(8),
  // Type-specific config
  config: z.object({
    metric: z.string().optional(), // for STAT widgets
    chartType: z.enum(ChartTypeValues).optional(), // for CHART widgets
    metricType: z.string().optional(), // analytics metric type for CHART
    listMetric: z.string().optional(), // for LIST widgets
    limit: z.number().int().min(1).max(50).optional(),
    periodDays: z.number().int().min(1).max(365).optional(),
  }).passthrough(),
});
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;

// ============================================================================
// Input Schemas
// ============================================================================

export const CreateDashboardInputSchema = z.object({
  name: z.string().min(1).max(100),
  widgets: z.array(WidgetConfigSchema).default([]),
  isDefault: z.boolean().default(false),
});
export type CreateDashboardInput = z.infer<typeof CreateDashboardInputSchema>;

export const UpdateDashboardInputSchema = z.object({
  dashboardId: z.string(),
  name: z.string().min(1).max(100).optional(),
  widgets: z.array(WidgetConfigSchema).optional(),
  isDefault: z.boolean().optional(),
});
export type UpdateDashboardInput = z.infer<typeof UpdateDashboardInputSchema>;

export const ListDashboardsInputSchema = z.object({});
export type ListDashboardsInput = z.infer<typeof ListDashboardsInputSchema>;

export const GetDashboardInputSchema = z.object({
  dashboardId: z.string(),
});
export type GetDashboardInput = z.infer<typeof GetDashboardInputSchema>;

export const DeleteDashboardInputSchema = z.object({
  dashboardId: z.string(),
});
export type DeleteDashboardInput = z.infer<typeof DeleteDashboardInputSchema>;

export const GetWidgetDataInputSchema = z.object({
  widgetType: z.enum(WidgetTypeValues),
  config: z.object({
    metric: z.string().optional(),
    chartType: z.enum(ChartTypeValues).optional(),
    metricType: z.string().optional(),
    listMetric: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional(),
    periodDays: z.number().int().min(1).max(365).optional(),
  }).passthrough(),
});
export type GetWidgetDataInput = z.infer<typeof GetWidgetDataInputSchema>;
