/**
 * Admin Service
 *
 * Generic CRUD service for admin-managed resources. Works against any Drizzle
 * table registered in the AdminRegistry. Provides pagination, filtering,
 * sorting, bulk delete, action execution, and dashboard stats.
 */

import { Injectable, Inject } from '@cruzjs/core/di';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { eq, like, sql, count, and, gte, asc, desc as drizzleDesc } from 'drizzle-orm';
import { AdminRegistry } from './admin.registry';
import { ImpersonationService } from './admin.impersonation';
import type { AdminListResult, AdminStats, AdminResourceConfig } from './admin.types';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(AdminRegistry) private readonly registry: AdminRegistry,
    @Inject(ImpersonationService) private readonly impersonation: ImpersonationService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private getResourceOrThrow(resource: string): AdminResourceConfig {
    const config = this.registry.get(resource);
    if (!config) {
      throw new Error(`Admin resource "${resource}" not found`);
    }
    return config;
  }

  private assertOperation(config: AdminResourceConfig, op: string): void {
    const allowed = config.operations ?? ['list', 'create', 'read', 'update', 'delete'];
    if (!allowed.includes(op as any)) {
      throw new Error(`Operation "${op}" is not allowed on resource "${config.name}"`);
    }
  }

  // ─── List ────────────────────────────────────────────────────────────────

  /**
   * List resources with pagination, filtering, and sorting.
   */
  async list(
    resource: string,
    options: {
      page?: number;
      perPage?: number;
      search?: string;
      filters?: Record<string, string>;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    } = {},
  ): Promise<AdminListResult> {
    const config = this.getResourceOrThrow(resource);
    this.assertOperation(config, 'list');

    const table = config.table;
    const page = options.page ?? 1;
    const perPage = options.perPage ?? config.perPage ?? 20;
    const offset = (page - 1) * perPage;

    // Build WHERE conditions
    const conditions: ReturnType<typeof eq>[] = [];

    // Search across searchable columns
    if (options.search) {
      const searchable = config.columns.filter((c) => c.searchable);
      for (const col of searchable) {
        if (table[col.key]) {
          conditions.push(like(table[col.key], `%${options.search}%`));
        }
      }
    }

    // Apply explicit filters
    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (table[key]) {
          conditions.push(eq(table[key], value));
        }
      }
    }

    // For search we use OR logic across searchable columns but AND for filters.
    // Simplification: when search is provided we apply it as OR across searchable
    // columns. Filter conditions are always AND. We combine them at the end.
    const searchConditions: ReturnType<typeof eq>[] = [];
    const filterConditions: ReturnType<typeof eq>[] = [];

    if (options.search) {
      const searchable = config.columns.filter((c) => c.searchable);
      for (const col of searchable) {
        if (table[col.key]) {
          searchConditions.push(like(table[col.key], `%${options.search}%`));
        }
      }
    }

    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (table[key]) {
          filterConditions.push(eq(table[key], value));
        }
      }
    }

    // Build the final where clause
    let whereClause;
    if (searchConditions.length > 0 && filterConditions.length > 0) {
      // Search is OR, filters are AND
      const searchOr = sql`(${sql.join(
        searchConditions.map((c) => sql`${c}`),
        sql` OR `,
      )})`;
      whereClause = and(searchOr, ...filterConditions);
    } else if (searchConditions.length > 0) {
      whereClause = sql`(${sql.join(
        searchConditions.map((c) => sql`${c}`),
        sql` OR `,
      )})`;
    } else if (filterConditions.length > 0) {
      whereClause = and(...filterConditions);
    }

    // Sorting
    const sortBy = options.sortBy ?? config.defaultSort?.column;
    const sortDir = options.sortDir ?? config.defaultSort?.direction ?? 'desc';

    let orderClause;
    if (sortBy && table[sortBy]) {
      orderClause = sortDir === 'asc' ? asc(table[sortBy]) : drizzleDesc(table[sortBy]);
    }

    // Execute count query
    const countQuery = this.db.select({ count: count() }).from(table);
    if (whereClause) {
      countQuery.where(whereClause);
    }
    const [{ count: total }] = await countQuery;

    // Execute data query
    const dataQuery = this.db.select().from(table);
    if (whereClause) {
      dataQuery.where(whereClause);
    }
    if (orderClause) {
      dataQuery.orderBy(orderClause);
    }
    dataQuery.limit(perPage).offset(offset);

    const rows = await dataQuery;

    return {
      rows,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  // ─── Get ─────────────────────────────────────────────────────────────────

  /**
   * Get a single record by ID.
   */
  async get(resource: string, id: string): Promise<unknown> {
    const config = this.getResourceOrThrow(resource);
    this.assertOperation(config, 'read');

    const table = config.table;
    if (!table.id) {
      throw new Error(`Resource "${resource}" table does not have an "id" column`);
    }

    const [row] = await this.db
      .select()
      .from(table)
      .where(eq(table.id, id))
      .limit(1);

    if (!row) {
      throw new Error(`Record not found in "${resource}" with id "${id}"`);
    }

    return row;
  }

  // ─── Create ──────────────────────────────────────────────────────────────

  /**
   * Create a new record.
   */
  async create(
    resource: string,
    data: Record<string, unknown>,
  ): Promise<unknown> {
    const config = this.getResourceOrThrow(resource);
    this.assertOperation(config, 'create');

    const [row] = await this.db
      .insert(config.table)
      .values(data)
      .returning();

    return row;
  }

  // ─── Update ──────────────────────────────────────────────────────────────

  /**
   * Update a record by ID.
   */
  async update(
    resource: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<unknown> {
    const config = this.getResourceOrThrow(resource);
    this.assertOperation(config, 'update');

    const table = config.table;
    if (!table.id) {
      throw new Error(`Resource "${resource}" table does not have an "id" column`);
    }

    const [row] = await this.db
      .update(table)
      .set(data)
      .where(eq(table.id, id))
      .returning();

    if (!row) {
      throw new Error(`Record not found in "${resource}" with id "${id}"`);
    }

    return row;
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  /**
   * Delete one or more records by ID (bulk).
   */
  async delete(resource: string, ids: string[]): Promise<void> {
    const config = this.getResourceOrThrow(resource);
    this.assertOperation(config, 'delete');

    const table = config.table;
    if (!table.id) {
      throw new Error(`Resource "${resource}" table does not have an "id" column`);
    }

    for (const id of ids) {
      await this.db.delete(table).where(eq(table.id, id));
    }
  }

  // ─── Execute Action ──────────────────────────────────────────────────────

  /**
   * Execute a registered row or bulk action on a set of IDs.
   */
  async executeAction(
    resource: string,
    action: string,
    ids: string[],
  ): Promise<void> {
    const config = this.getResourceOrThrow(resource);

    // Search in both rowActions and bulkActions
    const rowAction = config.rowActions?.find((a) => a.key === action);
    const bulkAction = config.bulkActions?.find((a) => a.key === action);

    if (bulkAction) {
      await bulkAction.handler(ids);
      return;
    }

    if (rowAction) {
      for (const id of ids) {
        await rowAction.handler(id);
      }
      return;
    }

    throw new Error(`Action "${action}" not found on resource "${resource}"`);
  }

  // ─── Stats ───────────────────────────────────────────────────────────────

  /**
   * Get dashboard stats for all registered resources.
   */
  async getStats(): Promise<AdminStats[]> {
    const resources = this.registry.list();
    const stats: AdminStats[] = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const config of resources) {
      const table = config.table;

      // Total count
      const [{ count: total }] = await this.db
        .select({ count: count() })
        .from(table);

      // Recent count (requires a createdAt column)
      let recentCount = 0;
      if (table.createdAt) {
        const [result] = await this.db
          .select({ count: count() })
          .from(table)
          .where(gte(table.createdAt, sevenDaysAgo));
        recentCount = result.count;
      }

      // Determine trend: if more than 10% of records are recent, it's "up"
      const trend: AdminStats['trend'] =
        total === 0
          ? 'stable'
          : recentCount / total > 0.1
            ? 'up'
            : recentCount === 0
              ? 'down'
              : 'stable';

      stats.push({
        resource: config.name,
        count: total,
        recentCount,
        trend,
      });
    }

    return stats;
  }

  // ─── Impersonation ───────────────────────────────────────────────────────

  /**
   * Create an impersonation token to sign in as another user.
   */
  async impersonate(
    targetUserId: string,
    adminUserId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const row = await this.impersonation.create(targetUserId, adminUserId);
    return {
      token: row.token,
      expiresAt: new Date(row.expiresAt),
    };
  }
}
