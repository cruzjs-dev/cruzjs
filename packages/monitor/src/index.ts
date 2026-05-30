/**
 * @cruzjs/monitor
 *
 * Inspector (Debug Dashboard) + Queue Monitor + Error Reporting for CruzJS.
 *
 * Both modules are opt-in. Add them to your createCruzApp modules array:
 *
 * ```typescript
 * import { MonitorModule } from '@cruzjs/monitor/monitor';
 * import { QueueMonitorModule } from '@cruzjs/monitor/queue-monitor';
 *
 * export default createCruzApp({
 *   schema,
 *   modules: [StartModule, MonitorModule, QueueMonitorModule],
 *   pages: () => import('virtual:react-router/server-build'),
 * });
 * ```
 */

// Inspector (Debug Dashboard)
export {
  MonitorModule,
  MonitorService,
  MonitorTrpc,
  monitorEntries,
  MonitorEntryTypeValues,
  MonitorEntryStatusValues,
  listEntriesSchema,
  getEntrySchema,
  clearEntriesSchema,
  RequestWatcher,
  QueryWatcher,
  JobWatcher,
  EventWatcher,
  MailWatcher,
  NotificationWatcher,
  CacheWatcher,
  ExceptionWatcher,
  captureJobCreatedListener,
  captureJobCompletedListener,
  captureJobFailedListener,
} from './monitor';

export type {
  MonitorEntry,
  NewMonitorEntry,
  MonitorEntryType,
  MonitorEntryStatus,
  MonitorEntryRecord,
  RecordEntryInput,
  ListEntriesOptions,
  MonitorStats,
  ListEntriesInput,
  GetEntryInput,
  ClearEntriesInput,
} from './monitor';

// Queue Monitor
export {
  QueueMonitorModule,
  QueueMetricsService,
  QueueMetricsTrpc,
  queueMetrics,
  recordJobCompletedMetric,
  recordJobFailedMetric,
} from './queue-monitor';

export type {
  QueueMetric,
  NewQueueMetric,
  QueueOverview,
  QueueSummary,
  QueueMetricRecord,
  RecentJobsOptions,
  FailedJobsOptions,
} from './queue-monitor';

// Error Reporting
export {
  ErrorReportingModule,
  ErrorReportingService,
  ConsoleErrorReporterAdapter,
  SentryErrorReporterAdapter,
  ErrorSeverity,
  ERROR_REPORTER_ADAPTER,
  errorReportingMiddleware,
  withErrorReporting,
  errorSeveritySchema,
  breadcrumbSchema,
  errorContextSchema,
  captureErrorSchema,
  captureMessageSchema,
} from './error-reporting';

export type {
  ErrorReporterAdapter,
  Breadcrumb,
  ErrorContext,
  CapturedError,
  SentryAdapterOptions,
  CaptureErrorInput,
  CaptureMessageInput,
  ErrorContextInput,
} from './error-reporting';

// Tracing (Distributed Tracing & Metrics)
export {
  TracingModule,
  TracingService,
  MetricsService,
  InMemoryTracingAdapter,
  InMemoryMetricAdapter,
  OTLPTracingAdapter,
  SpanKind,
  SpanStatus,
  MetricType,
  TRACING_ADAPTER,
  METRIC_ADAPTER,
  Trace,
  getTraceMetadata,
  tracingMiddleware,
} from './tracing';

export type {
  TracingAdapter,
  MetricAdapter,
  Span,
  SpanEvent,
  TraceContext,
  TraceParent,
  MetricDataPoint,
  OTLPTracingAdapterOptions,
  TraceDecoratorConfig,
} from './tracing';
