/**
 * @cruzjs/monitor — Queue Monitor
 *
 * Barrel export for the queue monitoring module.
 */

// Module
export { QueueMonitorModule } from './queue-monitor.module';

// Service
export { QueueMetricsService } from './queue-metrics.service';

// tRPC Router
export { QueueMetricsTrpc } from './queue-metrics.trpc';

// Schema
export { queueMetrics } from './queue-metrics.schema';
export type { QueueMetric, NewQueueMetric } from './queue-metrics.schema';

// Types
export type {
  QueueOverview,
  QueueSummary,
  QueueMetricRecord,
  RecentJobsOptions,
  FailedJobsOptions,
} from './queue-metrics.types';

// Event Listeners
export {
  recordJobCompletedMetric,
  recordJobFailedMetric,
} from './queue-metrics.listeners';
