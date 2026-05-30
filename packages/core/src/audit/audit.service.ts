/**
 * Audit Log Service
 *
 * Manages audit log creation, querying, and retention.
 * Falls back to DatabaseAuditAdapter when no custom adapter is bound.
 */

import { Injectable, Inject, Optional } from '../di';
import { DRIZZLE, type DrizzleDatabase } from '../shared/database/drizzle.service';
import { createId } from '@paralleldrive/cuid2';
import { AUDIT_LOG_ADAPTER } from './audit.types';
import type { AuditLogAdapter } from './audit.adapter';
import type {
  AuditLogEntry,
  CreateAuditLogInput,
  AuditLogQuery,
} from './audit.types';
import { DatabaseAuditAdapter } from './adapters/database.audit.adapter';

@Injectable()
export class AuditLogService {
  private readonly adapter: AuditLogAdapter;

  constructor(
    @Inject(AUDIT_LOG_ADAPTER) @Optional() externalAdapter: AuditLogAdapter | undefined,
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {
    // Fall back to database adapter if no custom adapter is provided
    this.adapter = externalAdapter ?? new DatabaseAuditAdapter(this.db);
  }

  // ── Write ──────────────────────────────────────────────────────────

  /**
   * Create an audit log entry.
   * Computes a diff automatically if both `before` and `after` are provided.
   */
  async log(input: CreateAuditLogInput): Promise<void> {
    const diff =
      input.before && input.after
        ? this.diffSnapshots(input.before, input.after)
        : null;

    const entry: AuditLogEntry = {
      id: createId(),
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      actorId: input.actorId ?? null,
      actorType: input.actorType ?? 'user',
      orgId: input.orgId ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      diff,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
    };

    await this.adapter.write(entry);
  }

  // ── Query ──────────────────────────────────────────────────────────

  /**
   * Query audit log entries with filtering and pagination.
   */
  async query(params: AuditLogQuery): Promise<{ entries: AuditLogEntry[]; total: number }> {
    return this.adapter.query(params);
  }

  /**
   * Get the full action history for a specific entity.
   */
  async getEntityHistory(entityType: string, entityId: string, orgId?: string): Promise<AuditLogEntry[]> {
    const result = await this.adapter.query({
      entityType,
      entityId,
      orgId,
      perPage: 100,
    });
    return result.entries;
  }

  /**
   * Get all actions performed by a specific actor.
   */
  async getActorHistory(actorId: string, orgId?: string): Promise<AuditLogEntry[]> {
    const result = await this.adapter.query({
      actorId,
      orgId,
      perPage: 100,
    });
    return result.entries;
  }

  // ── Diff ───────────────────────────────────────────────────────────

  /**
   * Compute a JSON diff between before and after snapshots.
   * Returns an object with `added`, `removed`, and `changed` keys.
   */
  diffSnapshots(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): Record<string, unknown> {
    const added: Record<string, unknown> = {};
    const removed: Record<string, unknown> = {};
    const changed: Record<string, { from: unknown; to: unknown }> = {};

    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      const inBefore = key in before;
      const inAfter = key in after;

      if (!inBefore && inAfter) {
        added[key] = after[key];
      } else if (inBefore && !inAfter) {
        removed[key] = before[key];
      } else if (inBefore && inAfter) {
        const beforeVal = JSON.stringify(before[key]);
        const afterVal = JSON.stringify(after[key]);
        if (beforeVal !== afterVal) {
          changed[key] = { from: before[key], to: after[key] };
        }
      }
    }

    return { added, removed, changed };
  }

  // ── Retention ──────────────────────────────────────────────────────

  /**
   * Prune audit log entries older than the given date.
   * Returns the number of entries deleted.
   */
  async pruneOlderThan(date: Date): Promise<number> {
    return this.adapter.prune(date);
  }
}
