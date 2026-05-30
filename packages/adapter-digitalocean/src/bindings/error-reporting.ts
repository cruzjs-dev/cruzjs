/**
 * DigitalOcean Error Reporter Adapter
 *
 * Uses Sentry if SENTRY_DSN is configured, otherwise falls back to console.
 * DigitalOcean App Platform does not have a native error reporting service,
 * so Sentry is the recommended external provider.
 */

import type { ErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';
import type { CapturedError, ErrorContext, ErrorSeverity } from '@cruzjs/monitor/error-reporting';
import { SentryErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';
import { ConsoleErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';

export class DOErrorReporterAdapter implements ErrorReporterAdapter {
  readonly name = 'digitalocean';
  private readonly delegate: ErrorReporterAdapter;

  constructor(sentryDsn: string | null, environment?: string, release?: string) {
    if (sentryDsn) {
      this.delegate = new SentryErrorReporterAdapter(sentryDsn, {
        environment,
        release,
        defaultTags: { runtime: 'digitalocean-app-platform' },
      });
    } else {
      this.delegate = new ConsoleErrorReporterAdapter();
    }
  }

  async capture(error: CapturedError): Promise<void> {
    return this.delegate.capture(error);
  }

  async captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): Promise<void> {
    return this.delegate.captureMessage(message, severity, context);
  }

  async flush(): Promise<void> {
    return this.delegate.flush();
  }

  isAvailable(): boolean {
    return this.delegate.isAvailable();
  }
}
