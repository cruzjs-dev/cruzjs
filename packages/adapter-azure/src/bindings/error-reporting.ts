/**
 * Azure Error Reporter Adapter
 *
 * Uses Application Insights REST API for native Azure error tracking.
 * Optionally forwards to Sentry if SENTRY_DSN is configured.
 *
 * Application Insights ingestion via the Track API:
 * POST https://dc.services.visualstudio.com/v2/track
 * Ref: https://learn.microsoft.com/en-us/azure/azure-monitor/app/api-custom-events-metrics
 */

import type { ErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';
import type { CapturedError, ErrorContext, ErrorSeverity } from '@cruzjs/monitor/error-reporting';
import { SentryErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';
import { ConsoleErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';

export class AzureErrorReporterAdapter implements ErrorReporterAdapter {
  readonly name = 'azure';
  private readonly consoleAdapter = new ConsoleErrorReporterAdapter();
  private readonly sentryAdapter: SentryErrorReporterAdapter | null;
  private readonly pendingRequests: Promise<void>[] = [];

  constructor(
    private readonly instrumentationKey: string | null,
    sentryDsn: string | null,
    environment?: string,
    release?: string,
  ) {
    this.sentryAdapter = sentryDsn
      ? new SentryErrorReporterAdapter(sentryDsn, {
          environment,
          release,
          defaultTags: { runtime: 'azure-functions' },
        })
      : null;
  }

  async capture(error: CapturedError): Promise<void> {
    // Always log to console for Azure Monitor structured logging
    await this.consoleAdapter.capture(error);

    // Send to Application Insights if instrumentation key is available
    if (this.instrumentationKey) {
      const payload = {
        name: 'Microsoft.ApplicationInsights.Exception',
        time: error.timestamp.toISOString(),
        iKey: this.instrumentationKey,
        data: {
          baseType: 'ExceptionData',
          baseData: {
            ver: 2,
            exceptions: [
              {
                typeName: error.error.name,
                message: error.error.message,
                hasFullStack: !!error.error.stack,
                stack: error.error.stack,
              },
            ],
            severityLevel: this.mapSeverity(error.severity),
            properties: {
              errorId: error.id,
              ...error.context.tags,
              ...(error.context.user ? { userId: error.context.user.id } : {}),
              ...(error.context.org ? { orgId: error.context.org.id } : {}),
            },
          },
        },
      };

      const request = fetch('https://dc.services.visualstudio.com/v2/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([payload]),
      }).then(() => {}).catch(() => {});

      this.pendingRequests.push(request);
    }

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
    await Promise.allSettled(this.pendingRequests);
    this.pendingRequests.length = 0;

    if (this.sentryAdapter) {
      await this.sentryAdapter.flush();
    }
  }

  isAvailable(): boolean {
    return true;
  }

  private mapSeverity(severity: ErrorSeverity): number {
    switch (severity) {
      case 'fatal': return 4; // Critical
      case 'error': return 3; // Error
      case 'warning': return 2; // Warning
      case 'info': return 1; // Information
      default: return 3;
    }
  }
}
