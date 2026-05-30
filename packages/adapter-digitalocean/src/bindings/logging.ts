/**
 * DigitalOcean Log Adapter
 *
 * Outputs structured JSON logs to console for DigitalOcean App Platform.
 * App Platform captures stdout and makes logs available in the
 * DigitalOcean dashboard and via `doctl apps logs`.
 *
 * Also supports syslog-style formatting for external log drains.
 */

import type { LogAdapterBinding } from '@cruzjs/core/runtime';

type DOLogEntry = {
  level: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
  source?: string;
};

/** Map CruzJS log levels to syslog severity */
const SYSLOG_SEVERITY_MAP: Record<string, number> = {
  debug: 7,
  info: 6,
  warning: 4,
  error: 3,
  critical: 2,
};

export class DigitalOceanLogAdapter implements LogAdapterBinding {
  async log(entry: DOLogEntry): Promise<void> {
    const output: Record<string, unknown> = {
      timestamp: entry.timestamp,
      level: entry.level,
      severity: SYSLOG_SEVERITY_MAP[entry.level] ?? 6,
      message: entry.message,
    };

    if (entry.correlationId) {
      output.correlationId = entry.correlationId;
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
    // Console-based — no buffering to flush
  }
}
