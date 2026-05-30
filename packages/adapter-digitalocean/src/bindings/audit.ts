/**
 * DigitalOcean Audit Adapter
 *
 * Writes audit log entries to the database.
 * DigitalOcean App Platform captures stdout for log drains.
 */

import type { AuditLogAdapter } from '@cruzjs/core/audit/audit.adapter';
import type { AuditLogEntry, AuditLogQuery } from '@cruzjs/core/audit/audit.types';

export class DigitalOceanAuditAdapter implements AuditLogAdapter {
  private readonly delegate: AuditLogAdapter;

  constructor(delegate: AuditLogAdapter) {
    this.delegate = delegate;
  }

  async write(entry: AuditLogEntry): Promise<void> {
    // Write to database via delegate
    await this.delegate.write(entry);

    // Emit structured log for DigitalOcean log drains
    console.log(JSON.stringify({
      type: 'audit_log',
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      actorId: entry.actorId,
      orgId: entry.orgId,
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
