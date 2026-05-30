/**
 * AWS Error Reporter Adapter
 *
 * Uses CloudWatch structured logging for error events.
 * Optionally forwards to Sentry if SENTRY_DSN is configured.
 *
 * CloudWatch errors appear as structured JSON logs which can be
 * filtered and alarmed on via CloudWatch Logs Insights.
 */

import type { ErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';
import type { CapturedError, ErrorContext, ErrorSeverity } from '@cruzjs/monitor/error-reporting';
import { SentryErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';
import { ConsoleErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';

export class AWSErrorReporterAdapter implements ErrorReporterAdapter {
  readonly name = 'aws';
  private readonly consoleAdapter = new ConsoleErrorReporterAdapter();
  private readonly sentryAdapter: SentryErrorReporterAdapter | null;

  constructor(sentryDsn: string | null, environment?: string, release?: string) {
    this.sentryAdapter = sentryDsn
      ? new SentryErrorReporterAdapter(sentryDsn, {
          environment,
          release,
          defaultTags: { runtime: 'aws-lambda' },
        })
      : null;
  }

  async capture(error: CapturedError): Promise<void> {
    // Always log to CloudWatch via structured console output
    await this.consoleAdapter.capture(error);

    // Also forward to Sentry if configured
    if (this.sentryAdapter) {
      await this.sentryAdapter.capture(error);
    }
  }

  async captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): Promise<void> {
    await this.consoleAdapter.captureMessage(message, severity, context);

    if (this.sentryAdapter) {
      await this.sentryAdapter.captureMessage(message, severity, context);
    }
  }

  async flush(): Promise<void> {
    if (this.sentryAdapter) {
      await this.sentryAdapter.flush();
    }
  }

  isAvailable(): boolean {
    return true;
  }
}
