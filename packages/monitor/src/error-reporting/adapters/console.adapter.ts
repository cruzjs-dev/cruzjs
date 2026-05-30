/**
 * Console Error Reporter Adapter
 *
 * Default adapter that logs captured errors to console.error
 * with structured context. Suitable for local development and
 * as a fallback when no external error reporting service is configured.
 */

import type { ErrorReporterAdapter } from '../error-reporting.adapter';
import type { CapturedError, ErrorContext, ErrorSeverity } from '../error-reporting.types';

export class ConsoleErrorReporterAdapter implements ErrorReporterAdapter {
  readonly name = 'console';

  async capture(error: CapturedError): Promise<void> {
    const entry: Record<string, unknown> = {
      errorId: error.id,
      severity: error.severity,
      message: error.error.message,
      stack: error.error.stack,
      timestamp: error.timestamp.toISOString(),
    };

    if (error.context.user) {
      entry.user = error.context.user;
    }
    if (error.context.org) {
      entry.org = error.context.org;
    }
    if (error.context.request) {
      entry.request = {
        url: error.context.request.url,
        method: error.context.request.method,
      };
    }
    if (error.context.tags && Object.keys(error.context.tags).length > 0) {
      entry.tags = error.context.tags;
    }
    if (error.context.extra && Object.keys(error.context.extra).length > 0) {
      entry.extra = error.context.extra;
    }
    if (error.context.breadcrumbs && error.context.breadcrumbs.length > 0) {
      entry.breadcrumbs = error.context.breadcrumbs.map((b) => ({
        category: b.category,
        message: b.message,
        level: b.level,
        timestamp: b.timestamp.toISOString(),
      }));
    }
    if (error.fingerprint) {
      entry.fingerprint = error.fingerprint;
    }
    if (error.release) {
      entry.release = error.release;
    }
    if (error.environment) {
      entry.environment = error.environment;
    }

    console.error('[ErrorReporting]', JSON.stringify(entry));
  }

  async captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): Promise<void> {
    const entry: Record<string, unknown> = {
      severity,
      message,
      timestamp: new Date().toISOString(),
    };

    if (context?.user) {
      entry.user = context.user;
    }
    if (context?.org) {
      entry.org = context.org;
    }
    if (context?.tags && Object.keys(context.tags).length > 0) {
      entry.tags = context.tags;
    }

    console.error('[ErrorReporting]', JSON.stringify(entry));
  }

  async flush(): Promise<void> {
    // Console adapter writes immediately; nothing to flush
  }

  isAvailable(): boolean {
    return true;
  }
}
