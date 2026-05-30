/**
 * Test Database Factory
 *
 * Creates an in-memory SQLite database using better-sqlite3 + Drizzle ORM
 * for fast, isolated test runs.
 *
 * @example
 * ```typescript
 * import { createTestDb } from '@cruzjs/core/testing';
 * import * as schema from './database/schema';
 *
 * const db = createTestDb(schema);
 * // db is a CruzDatabase backed by in-memory SQLite
 * ```
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { DrizzleCruzDatabase, type CruzDatabase, type AnyDialectDatabase } from '../shared/database/drizzle.service';
import type { SQL } from 'drizzle-orm';

export interface TestDbOptions {
  /**
   * SQL statements to run after creating the database (e.g., CREATE TABLE).
   * If provided, these run before returning the database.
   */
  migrations?: string[];

  /**
   * Whether to enable WAL mode. Defaults to false for in-memory databases.
   */
  walMode?: boolean;
}

/**
 * Create an in-memory SQLite database wrapped in the CruzDatabase interface.
 *
 * The database lives entirely in memory and is destroyed when the reference
 * is garbage-collected, making it ideal for test isolation.
 *
 * @param schema - Drizzle schema object for type inference
 * @param options - Optional configuration
 * @returns A CruzDatabase instance backed by in-memory SQLite
 */
export function createTestDb<TSchema extends Record<string, unknown>>(
  schema: TSchema,
  options: TestDbOptions = {},
): CruzDatabase {
  const sqlite = new Database(':memory:');

  // Enable foreign keys (important for referential integrity tests)
  sqlite.pragma('foreign_keys = ON');

  if (options.walMode) {
    sqlite.pragma('journal_mode = WAL');
  }

  // Run setup migrations if provided
  if (options.migrations) {
    for (const sql of options.migrations) {
      sqlite.exec(sql);
    }
  }

  const rawDb = drizzle(sqlite, { schema });
  return DrizzleCruzDatabase.create(rawDb as AnyDialectDatabase);
}

/**
 * Create an in-memory SQLite database and run raw SQL to set up tables.
 * Convenience wrapper when you have SQL migration strings.
 *
 * @param schema - Drizzle schema object
 * @param sqlStatements - Raw SQL CREATE TABLE statements
 * @returns A CruzDatabase instance
 */
export function createTestDbWithMigrations<TSchema extends Record<string, unknown>>(
  schema: TSchema,
  sqlStatements: string[],
): CruzDatabase {
  return createTestDb(schema, { migrations: sqlStatements });
}
