/**
 * BaseCrudService
 *
 * Generic base class for CRUD services backed by a Drizzle table.
 * Extend this to get free list/get/create/update/delete with automatic scope
 * filtering, soft-delete support, ordering, and extra WHERE conditions.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class ProductsService extends BaseCrudService<typeof products> {
 *   constructor(@Inject(DRIZZLE) db: CruzDatabase) {
 *     super(db, products, { scope: 'org', softDelete: true });
 *   }
 *
 *   // Add custom queries on top of the generated CRUD
 *   async getFeatured(orgId: string) {
 *     return this.db.select().from(this.table)
 *       .where(and(eq(products.orgId, orgId), eq(products.featured, true)));
 *   }
 * }
 * ```
 */

import 'reflect-metadata';
import { eq, and, isNull, sql, asc, desc } from 'drizzle-orm';
import type { Table, TableConfig, SQL } from 'drizzle-orm';
import type { CruzDatabase } from '../shared/database/drizzle.service';
import type { CrudListOptions, CrudScope } from './crud.types';

export interface BaseCrudServiceConfig {
  scope: CrudScope;
  /** FK column name for scope filtering */
  scopeColumn?: string;
  /** Override soft-delete detection. Default: auto-detect from `deletedAt` column. */
  softDelete?: boolean;
  /** Primary key column name. Default: `'id'` */
  idColumn?: string;
}

export class BaseCrudService<TTable extends Table<TableConfig>> {
  protected readonly table: TTable;
  protected readonly db: CruzDatabase;
  private readonly cfg: BaseCrudServiceConfig;

  constructor(db: CruzDatabase, table: TTable, config: BaseCrudServiceConfig) {
    this.db = db;
    this.table = table;
    this.cfg = config;
  }

  // ─── Column accessors ────────────────────────────────────────────────────────

  private get idCol(): string {
    return this.cfg.idColumn ?? 'id';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected col(name: string): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.table as any)[name];
  }

  protected hasSoftDelete(): boolean {
    if (typeof this.cfg.softDelete === 'boolean') return this.cfg.softDelete;
    return this.col('deletedAt') !== undefined;
  }

  private scopeWhere(scopeId: string | null): SQL | undefined {
    if (!scopeId || !this.cfg.scopeColumn) return undefined;
    return eq(this.col(this.cfg.scopeColumn), scopeId);
  }

  protected activeWhere(scopeId: string | null): SQL | undefined {
    const scope = this.scopeWhere(scopeId);
    const notDeleted = this.hasSoftDelete() ? isNull(this.col('deletedAt')) : undefined;
    if (scope && notDeleted) return and(scope, notDeleted);
    return scope ?? notDeleted;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────────

  /**
   * List records with pagination, optional scope filtering, ordering, and extra WHERE conditions.
   * Automatically excludes soft-deleted records.
   *
   * @param scopeId  - org/user id to filter by (null for global)
   * @param opts     - pagination, ordering, and pre-built WHERE conditions
   */
  async list(
    scopeId: string | null,
    opts: CrudListOptions,
  ): Promise<{ items: TTable['$inferSelect'][]; total: number }> {
    const { page, perPage, orderBy, orderDir = 'asc', whereConditions = [] } = opts;
    const offset = (page - 1) * perPage;

    // Combine scope+softDelete with extra filter conditions
    const scopeAndDeleteWhere = this.activeWhere(scopeId);
    const allConditions: SQL[] = [
      ...(scopeAndDeleteWhere ? [scopeAndDeleteWhere] : []),
      ...whereConditions,
    ];
    const where =
      allConditions.length > 1
        ? and(...(allConditions as [SQL, SQL, ...SQL[]]))
        : allConditions[0];

    // Build ORDER BY — always include one to ensure stable paging
    const orderByClause: SQL[] =
      orderBy && this.col(orderBy) !== undefined
        ? [orderDir === 'desc' ? desc(this.col(orderBy)) : asc(this.col(orderBy))]
        : [asc(this.col(this.idCol))];

    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(this.table)
        .where(where)
        .orderBy(...orderByClause)
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: sql<number>`count(*)` })
        .from(this.table)
        .where(where),
    ]);

    return { items, total: Number(countResult[0]?.total ?? 0) };
  }

  /**
   * Get a single record by id, optionally within a scope.
   * Returns null if not found or soft-deleted.
   */
  async getById(id: string, scopeId: string | null): Promise<TTable['$inferSelect'] | null> {
    const idCondition = eq(this.col(this.idCol), id);
    const scopeCondition = this.activeWhere(scopeId);
    const where = scopeCondition ? and(idCondition, scopeCondition) : idCondition;

    const [item] = await this.db.select().from(this.table).where(where).limit(1);
    return item ?? null;
  }

  /**
   * Create a record. The caller is responsible for injecting scope FK into data.
   */
  async create(data: TTable['$inferInsert']): Promise<TTable['$inferSelect']> {
    const [item] = await this.db.insert(this.table).values(data).returning();
    return item;
  }

  /**
   * Update a record by id. Automatically sets `updatedAt` if the column exists.
   */
  async update(
    id: string,
    data: Partial<TTable['$inferInsert']>,
  ): Promise<TTable['$inferSelect']> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = { ...data };
    if (this.col('updatedAt') !== undefined) {
      payload.updatedAt = new Date().toISOString();
    }

    const [item] = await this.db
      .update(this.table)
      .set(payload)
      .where(eq(this.col(this.idCol), id))
      .returning();

    return item;
  }

  /**
   * Delete a record by id.
   * Soft-deletes (sets `deletedAt`) when soft-delete is enabled, otherwise hard-deletes.
   */
  async delete(id: string): Promise<void> {
    if (this.hasSoftDelete()) {
      await this.db
        .update(this.table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set({ deletedAt: new Date().toISOString() } as any)
        .where(eq(this.col(this.idCol), id));
    } else {
      await this.db.delete(this.table).where(eq(this.col(this.idCol), id));
    }
  }
}
