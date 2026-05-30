/**
 * GCP Cloud Logging Adapter
 *
 * Outputs structured JSON in Google Cloud Logging format.
 * Cloud Run and Cloud Functions automatically capture structured
 * JSON from stdout and forward to Cloud Logging.
 *
 * Uses the special `severity` field that Cloud Logging recognizes
 * for log level classification.
 */

import type { LogAdapterBinding } from '@cruzjs/core/runtime';

type GCPLogEntry = {
  level: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
  source?: string;
};

/** Map CruzJS log levels to GCP Cloud Logging severity values */
const GCP_SEVERITY_MAP: Record<string, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  warning: 'WARNING',
  error: 'ERROR',
  critical: 'CRITICAL',
};

export class GCPCloudLoggingAdapter implements LogAdapterBinding {
  async log(entry: GCPLogEntry): Promise<void> {
    // Cloud Logging recognizes `severity` and `message` as special fields.
    // See: https://cloud.google.com/logging/docs/structured-logging
    const output: Record<string, unknown> = {
      severity: GCP_SEVERITY_MAP[entry.level] ?? 'DEFAULT',
      message: entry.message,
      timestamp: entry.timestamp,
    };

    if (entry.correlationId) {
      output['logging.googleapis.com/trace'] = entry.correlationId;
    }

    if (entry.source) {
      output.source = entry.source;
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      output.context = entry.context;
    }

    console.log(JSON.stringify(output));
  }

  async flush(): Promise<void> {
    // stdout-based — no buffering to flush
  }
}
