/**
 * CruzDatabase - Dialect-agnostic database interface for CruzJS framework services.
 *
 * Zero `any`/`unknown` in any public-facing position.
 * API mirrors Drizzle's chain style so consumer code stays identical:
 *
 *   const [row] = await this.db.select().from(table).where(eq(table.id, id)).limit(1);
 *   await this.db.insert(table).values({ ... });
 *   await this.db.update(table).set({ ... }).where(eq(table.id, id));
 *   await this.db.delete(table).where(eq(table.id, id));
 */

import type { Column, SQL, SQLWrapper, Table, TableConfig } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { MySql2Database } from 'drizzle-orm/mysql2';

// ─── Dialect database union ────────────────────────────────────────────────

/**
 * Union of every Drizzle database instance CruzJS supports.
 * All members are `import type` — zero bundle cost.
 * Used only as the constructor parameter for DrizzleCruzDatabase.
 */
export type AnyDialectDatabase<TSchema extends Record<string, unknown> = Record<string, unknown>> =
  | DrizzleD1Database<TSchema>
  | BetterSQLite3Database<TSchema>
  | PostgresJsDatabase<TSchema>
  | MySql2Database<TSchema>;

// ─── Select field types ────────────────────────────────────────────────────

/**
 * A valid field in a select() fields map.
 * Covers raw columns, SQL expressions, and aliased expressions (`.as('alias')`).
 * The `{ sql: SQL<unknown> }` branch captures `Aliased<T>` from drizzle-orm
 * without needing to import that class directly.
 */
export type CruzSelectField = Column | SQL | SQLWrapper;

/** Map of named select fields — the argument to `select({ ... })`. */
export type CruzSelectFields = Record<string, CruzSelectField>;

/**
 * Infer the TypeScript value type for a single select field.
 *
 * Handles in order:
 *  1. `SQL<T>`                     → T  (e.g. `sql<number>\`count(*)\``)
 *  2. `{ _: { type: T } }`         → T  (e.g. `sql<number>\`count(*)\`.as('n')` → Aliased<T>)
 *     NOTE: drizzle's Aliased<T> declares `readonly sql: SQL` (not `SQL<T>`), so
 *     the generic T is only accessible via the internal `_: { type: T }` brand field.
 *  3. `Column<C>`                  → C['data']  (table column)
 */
export type InferCruzSelectField<T> =
  T extends SQL<infer TData>
    ? TData
    : T extends { _: { type: infer TData } }
      ? TData
      : T extends Column<infer TConfig>
        ? TConfig['data']
        : unknown;

/** Map a CruzSelectFields object to its inferred result shape. */
export type InferCruzSelectResult<TFields extends CruzSelectFields> = {
  [K in keyof TFields]: InferCruzSelectField<TFields[K]>;
};

// ─── Awaitable base ────────────────────────────────────────────────────────

/**
 * Base for all awaitable result builders.
 * Extends PromiseLike<T> and adds `.catch()` so consumers can write
 * `.insert().values().catch(() => {})` without a type error.
 */
export interface CruzResultBuilder<T> extends PromiseLike<T> {
  catch<TResult2 = never>(
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<T | TResult2>;
}

// ─── Builder interfaces ────────────────────────────────────────────────────

/** Awaitable chainable builder returned by select().from() */
export interface CruzFromBuilder<TResult> extends CruzResultBuilder<TResult[]> {
  where(condition: SQL | undefined): CruzFromBuilder<TResult>;
  limit(n: number): CruzFromBuilder<TResult>;
  offset(n: number): CruzFromBuilder<TResult>;
  orderBy(...columns: (Column | SQL)[]): CruzFromBuilder<TResult>;
  groupBy(...columns: (Column | SQL)[]): CruzFromBuilder<TResult>;
  /**
   * NOTE: Join methods do not widen the result type — joined table columns are
   * present at runtime but invisible to TypeScript. For type-safe joins, use
   * `select({ field1: t1.col, field2: t2.col })` with explicit field selection.
   */
  innerJoin(table: Table<TableConfig>, on: SQL | boolean): CruzFromBuilder<TResult>;
  leftJoin(table: Table<TableConfig>, on: SQL | boolean): CruzFromBuilder<TResult>;
  rightJoin(table: Table<TableConfig>, on: SQL | boolean): CruzFromBuilder<TResult>;
  fullJoin(table: Table<TableConfig>, on: SQL | boolean): CruzFromBuilder<TResult>;
}

/** Builder returned by select() with no arguments — infers result from .from(table) */
export interface CruzSelectBuilder {
  from<TTable extends Table<TableConfig>>(
    table: TTable,
  ): CruzFromBuilder<TTable['$inferSelect']>;
}

/**
 * Builder returned by select({ ... }) with explicit fields.
 * Result type is inferred from the fields map via InferCruzSelectResult.
 */
export interface CruzCustomSelectBuilder<TFields extends CruzSelectFields> {
  from(table: Table<TableConfig>): CruzFromBuilder<InferCruzSelectResult<TFields>>;
}

/**
 * Awaitable result after .values().
 * .returning() available on SQLite and PostgreSQL; not supported on MySQL.
 */
export interface CruzInsertResultBuilder<TResult> extends CruzResultBuilder<void> {
  /** Return the full inserted row(s). */
  returning(): PromiseLike<TResult[]>;
  /** Return specific fields from the inserted row(s), inferred from the fields map. */
  returning<TFields extends CruzSelectFields>(
    fields: TFields,
  ): PromiseLike<InferCruzSelectResult<TFields>[]>;
}

export interface CruzInsertBuilder<TTable extends Table<TableConfig>> {
  values(
    data: TTable['$inferInsert'] | TTable['$inferInsert'][],
  ): CruzInsertResultBuilder<TTable['$inferSelect']>;
}

/**
 * Awaitable result after update().set().where() — supports .returning().
 */
export interface CruzUpdateWhereBuilder<TResult> extends CruzResultBuilder<void> {
  returning(): PromiseLike<TResult[]>;
  returning<TFields extends CruzSelectFields>(
    fields: TFields,
  ): PromiseLike<InferCruzSelectResult<TFields>[]>;
}

export interface CruzSetBuilder<TResult> extends CruzResultBuilder<void> {
  where(condition: SQL | undefined): CruzUpdateWhereBuilder<TResult>;
  returning(): PromiseLike<TResult[]>;
  returning<TFields extends CruzSelectFields>(
    fields: TFields,
  ): PromiseLike<InferCruzSelectResult<TFields>[]>;
}

/**
 * Update data map — each column can be set to its native JS value or an SQL expression.
 * Allows patterns like `set({ score: sql<number>`score + 1` })`.
 */
export type CruzUpdateData<TInsert> = {
  [K in keyof TInsert]?: TInsert[K] | SQL;
};

export interface CruzUpdateBuilder<TTable extends Table<TableConfig>> {
  set(data: CruzUpdateData<TTable['$inferInsert']>): CruzSetBuilder<TTable['$inferSelect']>;
}

/**
 * Awaitable result after delete().where() — supports .returning().
 */
export interface CruzDeleteWhereBuilder<TResult> extends CruzResultBuilder<void> {
  returning(): PromiseLike<TResult[]>;
  returning<TFields extends CruzSelectFields>(
    fields: TFields,
  ): PromiseLike<InferCruzSelectResult<TFields>[]>;
}

export interface CruzDeleteBuilder<TResult> extends CruzResultBuilder<void> {
  where(condition: SQL | undefined): CruzDeleteWhereBuilder<TResult>;
  returning(): PromiseLike<TResult[]>;
  returning<TFields extends CruzSelectFields>(
    fields: TFields,
  ): PromiseLike<InferCruzSelectResult<TFields>[]>;
}

// ─── Main interface ────────────────────────────────────────────────────────

/**
 * CruzDatabase -- dialect-agnostic database interface for all CruzJS framework
 * services. Backed by DrizzleCruzDatabase which wraps any dialect's Drizzle db.
 *
 * API mirrors Drizzle's chain style -- no learning curve:
 *   const [row] = await this.db.select().from(table).where(eq(table.id, id)).limit(1);
 *   await this.db.insert(table).values({ ... });
 *   await this.db.update(table).set({ ... }).where(eq(table.id, id));
 *   await this.db.delete(table).where(eq(table.id, id));
 */
export interface CruzDatabase {
  select(): CruzSelectBuilder;
  select<TFields extends CruzSelectFields>(fields: TFields): CruzCustomSelectBuilder<TFields>;
  insert<TTable extends Table<TableConfig>>(into: TTable): CruzInsertBuilder<TTable>;
  update<TTable extends Table<TableConfig>>(table: TTable): CruzUpdateBuilder<TTable>;
  delete<TTable extends Table<TableConfig>>(from: TTable): CruzDeleteBuilder<TTable['$inferSelect']>;
  transaction<T>(fn: (tx: CruzDatabase) => Promise<T>): Promise<T>;

  /**
   * Execute a raw SQL statement. Available on SQLite (D1/BetterSQLite3).
   * Throws on dialects that don't support it.
   */
  run(query: SQL): PromiseLike<void>;

  /**
   * Execute a raw SQL query and return all rows.
   * Available on SQLite (D1/BetterSQLite3). Throws on unsupported dialects.
   */
  all<T = Record<string, unknown>>(query: SQL): PromiseLike<T[]>;
}
