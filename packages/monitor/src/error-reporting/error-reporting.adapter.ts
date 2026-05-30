/**
 * Error Reporter Adapter Interface
 *
 * Provider-agnostic interface for error reporting backends.
 * Implementations may use Sentry, CloudWatch, Application Insights, etc.
 */

import type { CapturedError, ErrorContext, ErrorSeverity } from './error-reporting.types';

export interface ErrorReporterAdapter {
  readonly name: string;

  /** Capture an error with full context */
  capture(error: CapturedError): Promise<void>;

  /** Capture a plain message (non-exception) */
  captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): Promise<void>;

  /** Flush any pending events to the reporting backend */
  flush(): Promise<void>;

  /** Whether the adapter is configured and available */
  isAvailable(): boolean;
}
