/**
 * @cruzjs/monitor -- Error Reporting
 *
 * Barrel export for the error reporting module.
 */

// Module
export { ErrorReportingModule } from './error-reporting.module';

// Service
export { ErrorReportingService } from './error-reporting.service';

// Adapter interface
export type { ErrorReporterAdapter } from './error-reporting.adapter';

// Adapters
export { ConsoleErrorReporterAdapter } from './adapters/console.adapter';
export { SentryErrorReporterAdapter } from './adapters/sentry.adapter';
export type { SentryAdapterOptions } from './adapters/sentry.adapter';

// Types
export {
  ErrorSeverity,
  ERROR_REPORTER_ADAPTER,
} from './error-reporting.types';
export type {
  Breadcrumb,
  ErrorContext,
  CapturedError,
} from './error-reporting.types';

// Validation
export {
  errorSeveritySchema,
  breadcrumbSchema,
  errorContextSchema,
  captureErrorSchema,
  captureMessageSchema,
} from './error-reporting.validation';
export type {
  CaptureErrorInput,
  CaptureMessageInput,
  ErrorContextInput,
} from './error-reporting.validation';

// Middleware
export { errorReportingMiddleware, withErrorReporting } from './error-reporting.middleware';
