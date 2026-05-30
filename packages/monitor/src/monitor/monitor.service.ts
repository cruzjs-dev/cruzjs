/**
 * Monitor Service
 *
 * Records and queries debug dashboard entries (Telescope).
 * Can be disabled via MONITOR_ENABLED=false config.
 */

import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { ConfigService } from '@cruzjs/core/shared/config/config.service';
import { eq, and, desc, lt, sql } from 'drizzle-orm';
import { monitorEntries } from './monitor.schema';
import type {
  MonitorEntryType,
  MonitorEntryStatus,
  MonitorEntryRecord,
  RecordEntryInput,
  ListEntriesOptions,
  MonitorStats,
} from './monitor.types';

@Injectable()
export class MonitorService {
  private enabled: boolean;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {
    this.enabled = config.get<string>('MONITOR_ENABLED', 'true') !== 'false';
  }

  /**
   * Record a new monitor entry. No-ops when monitoring is disabled.
   */
  async record(entry: RecordEntryInput): Promise<void> {
    if (!this.enabled) return;

    await this.db.insert(monitorEntries).values({
      type: entry.type,
      content: JSON.stringify(entry.content),
      familyHash: entry.familyHash ?? null,
      batchId: entry.batchId ?? null,
      tags: JSON.stringify(entry.tags ?? []),
      status: entry.status ?? 'success',
      duration: entry.duration ?? null,
    });
  }

  /**
   * List monitor entries with optional filtering.
   */
  async list(options?: ListEntriesOptions): Promise<MonitorEntryRecord[]> {
    const conditions = [];

    if (options?.type) {
      conditions.push(eq(monitorEntries.type, options.type));
    }
    if (options?.status) {
      conditions.push(eq(monitorEntries.status, options.status));
    }
    if (options?.before) {
      conditions.push(lt(monitorEntries.createdAt, options.before.toISOString()));
    }

    const rows = await this.db
      .select()
      .from(monitorEntries)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(monitorEntries.createdAt))
      .limit(options?.limit ?? 50);

    let results = rows.map(this.deserializeRow);

    // Filter by tag in-memory (JSON array column)
    if (options?.tag) {
      const tag = options.tag;
      results = results.filter(
        (r) => r.tags && r.tags.includes(tag),
      );
    }

    return results;
  }

  /**
   * Get a single monitor entry by ID.
   */
  async get(id: string): Promise<MonitorEntryRecord | null> {
    const [row] = await this.db
      .select()
      .from(monitorEntries)
      .where(eq(monitorEntries.id, id))
      .limit(1);

    return row ? this.deserializeRow(row) : null;
  }

  /**
   * Delete all entries, optionally filtered by type.
   */
  async clear(type?: MonitorEntryType): Promise<void> {
    if (type) {
      await this.db.delete(monitorEntries).where(eq(monitorEntries.type, type));
    } else {
      await this.db.delete(monitorEntries);
    }
  }

  /**
   * Delete entries older than the given number of hours.
   * Returns the count of deleted entries.
   */
  async prune(olderThanHours = 24): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const deleted = await this.db
      .delete(monitorEntries)
      .where(lt(monitorEntries.createdAt, cutoff.toISOString()))
      .returning();
    return deleted.length;
  }

  /**
   * Get entry counts grouped by type.
   */
  async getStats(): Promise<MonitorStats> {
    const rows = await this.db
      .select({
        type: monitorEntries.type,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(monitorEntries)
      .groupBy(monitorEntries.type);

    const stats: MonitorStats = {
      request: 0,
      query: 0,
      job: 0,
      event: 0,
      mail: 0,
      notification: 0,
      cache: 0,
      exception: 0,
    };

    for (const row of rows) {
      if (row.type in stats) {
        stats[row.type as MonitorEntryType] = row.count;
      }
    }

    return stats;
  }

  // ─── Private ───────────────────────────────────────────────

  private deserializeRow(row: typeof monitorEntries.$inferSelect): MonitorEntryRecord {
    let content: Record<string, unknown> = {};
    let tags: string[] | null = null;

    try {
      content = typeof row.content === 'string' ? JSON.parse(row.content) : (row.content as Record<string, unknown>);
    } catch {
      content = {};
    }

    try {
      tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags as string[] | null);
    } catch {
      tags = null;
    }

    return {
      id: row.id,
      type: row.type as MonitorEntryType,
      content,
      familyHash: row.familyHash,
      batchId: row.batchId,
      tags,
      status: row.status as MonitorEntryStatus,
      duration: row.duration,
      createdAt: row.createdAt,
    };
  }
}
