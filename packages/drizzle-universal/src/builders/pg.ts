import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  unique,
} from 'drizzle-orm/pg-core';
import type { DialectBuilder } from '../types';

/**
 * PostgreSQL dialect builder.
 *
 * Column normalizations:
 * - boolean   → boolean(name)                           native PG boolean
 * - timestamp → timestamp(name, { mode: 'string', withTimezone: true })
 *               returns ISO-8601 string (matches SQLite behaviour so service
 *               code never needs to change)
 * - json<T>   → jsonb(name).$type<T>()                 native JSONB
 *
 * Used by: adapter-docker, adapter-aws, adapter-gcp, adapter-azure,
 *          adapter-digitalocean.
 */
export const pgBuilder = {
  dialect: 'postgresql' as const,

  table: pgTable,

  text: (name: string) => text(name),
  integer: (name: string) => integer(name),
  real: (name: string) => real(name),

  // Normalizations
  boolean: (name: string) => boolean(name),
  timestamp: (name: string) =>
    timestamp(name, { mode: 'string' as const, withTimezone: true }),
  dateTimestamp: (name: string) =>
    timestamp(name, { mode: 'date' as const, withTimezone: true }),
  json: <T = unknown>(name: string) => jsonb(name).$type<T>(),
  unique: (name?: string) => (name ? unique(name) : unique()),

  index,
  uniqueIndex,
} satisfies DialectBuilder;

export type PgBuilder = typeof pgBuilder;
