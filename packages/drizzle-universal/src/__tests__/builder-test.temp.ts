import type { AnyColumn, SQL } from 'drizzle-orm';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import type { Table, TableConfig } from 'drizzle-orm';

// Universal column builder
interface UCB<TData = unknown> {
  readonly _: { readonly data: TData };
  notNull(): UCB<TData>;
  primaryKey(): UCB<TData>;
  unique(name?: string): UCB<TData>;
  default(value: TData | SQL): UCB<TData>;
  $defaultFn(fn: () => TData | SQL): UCB<TData>;
  references(ref: () => AnyColumn, actions?: { onDelete?: string; onUpdate?: string }): UCB<TData>;
}

type TableRef<TShape extends Record<string, unknown>> =
  Table<TableConfig> &
  { readonly [K in keyof TShape]: AnyColumn<{ data: TShape[K] }> };

interface UB {
  text(name: string): UCB<string>;
  integer(name: string): UCB<number>;
  real(name: string): UCB<number>;
  boolean(name: string): UCB<boolean>;
  table<TColumns extends Record<string, UCB<unknown>>>(
    name: string,
    columns: TColumns,
    config?: (table: any) => Record<string, any>
  ): TableRef<{ [K in keyof TColumns]: TColumns[K]['_']['data'] }>;
}

const sqliteLike = {
  text: (n: string) => text(n),
  integer: (n: string) => integer(n),
  real: (n: string) => real(n),
  boolean: (n: string) => integer(n, { mode: 'boolean' as const }),
  table: (name: string, cols: any, cfg?: any) => sqliteTable(name, cols, cfg),
} satisfies UB;

function createSchema(b: UB) {
  const t = b.table('Test', {
    id: b.text('id').primaryKey(),
    count: b.integer('count').notNull().default(0),
  });
  return { t };
}

const schema = createSchema(sqliteLike);
type IdType = typeof schema.t.id; // AnyColumn<{ data: string }>?
