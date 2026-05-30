/**
 * GCP Error Reporter Adapter
 *
 * Uses Google Cloud Error Reporting API via fetch for native GCP integration.
 * Optionally forwards to Sentry if SENTRY_DSN is configured.
 *
 * Cloud Error Reporting automatically groups and deduplicates exceptions
 * when errors are logged as structured JSON with the correct format.
 * Ref: https://cloud.google.com/error-reporting/docs/formatting-error-messages
 */

import type { ErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';
import type { CapturedError, ErrorContext, ErrorSeverity } from '@cruzjs/monitor/error-reporting';
import { SentryErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';
import { ConsoleErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';

export class GCPErrorReporterAdapter implements ErrorReporterAdapter {
  readonly name = 'gcp';
  private readonly consoleAdapter = new ConsoleErrorReporterAdapter();
  private readonly sentryAdapter: SentryErrorReporterAdapter | null;

  constructor(
    private readonly projectId: string | null,
    sentryDsn: string | null,
    environment?: string,
    release?: string,
  ) {
    this.sentryAdapter = sentryDsn
      ? new SentryErrorReporterAdapter(sentryDsn, {
          environment,
          release,
          defaultTags: { runtime: 'gcp-cloud-run' },
        })
      : null;
  }

  async capture(error: CapturedError): Promise<void> {
    // Log in Cloud Error Reporting format for automatic pickup
    const gcpEntry = {
      severity: error.severity === 'fatal' ? 'CRITICAL' : 'ERROR',
      message: error.error.stack ?? error.error.message,
      '@type': 'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent',
      context: {
        reportLocation: {
          functionName: 'ErrorReportingService.capture',
        },
        user: error.context.user?.id,
      },
    };

    console.error(JSON.stringify(gcpEntry));

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
