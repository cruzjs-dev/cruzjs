/**
 * Cloudflare Audit Adapter
 *
 * Writes audit log entries to D1 via the database adapter.
 * On Cloudflare, D1 is the primary storage; Logpush can be configured
 * separately to forward structured console output to external sinks.
 */

import type { AuditLogAdapter } from '@cruzjs/core/audit/audit.adapter';
import type { AuditLogEntry, AuditLogQuery } from '@cruzjs/core/audit/audit.types';

/**
 * Cloudflare audit adapter that writes to D1 (same as DatabaseAuditAdapter)
 * and optionally emits structured console logs for Logpush capture.
 */
export class CloudflareAuditAdapter implements AuditLogAdapter {
  private readonly delegate: AuditLogAdapter;
  private readonly enableLogpush: boolean;

  constructor(delegate: AuditLogAdapter, options?: { enableLogpush?: boolean }) {
    this.delegate = delegate;
    this.enableLogpush = options?.enableLogpush ?? false;
  }

  async write(entry: AuditLogEntry): Promise<void> {
    // Write to D1 via delegate
    await this.delegate.write(entry);

    // Optionally emit structured log for Logpush
    if (this.enableLogpush) {
      console.log(JSON.stringify({
        type: 'audit',
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actorId: entry.actorId,
        actorType: entry.actorType,
        orgId: entry.orgId,
        timestamp: entry.createdAt,
      }));
    }
  }

  async query(params: AuditLogQuery): Promise<{ entries: AuditLogEntry[]; total: number }> {
    return this.delegate.query(params);
  }

  async prune(olderThan: Date): Promise<number> {
    return this.delegate.prune(olderThan);
  }
}
