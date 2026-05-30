/**
 * Docker / Self-Hosted Error Reporter Adapter
 *
 * Uses Sentry if SENTRY_DSN is configured, otherwise falls back to console.
 * For self-hosted deployments, Sentry (self-hosted or cloud) is the
 * recommended error reporting backend.
 */

import type { ErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';
import type { CapturedError, ErrorContext, ErrorSeverity } from '@cruzjs/monitor/error-reporting';
import { SentryErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';
import { ConsoleErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';

export class DockerErrorReporterAdapter implements ErrorReporterAdapter {
  readonly name = 'docker';
  private readonly delegate: ErrorReporterAdapter;

  constructor(sentryDsn: string | null, environment?: string, release?: string) {
    if (sentryDsn) {
      this.delegate = new SentryErrorReporterAdapter(sentryDsn, {
        environment,
        release,
        defaultTags: { runtime: 'docker' },
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
