/**
 * Tracing Module
 *
 * Opt-in module for distributed tracing and metrics collection.
 * Registers TracingService, MetricsService, and default in-memory adapters.
 *
 * Platform-specific adapters override the TRACING_ADAPTER and METRIC_ADAPTER
 * tokens when a RuntimeAdapter provides them.
 *
 * Usage:
 * ```typescript
 * import { TracingModule } from '@cruzjs/monitor/tracing';
 *
 * export default createCruzApp({
 *   schema,
 *   modules: [StartModule, TracingModule],
 *   pages: () => import('virtual:react-router/server-build'),
 * });
 * ```
 */

import { Module } from '@cruzjs/core/di';
import { TracingService } from './tracing.service';
import { MetricsService } from './metrics.service';
import { InMemoryTracingAdapter } from './adapters/in-memory.tracing.adapter';
import { InMemoryMetricAdapter } from './adapters/in-memory.metric.adapter';
import { TRACING_ADAPTER, METRIC_ADAPTER } from './tracing.types';

@Module({
  providers: [
    TracingService,
    MetricsService,
    InMemoryTracingAdapter,
    InMemoryMetricAdapter,
    {
      provide: TRACING_ADAPTER,
      useFactory: () => new InMemoryTracingAdapter(),
    },
    {
      provide: METRIC_ADAPTER,
      useFactory: () => new InMemoryMetricAdapter(),
    },
  ],
})
export class TracingModule {}
