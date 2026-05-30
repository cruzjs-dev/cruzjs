/**
 * Pretty Log Formatter
 *
 * Outputs human-readable log entries for local development.
 * Includes color-coded level indicators and indented context.
 */

import type { LogEntry, LogLevel } from '../log.types';

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  warning: 'WARN',
  error: 'ERROR',
  critical: 'CRIT',
};

export class PrettyLogFormatter {
  format(entry: LogEntry): string {
    const label = LEVEL_LABELS[entry.level];
    const time = entry.timestamp.replace('T', ' ').replace('Z', '');

    let line = `[${time}] [${label}]`;

    if (entry.source) {
      line += ` [${entry.source}]`;
    }

    if (entry.correlationId) {
      line += ` (${entry.correlationId.slice(0, 8)})`;
    }

    line += ` ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      line += `\n  ${JSON.stringify(entry.context, null, 2).replace(/\n/g, '\n  ')}`;
    }

    return line;
  }
}
