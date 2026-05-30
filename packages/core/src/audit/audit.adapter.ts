/**
 * Audit Log Adapter Interface
 *
 * Defines the contract for audit log storage backends.
 * Implementations can write to databases, cloud logging services,
 * or external audit platforms.
 */

import type { AuditLogEntry, AuditLogQuery } from './audit.types';

export interface AuditLogAdapter {
  /** Write a single audit log entry */
  write(entry: AuditLogEntry): Promise<void>;

  /** Query audit log entries with filtering and pagination */
  query(params: AuditLogQuery): Promise<{ entries: AuditLogEntry[]; total: number }>;

  /** Prune entries older than the given date. Returns the number of entries deleted. */
  prune(olderThan: Date): Promise<number>;
}
