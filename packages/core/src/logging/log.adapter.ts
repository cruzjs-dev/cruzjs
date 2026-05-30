/**
 * Log Adapter Interface
 *
 * Provider-agnostic interface for log output destinations.
 * Each cloud adapter implements this to route logs to its native logging service.
 */

import type { LogEntry } from './log.types';

export interface LogAdapter {
  /** Write a log entry to the output destination */
  log(entry: LogEntry): Promise<void>;

  /** Flush any buffered entries (optional, for batch-oriented adapters) */
  flush?(): Promise<void>;
}
