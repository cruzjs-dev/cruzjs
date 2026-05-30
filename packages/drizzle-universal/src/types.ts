import type { Table, TableConfig, AnyColumn, SQL } from 'drizzle-orm';

export type SupportedDialect = 'sqlite' | 'postgresql' | 'mysql';

/**
 * Universal dialect-agnostic table reference for schema factory `refs` parameters.
 *
 * `TShape` maps column names to their TypeScript value types — the JS type you
 * get when you read that column (e.g. `{ id: string; createdAt: string }`).
 * Only declare the columns the factory actually uses: FKs, `relations()` refs, etc.
 *
 * All three dialect table types (SQLiteTableWithColumns, PgTableWithColumns,
 * MySqlTableWithColumns) satisfy TableRef when their column data types match,
 * so factories written against this type run unchanged on every adapter.
 *
 * The columns resolve to `AnyColumn<{ data: T }>` from `drizzle-orm`, which means:
 * - `.references(() => refs.table.id)`  works — it's a real Drizzle column
 * - `relations(refs.table, …)`          works — it extends `Table<TableConfig>`
 * - column data types are real          (no `any`)
 *
 * @example
 * ```ts
 * import type { TableRef } from '@cruzjs/drizzle-universal';
 *
 * export const createWebhookSchema = DrizzleUniversalFactory.create(
 *   (b, refs: {
 *     organizations: TableRef<{ id: string }>;
 *     authIdentity:  TableRef<{ id: string }>;
 *   }) => ({
 *     webhooks: b.table('Webhook', {
 *       orgId: b.text('orgId').references(() => refs.organizations.id),
 *       //                                          ↑ AnyColumn<{ data: string }>
 *     }),
 *   }),
 * );
 * ```
 */
export type TableRef<TShape extends Record<string, unknown>> =
  Table<TableConfig> &
  { readonly [K in keyof TShape]: AnyColumn<{ data: TShape[K] }> };

// ─── UCB: Universal Column Builder ─────────────────────────────────────────────

/**
 * Universal Column Builder — dialect-agnostic column definition with typed data.
 *
 * TData:       the JS value type when reading this column
 * THasDefault: true if the column has a JS/DB default (.$defaultFn, .default(), etc.)
 *
 * All modifier methods preserve or narrow the type parameters.
 * At runtime the underlying value is always a real dialect column builder
 * (SQLiteColumnBuilder, PgColumnBuilder, etc.).
 */
export interface UCB<TData, THasDefault extends boolean = false> {
  notNull(): UCB<NonNullable<TData>, THasDefault>;
  default(value: NonNullable<TData> | SQL): UCB<TData, true>;
  primaryKey(): UCB<NonNullable<TData>, THasDefault>;
  $defaultFn(fn: () => NonNullable<TData>): UCB<TData, true>;
  references(
    ref: () => AnyColumn,
    config?: {
      onDelete?: 'cascade' | 'restrict' | 'set null' | 'no action' | 'set default';
      onUpdate?: 'cascade' | 'restrict' | 'set null' | 'no action' | 'set default';
    },
  ): UCB<TData, THasDefault>;
  unique(name?: string): UCB<TData, THasDefault>;
}

// ─── Private helper types for UniversalTable inference ──────────────────────────

// Extract JS data type from a UCB
type UCBData<C> = C extends UCB<infer T, boolean> ? T : never;

// Is this column optional in $inferInsert?
// Nullable columns (TData includes null) OR columns with defaults are optional.
type UCBIsOptional<C> =
  C extends UCB<infer TData, infer THasDefault>
    ? null extends TData ? true : THasDefault
    : false;

// Compute $inferSelect shape
type UCBInferSelect<TColumns extends Record<string, UCB<unknown, boolean>>> = {
  [K in keyof TColumns]: UCBData<TColumns[K]>;
};

// Compute $inferInsert shape — required fields separated from optional fields
type UCBInferInsert<TColumns extends Record<string, UCB<unknown, boolean>>> =
  { [K in keyof TColumns as UCBIsOptional<TColumns[K]> extends false ? K : never]: UCBData<TColumns[K]> } &
  { [K in keyof TColumns as UCBIsOptional<TColumns[K]> extends true  ? K : never]?: UCBData<TColumns[K]> };

// ─── UniversalTable ─────────────────────────────────────────────────────────────

/**
 * A dialect-agnostic table type returned by UniversalBuilder.table().
 *
 * At runtime: a real SQLiteTableWithColumns / PgTableWithColumns / MySqlTableWithColumns.
 * At compile time: a Table<TableConfig> with properly inferred $inferSelect and $inferInsert.
 *
 * Compatible with all CruzDatabase operations (select/insert/update/delete).
 */
export type UniversalTable<TColumns extends Record<string, UCB<unknown, boolean>>> =
  Table<TableConfig> & {
    readonly $inferSelect: UCBInferSelect<TColumns>;
    readonly $inferInsert: UCBInferInsert<TColumns>;
  } & {
    readonly [K in keyof TColumns]: AnyColumn<{ data: UCBData<TColumns[K]> }>;
  };

// ─── UniversalBuilder ───────────────────────────────────────────────────────────

/**
 * Truly dialect-agnostic builder for use in DrizzleUniversalFactory.create() callbacks.
 *
 * All column methods return UCB<T> — a dialect-neutral column representation that:
 * - carries the correct JS data type (string, number, boolean, Date, etc.)
 * - tracks nullability (TData includes null by default; .notNull() removes it)
 * - tracks defaultness (THasDefault=true after .$defaultFn()/.default())
 * - produces accurate $inferSelect and $inferInsert on the returned table
 *
 * At runtime DrizzleUniversalFactory.create() always calls getDialectBuilder(),
 * so the actual columns and tables are real SQLite/PG/MySQL objects.
 * UniversalBuilder is only the compile-time type — it enforces that you only use
 * the normalized cross-dialect API (no SQLite-specific or PG-specific methods).
 *
 * For dialect-specific column types (e.g. PG's uuid(), array(), citext()),
 * you must target a specific dialect: annotate b: PgBuilder or b: MySQLBuilder.
 */
export interface UniversalBuilder {
  readonly dialect: SupportedDialect;

  table<TColumns extends Record<string, UCB<unknown, boolean>>>(
    name: string,
    columns: TColumns,
    config?: (table: any) => Record<string, any>,
  ): UniversalTable<TColumns>;

  /** Stores as TEXT (SQLite), TEXT (PG), VARCHAR(65535) (MySQL). JS type: string. */
  text(name: string): UCB<string | null>;
  /** Stores as INTEGER (SQLite/PG), INT (MySQL). JS type: number. */
  integer(name: string): UCB<number | null>;
  /** Stores as REAL (SQLite/PG), FLOAT (MySQL). JS type: number. */
  real(name: string): UCB<number | null>;
  /** Stores as integer(mode:'boolean') / boolean / tinyint. JS type: boolean. */
  boolean(name: string): UCB<boolean | null>;
  /** ISO-8601 string in JS for all dialects. SQLite: text, PG/MySQL: timestamp(mode:'string'). */
  timestamp(name: string): UCB<string | null>;
  /** JS Date object for all dialects. SQLite: integer(mode:'timestamp'), PG/MySQL: timestamp(mode:'date'). */
  dateTimestamp(name: string): UCB<Date | null>;
  /** JSON value. SQLite: text(mode:'json'), PG: jsonb, MySQL: json. */
  json<T = unknown>(name: string): UCB<T | null>;

  unique(name?: string): any;
  index(name: string): any;
  uniqueIndex(name: string): any;
}

// ─── fkRef ──────────────────────────────────────────────────────────────────────

/**
 * Cast a `TableRef` column to be usable inside Drizzle's `.references()` callback.
 *
 * `TableRef<TShape>` columns are typed as `AnyColumn<{ data: T }>` — the broadest
 * dialect-agnostic column type. However, SQLite's `.references()` internally requires
 * `SQLiteColumn`. At runtime the column IS a SQLiteColumn (or PgColumn, etc.), so
 * this cast is always safe.
 *
 * @example
 * ```ts
 * orgId: b.text('orgId').references(() => fkRef(refs.organizations.id), { onDelete: 'cascade' }),
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fkRef(col: AnyColumn<{ data: any }>): any {
  return col;
}

// ─── Deprecated ─────────────────────────────────────────────────────────────────

/**
 * @deprecated Use `TableRef<TShape>` instead.
 * `BuiltTable` gave `any`-typed columns. `TableRef` uses Drizzle's own
 * `AnyColumn<{ data: T }>` so column types are real and `relations()` works.
 */
export type BuiltTable<TColumns extends Record<string, any> = Record<string, any>> =
  { readonly [K in keyof TColumns]: any } &
  { readonly _: { readonly name: string; readonly [k: string]: any } } &
  { readonly $inferSelect: any; readonly $inferInsert: any };

// ─── DialectBuilder (runtime interface) ─────────────────────────────────────────

/**
 * Dialect-agnostic schema builder interface.
 *
 * Column methods return `any` so factory functions written against this
 * interface compile and run correctly for all dialects.  For full type
 * inference use `UniversalBuilder` which returns `UCB<T>` with proper
 * data types. `DialectBuilder` is the runtime interface that dialect
 * builders (SQLiteBuilder, PgBuilder, etc.) implement via `satisfies`.
 *
 * The three key normalizations this interface provides:
 * - `boolean()` → integer(mode:'boolean') | boolean() | tinyint(mode:'boolean')
 * - `timestamp()` → text() | timestamp(mode:'string') | timestamp(mode:'string')
 *   (always returns ISO-8601 string in JS so service code never changes)
 * - `json<T>()` → text(mode:'json') | jsonb() | json()
 */
export interface DialectBuilder {
  readonly dialect: SupportedDialect;

  // Table creator.  Returns `any` so the real dialect table type (SQLiteTable,
  // PgTable, etc.) flows through unchanged at the call sites that use a
  // concrete builder.  The concrete type is inferred by the factory overloads;
  // this abstract signature is only used when `b` is explicitly annotated as
  // `DialectBuilder`.
  table(
    name: string,
    columns: Record<string, any>,
    config?: (table: any) => Record<string, any>,
  ): any;

  // Base column builders
  text(name: string): any;
  integer(name: string): any;
  real(name: string): any;

  // Normalized column builders (hide dialect differences)
  boolean(name: string): any;
  /**
   * Timestamp stored as an ISO-8601 string in JS.
   * SQLite: text column. PG/MySQL: timestamp(mode:'string').
   */
  timestamp(name: string): any;
  /**
   * Timestamp stored as a JS Date object.
   * SQLite: integer(mode:'timestamp'). PG/MySQL: timestamp(mode:'date').
   * Use this for schemas that currently use integer timestamps.
   */
  dateTimestamp(name: string): any;
  json<T = unknown>(name: string): any;
  /** Inline unique constraint (equivalent to uniqueIndex for DDL purposes). */
  unique(name?: string): any;

  // Index helpers — each dialect exposes the same .on(...cols) API
  index: (name: string) => any;
  uniqueIndex: (name: string) => any;
}
