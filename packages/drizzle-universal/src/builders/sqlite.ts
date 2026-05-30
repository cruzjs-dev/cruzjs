import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
  unique,
} from 'drizzle-orm/sqlite-core';
import type { DialectBuilder } from '../types';

/**
 * SQLite dialect builder.
 *
 * Column normalizations:
 * - boolean  → integer(name, { mode: 'boolean' })   returns JS boolean
 * - timestamp → text(name)                           returns ISO-8601 string
 * - json<T>  → text(name, { mode: 'json' }).$type<T>() returns T
 *
 * Used by: adapter-cloudflare (D1) and local dev (better-sqlite3).
 *
 * `satisfies DialectBuilder` lets TypeScript preserve the concrete types on
 * this object (e.g. `table: typeof sqliteTable`) while still verifying it
 * conforms to the interface. This means calling a schema factory with
 * `sqliteBuilder` directly gives full column-level type inference.
 */
export const sqliteBuilder = {
  dialect: 'sqlite' as const,

  table: sqliteTable,

  text: (name: string) => text(name),
  integer: (name: string) => integer(name),
  real: (name: string) => real(name),

  // Normalizations
  boolean: (name: string) => integer(name, { mode: 'boolean' as const }),
  timestamp: (name: string) => text(name),
  dateTimestamp: (name: string) => integer(name, { mode: 'timestamp' as const }),
  json: <T = unknown>(name: string) =>
    text(name, { mode: 'json' as const }).$type<T>(),
  unique: (name?: string) => (name ? unique(name) : unique()),

  index,
  uniqueIndex,
} satisfies DialectBuilder;

export type SQLiteBuilder = typeof sqliteBuilder;
