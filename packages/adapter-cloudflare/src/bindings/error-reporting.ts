/**
 * Cloudflare Error Reporter Adapter
 *
 * Uses Sentry via HTTP Envelope API if SENTRY_DSN env var is set.
 * Falls back to console-based error reporting otherwise.
 *
 * This adapter works in Cloudflare Workers without Node.js dependencies
 * since SentryErrorReporterAdapter uses fetch directly.
 */

import type { ErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';
import type { CapturedError, ErrorContext, ErrorSeverity } from '@cruzjs/monitor/error-reporting';
import { SentryErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';
import { ConsoleErrorReporterAdapter } from '@cruzjs/monitor/error-reporting';

export class CloudflareErrorReporterAdapter implements ErrorReporterAdapter {
  readonly name = 'cloudflare';
  private readonly delegate: ErrorReporterAdapter;

  constructor(sentryDsn: string | null, environment?: string, release?: string) {
    if (sentryDsn) {
      this.delegate = new SentryErrorReporterAdapter(sentryDsn, {
        environment,
        release,
        defaultTags: { runtime: 'cloudflare-workers' },
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
