/**
 * @cruzjs/monitor — Tracing (Distributed Tracing & Metrics)
 *
 * Barrel export for the tracing module.
 */

// Module
export { TracingModule } from './tracing.module';

// Services
export { TracingService } from './tracing.service';
export { MetricsService } from './metrics.service';

// Adapter interfaces
export type { TracingAdapter, MetricAdapter } from './tracing.adapter';

// Types
export {
  SpanKind,
  SpanStatus,
  MetricType,
  TRACING_ADAPTER,
  METRIC_ADAPTER,
} from './tracing.types';
export type {
  Span,
  SpanEvent,
  TraceContext,
  TraceParent,
  MetricDataPoint,
} from './tracing.types';

// Adapters
export { InMemoryTracingAdapter } from './adapters/in-memory.tracing.adapter';
export { InMemoryMetricAdapter } from './adapters/in-memory.metric.adapter';
export { OTLPTracingAdapter } from './adapters/otlp.tracing.adapter';
export type { OTLPTracingAdapterOptions } from './adapters/otlp.tracing.adapter';

// Decorator
export { Trace, getTraceMetadata } from './tracing.decorator';
export type { TraceDecoratorConfig } from './tracing.decorator';

// Middleware
export { tracingMiddleware } from './tracing.middleware';
