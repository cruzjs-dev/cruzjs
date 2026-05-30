/**
 * Docker / Self-Hosted Audit Adapter
 *
 * Writes audit log entries to the database and optionally forwards
 * to an HTTP sink for external audit log aggregators.
 *
 * Configuration via environment variables:
 * - AUDIT_HTTP_SINK_URL: URL of external audit aggregator (optional)
 * - AUDIT_HTTP_SINK_BATCH_SIZE: entries to buffer before flush (default 50)
 */

import type { AuditLogAdapter } from '@cruzjs/core/audit/audit.adapter';
import type { AuditLogEntry, AuditLogQuery } from '@cruzjs/core/audit/audit.types';

export class DockerAuditAdapter implements AuditLogAdapter {
  private readonly delegate: AuditLogAdapter;
  private buffer: AuditLogEntry[] = [];
  private readonly httpSinkUrl: string | null;
  private readonly batchSize: number;

  constructor(delegate: AuditLogAdapter) {
    this.delegate = delegate;
    this.httpSinkUrl = process.env.AUDIT_HTTP_SINK_URL ?? null;
    this.batchSize = parseInt(process.env.AUDIT_HTTP_SINK_BATCH_SIZE ?? '50', 10);
  }

  async write(entry: AuditLogEntry): Promise<void> {
    // Always write to database
    await this.delegate.write(entry);

    // Also output to console for Docker log driver capture
    console.log(JSON.stringify({
      type: 'audit_log',
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      actorId: entry.actorId,
      orgId: entry.orgId,
      timestamp: entry.createdAt,
    }));

    // Buffer for HTTP sink if configured
    if (this.httpSinkUrl) {
      this.buffer.push(entry);
      if (this.buffer.length >= this.batchSize) {
        await this.flush();
      }
    }
  }

  async query(params: AuditLogQuery): Promise<{ entries: AuditLogEntry[]; total: number }> {
    return this.delegate.query(params);
  }

  async prune(olderThan: Date): Promise<number> {
    return this.delegate.prune(olderThan);
  }

  private async flush(): Promise<void> {
    if (!this.httpSinkUrl || this.buffer.length === 0) {
      return;
    }

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(this.httpSinkUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entries),
      });
    } catch {
      // HTTP sink failures must not break audit logging
    }
  }
}
