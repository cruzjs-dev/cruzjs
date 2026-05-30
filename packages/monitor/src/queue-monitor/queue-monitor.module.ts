/**
 * Queue Monitor Module
 *
 * Opt-in module for queue monitoring. Tracks throughput, runtime,
 * failure rates, and provides failed job management.
 *
 * Usage:
 * ```typescript
 * import { QueueMonitorModule } from '@cruzjs/monitor/queue-monitor';
 *
 * export default createCruzApp({
 *   schema,
 *   modules: [StartModule, QueueMonitorModule],
 *   pages: () => import('virtual:react-router/server-build'),
 * });
 * ```
 */

import { Module } from '@cruzjs/core/di';
import { QueueMetricsService } from './queue-metrics.service';
import { QueueMetricsTrpc } from './queue-metrics.trpc';

@Module({
  providers: [
    QueueMetricsService,
    QueueMetricsTrpc,
  ],
  trpcRouters: {
    queueMetrics: QueueMetricsTrpc,
  },
})
export class QueueMonitorModule {}
