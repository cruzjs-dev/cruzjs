/**
 * AWS CloudWatch Audit Adapter
 *
 * Writes audit log entries to the database AND emits structured
 * JSON to stdout for CloudWatch Logs capture. CloudWatch Insights
 * can then query audit events across all Lambda invocations.
 */

import type { AuditLogAdapter } from '@cruzjs/core/audit/audit.adapter';
import type { AuditLogEntry, AuditLogQuery } from '@cruzjs/core/audit/audit.types';

export class AWSCloudWatchAuditAdapter implements AuditLogAdapter {
  private readonly delegate: AuditLogAdapter;

  constructor(delegate: AuditLogAdapter) {
    this.delegate = delegate;
  }

  async write(entry: AuditLogEntry): Promise<void> {
    // Write to database via delegate
    await this.delegate.write(entry);

    // Emit structured log for CloudWatch Insights
    console.log(JSON.stringify({
      _type: 'AUDIT_LOG',
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      actorId: entry.actorId,
      actorType: entry.actorType,
      orgId: entry.orgId,
      ipAddress: entry.ipAddress,
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
