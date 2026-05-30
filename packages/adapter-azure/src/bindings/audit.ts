/**
 * Azure Application Insights Audit Adapter
 *
 * Writes audit log entries to the database AND emits structured
 * JSON formatted for Application Insights / Azure Monitor ingestion.
 * Uses the `customDimensions` pattern for KQL queryability.
 */

import type { AuditLogAdapter } from '@cruzjs/core/audit/audit.adapter';
import type { AuditLogEntry, AuditLogQuery } from '@cruzjs/core/audit/audit.types';

export class AzureAuditAdapter implements AuditLogAdapter {
  private readonly delegate: AuditLogAdapter;

  constructor(delegate: AuditLogAdapter) {
    this.delegate = delegate;
  }

  async write(entry: AuditLogEntry): Promise<void> {
    // Write to database via delegate
    await this.delegate.write(entry);

    // Emit structured log for Application Insights
    console.log(JSON.stringify({
      message: `audit.${entry.action}: ${entry.entityType}${entry.entityId ? `/${entry.entityId}` : ''}`,
      severityLevel: 1, // Information
      customDimensions: {
        type: 'audit_log',
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
