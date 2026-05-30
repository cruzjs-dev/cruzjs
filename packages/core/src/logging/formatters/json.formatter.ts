/**
 * JSON Log Formatter
 *
 * Outputs log entries as single-line JSON strings.
 * Suitable for structured log ingestion (Logpush, CloudWatch, etc.).
 */

import type { LogEntry } from '../log.types';

export class JsonLogFormatter {
  format(entry: LogEntry): string {
    const output: Record<string, unknown> = {
      timestamp: entry.timestamp,
      level: entry.level,
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

    return JSON.stringify(output);
  }
}
