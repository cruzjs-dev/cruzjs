/**
 * Sentry Error Reporter Adapter
 *
 * Reports errors to Sentry using the HTTP Envelope API directly.
 * This avoids importing @sentry/node which does not work in CF Workers
 * or other edge runtimes. Instead, we construct Sentry envelopes manually
 * and POST them via fetch.
 *
 * Reference: https://develop.sentry.dev/sdk/envelopes/
 */

import type { ErrorReporterAdapter } from '../error-reporting.adapter';
import type { CapturedError, ErrorContext, ErrorSeverity, Breadcrumb } from '../error-reporting.types';

export type SentryAdapterOptions = {
  /** Release tag for error grouping (e.g. "1.0.0" or git SHA) */
  release?: string;
  /** Environment name (e.g. "production", "staging") */
  environment?: string;
  /** Additional default tags applied to all events */
  defaultTags?: Record<string, string>;
};

type ParsedDsn = {
  projectId: string;
  key: string;
  host: string;
};

export class SentryErrorReporterAdapter implements ErrorReporterAdapter {
  readonly name = 'sentry';

  private readonly parsedDsn: ParsedDsn;
  private readonly pendingRequests: Promise<void>[] = [];

  constructor(
    private readonly dsn: string,
    private readonly options: SentryAdapterOptions = {},
  ) {
    this.parsedDsn = this.parseDsn(dsn);
  }

  async capture(error: CapturedError): Promise<void> {
    const envelope = this.buildEnvelope(error);
    const url = `https://${this.parsedDsn.host}/api/${this.parsedDsn.projectId}/envelope/`;

    const request = fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=cruzjs/1.0.0, sentry_key=${this.parsedDsn.key}`,
      },
      body: envelope,
    }).then(() => {
      // Response intentionally ignored — fire-and-forget
    }).catch(() => {
      // Silently swallow fetch errors to avoid cascading failures
    });

    this.pendingRequests.push(request);
  }

  async captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): Promise<void> {
    const eventId = crypto.randomUUID().replace(/-/g, '');
    const now = new Date();

    const event: Record<string, unknown> = {
      event_id: eventId,
      timestamp: now.toISOString(),
      platform: 'javascript',
      level: severity,
      message: { formatted: message },
      environment: this.options.environment,
      release: this.options.release,
    };

    if (context?.user) {
      event.user = {
        id: context.user.id,
        email: context.user.email,
        username: context.user.username,
      };
    }

    if (context?.tags || this.options.defaultTags) {
      event.tags = { ...this.options.defaultTags, ...context?.tags };
    }

    if (context?.extra) {
      event.extra = context.extra;
    }

    const envelopeHeader = JSON.stringify({
      event_id: eventId,
      dsn: this.dsn,
      sent_at: now.toISOString(),
    });
    const itemHeader = JSON.stringify({ type: 'event', content_type: 'application/json' });
    const itemPayload = JSON.stringify(event);
    const envelope = `${envelopeHeader}\n${itemHeader}\n${itemPayload}`;

    const url = `https://${this.parsedDsn.host}/api/${this.parsedDsn.projectId}/envelope/`;

    const request = fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=cruzjs/1.0.0, sentry_key=${this.parsedDsn.key}`,
      },
      body: envelope,
    }).then(() => {}).catch(() => {});

    this.pendingRequests.push(request);
  }

  async flush(): Promise<void> {
    await Promise.allSettled(this.pendingRequests);
    this.pendingRequests.length = 0;
  }

  isAvailable(): boolean {
    return !!this.parsedDsn.projectId && !!this.parsedDsn.key && !!this.parsedDsn.host;
  }

  /**
   * Build a Sentry Envelope containing an exception event.
   *
   * Envelope format (newline-delimited):
   *   Line 1: Envelope header (JSON)
   *   Line 2: Item header (JSON)
   *   Line 3: Item payload (JSON event)
   */
  buildEnvelope(error: CapturedError): string {
    const eventId = error.id.replace(/-/g, '');

    const event: Record<string, unknown> = {
      event_id: eventId,
      timestamp: error.timestamp.toISOString(),
      platform: 'javascript',
      level: error.severity,
      environment: error.environment ?? this.options.environment,
      release: error.release ?? this.options.release,
      exception: {
        values: [
          {
            type: error.error.name,
            value: error.error.message,
            stacktrace: error.error.stack
              ? { frames: this.parseStackFrames(error.error.stack) }
              : undefined,
          },
        ],
      },
    };

    if (error.fingerprint && error.fingerprint.length > 0) {
      event.fingerprint = error.fingerprint;
    }

    if (error.context.user) {
      event.user = {
        id: error.context.user.id,
        email: error.context.user.email,
        username: error.context.user.username,
      };
    }

    const tags: Record<string, string> = { ...this.options.defaultTags, ...error.context.tags };
    if (error.context.org) {
      tags['org.id'] = error.context.org.id;
      if (error.context.org.slug) {
        tags['org.slug'] = error.context.org.slug;
      }
    }
    if (Object.keys(tags).length > 0) {
      event.tags = tags;
    }

    if (error.context.extra && Object.keys(error.context.extra).length > 0) {
      event.extra = error.context.extra;
    }

    if (error.context.request) {
      event.request = {
        url: error.context.request.url,
        method: error.context.request.method,
        headers: error.context.request.headers,
        data: error.context.request.body,
      };
    }

    if (error.context.breadcrumbs && error.context.breadcrumbs.length > 0) {
      event.breadcrumbs = {
        values: error.context.breadcrumbs.map((b: Breadcrumb) => ({
          category: b.category,
          message: b.message,
          level: b.level,
          timestamp: b.timestamp.toISOString(),
          data: b.data,
        })),
      };
    }

    const envelopeHeader = JSON.stringify({
      event_id: eventId,
      dsn: this.dsn,
      sent_at: error.timestamp.toISOString(),
    });
    const itemHeader = JSON.stringify({ type: 'event', content_type: 'application/json' });
    const itemPayload = JSON.stringify(event);

    return `${envelopeHeader}\n${itemHeader}\n${itemPayload}`;
  }

  /**
   * Parse a JS Error stack trace into Sentry-compatible stack frames.
   * Frames are reversed because Sentry expects most recent frame last.
   */
  private parseStackFrames(stack: string): Array<Record<string, unknown>> {
    const lines = stack.split('\n').slice(1); // skip first line (error message)
    const frames: Array<Record<string, unknown>> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Match "at functionName (filename:line:col)" or "at filename:line:col"
      const match = trimmed.match(/^at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/);
      if (match) {
        frames.push({
          function: match[1] || '<anonymous>',
          filename: match[2],
          lineno: parseInt(match[3], 10),
          colno: parseInt(match[4], 10),
        });
      }
    }

    // Sentry expects frames in reverse order (most recent last)
    return frames.reverse();
  }

  /**
   * Parse a Sentry DSN string into its components.
   * DSN format: https://<key>@<host>/<projectId>
   */
  parseDsn(dsn: string): ParsedDsn {
    try {
      const url = new URL(dsn);
      const pathParts = url.pathname.split('/').filter(Boolean);
      return {
        key: url.username,
        host: url.host,
        projectId: pathParts[pathParts.length - 1] || '',
      };
    } catch {
      return { key: '', host: '', projectId: '' };
    }
  }
}
