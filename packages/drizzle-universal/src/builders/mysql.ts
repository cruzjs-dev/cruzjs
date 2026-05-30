import {
  mysqlTable,
  varchar,
  int,
  float,
  tinyint,
  timestamp,
  json,
  index,
  uniqueIndex,
  unique,
} from 'drizzle-orm/mysql-core';
import type { DialectBuilder } from '../types';

/**
 * MySQL dialect builder.
 *
 * Column normalizations:
 * - text      → varchar(name, { length: 65535 })  MySQL has no unbounded TEXT via varchar; use TEXT column type via varchar max
 * - integer   → int(name)
 * - real      → float(name)
 * - boolean   → tinyint(name, { mode: 'boolean' }) returns JS boolean
 * - timestamp → timestamp(name, { mode: 'string' }) returns ISO-8601 string
 * - json<T>   → json(name).$type<T>()              native JSON column
 *
 * Used by: any MySQL/PlanetScale deployment.
 */
export const mysqlBuilder = {
  dialect: 'mysql' as const,

  table: mysqlTable,

  text: (name: string) => varchar(name, { length: 65535 }),
  integer: (name: string) => int(name),
  real: (name: string) => float(name),

  // Normalizations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  boolean: (name: string) => (tinyint as any)(name, { mode: 'boolean' as const }),
  timestamp: (name: string) => timestamp(name, { mode: 'string' as const }),
  dateTimestamp: (name: string) => timestamp(name, { mode: 'date' as const }),
  json: <T = unknown>(name: string) => json(name).$type<T>(),
  unique: (name?: string) => (name ? unique(name) : unique()),

  index,
  uniqueIndex,
} satisfies DialectBuilder;

export type MySQLBuilder = typeof mysqlBuilder;
