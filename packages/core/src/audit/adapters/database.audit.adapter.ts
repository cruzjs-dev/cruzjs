/**
 * Database Audit Log Adapter
 *
 * Writes audit log entries to the local D1/SQLite database via Drizzle.
 * Supports full pagination and filtering.
 */

import { Injectable, Inject } from '../../di';
import { DRIZZLE, type DrizzleDatabase } from '../../shared/database/drizzle.service';
import { eq, and, desc, gte, lte, count, sql } from 'drizzle-orm';
import { auditLogs } from '../audit.schema';
import type { AuditLogAdapter } from '../audit.adapter';
import type { AuditLogEntry, AuditLogQuery } from '../audit.types';

@Injectable()
export class DatabaseAuditAdapter implements AuditLogAdapter {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  async write(entry: AuditLogEntry): Promise<void> {
    await this.db.insert(auditLogs).values({
      id: entry.id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      actorId: entry.actorId,
      actorType: entry.actorType,
      orgId: entry.orgId,
      before: entry.before,
      after: entry.after,
      diff: entry.diff,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
    });
  }

  async query(params: AuditLogQuery): Promise<{ entries: AuditLogEntry[]; total: number }> {
    const conditions = this.buildConditions(params);

    const page = params.page ?? 1;
    const perPage = params.perPage ?? 50;
    const offset = (page - 1) * perPage;

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [entries, countResult] = await Promise.all([
      this.db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(auditLogs)
        .where(whereClause),
    ]);

    return {
      entries: entries.map(this.mapToEntry),
      total: countResult[0]?.count ?? 0,
    };
  }

  async prune(olderThan: Date): Promise<number> {
    const result = await this.db
      .delete(auditLogs)
      .where(lte(auditLogs.createdAt, olderThan.toISOString()));

    // D1 returns rowsAffected in the result metadata
    return (result as unknown as { rowsAffected?: number }).rowsAffected ?? 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildConditions(params: AuditLogQuery): any[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [];

    if (params.orgId) {
      conditions.push(eq(auditLogs.orgId, params.orgId));
    }
    if (params.actorId) {
      conditions.push(eq(auditLogs.actorId, params.actorId));
    }
    if (params.entityType) {
      conditions.push(eq(auditLogs.entityType, params.entityType));
    }
    if (params.entityId) {
      conditions.push(eq(auditLogs.entityId, params.entityId));
    }
    if (params.action) {
      conditions.push(eq(auditLogs.action, params.action));
    }
    if (params.from) {
      conditions.push(gte(auditLogs.createdAt, params.from.toISOString()));
    }
    if (params.to) {
      conditions.push(lte(auditLogs.createdAt, params.to.toISOString()));
    }

    return conditions;
  }

  private mapToEntry(row: typeof auditLogs.$inferSelect): AuditLogEntry {
    return {
      id: row.id,
      action: row.action as AuditLogEntry['action'],
      entityType: row.entityType,
      entityId: row.entityId,
      actorId: row.actorId,
      actorType: (row.actorType ?? 'user') as AuditLogEntry['actorType'],
      orgId: row.orgId,
      before: row.before as Record<string, unknown> | null,
      after: row.after as Record<string, unknown> | null,
      diff: row.diff as Record<string, unknown> | null,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.createdAt,
    };
  }
}
