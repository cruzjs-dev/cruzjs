/**
 * GCP Cloud Logging Audit Adapter
 *
 * Writes audit log entries to the database AND emits structured
 * JSON in Google Cloud Logging format for Cloud Audit Logs integration.
 */

import type { AuditLogAdapter } from '@cruzjs/core/audit/audit.adapter';
import type { AuditLogEntry, AuditLogQuery } from '@cruzjs/core/audit/audit.types';

export class GCPAuditAdapter implements AuditLogAdapter {
  private readonly delegate: AuditLogAdapter;

  constructor(delegate: AuditLogAdapter) {
    this.delegate = delegate;
  }

  async write(entry: AuditLogEntry): Promise<void> {
    // Write to database via delegate
    await this.delegate.write(entry);

    // Emit structured log for Cloud Logging
    console.log(JSON.stringify({
      severity: 'INFO',
      message: `audit.${entry.action}: ${entry.entityType}${entry.entityId ? `/${entry.entityId}` : ''}`,
      'logging.googleapis.com/labels': {
        type: 'audit_log',
        action: entry.action,
        entityType: entry.entityType,
      },
      jsonPayload: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actorId: entry.actorId,
        actorType: entry.actorType,
        orgId: entry.orgId,
        ipAddress: entry.ipAddress,
      },
      timestamp: entry.createdAt,
    }));
  }

  async query(params: AuditLogQuery): Promise<{ entries: AuditLogEntry[]; total: number }> {
    return this.delegate.query(params);
  }

  async prune(olderThan: Date): Promise<number> {
    return this.delegate.prune(olderThan);
  }
}
