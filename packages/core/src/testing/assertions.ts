/**
 * Database Assertion Helpers
 *
 * Fluent assertion functions for verifying database state in tests.
 * Works with any CruzDatabase instance (D1, BetterSQLite3, etc.).
 *
 * @example
 * ```typescript
 * import { assertDatabaseHas, assertDatabaseMissing, assertSoftDeleted } from '@cruzjs/core/testing';
 *
 * await assertDatabaseHas(db, users, { email: 'alice@example.com' });
 * await assertDatabaseMissing(db, users, { email: 'deleted@example.com' });
 * await assertSoftDeleted(db, users, userId);
 * ```
 */

import { eq, and, isNotNull, getTableName } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { CruzDatabase } from '../shared/database/cruz-database';

/**
 * Assert that at least one row in `table` matches the given `where` conditions.
 * Throws a descriptive error if no matching row is found.
 *
 * @param db - CruzDatabase instance
 * @param table - Drizzle table reference
 * @param where - Key-value pairs to match (all conditions ANDed)
 */
export async function assertDatabaseHas(
  db: CruzDatabase,
  table: SQLiteTable,
  where: Record<string, unknown>,
): Promise<void> {
  const conditions = Object.entries(where).map(
    ([key, value]) => eq((table as Record<string, any>)[key], value as any),
  );
  const rows = await db.select().from(table).where(and(...conditions)).limit(1);
  if (rows.length === 0) {
    throw new Error(
      `Expected database to have a row in "${getTableName(table)}" matching ${JSON.stringify(where)}, but none found.`,
    );
  }
}

/**
 * Assert that NO rows in `table` match the given `where` conditions.
 * Throws a descriptive error if a matching row is found.
 *
 * @param db - CruzDatabase instance
 * @param table - Drizzle table reference
 * @param where - Key-value pairs to match (all conditions ANDed)
 */
export async function assertDatabaseMissing(
  db: CruzDatabase,
  table: SQLiteTable,
  where: Record<string, unknown>,
): Promise<void> {
  const conditions = Object.entries(where).map(
    ([key, value]) => eq((table as Record<string, any>)[key], value as any),
  );
  const rows = await db.select().from(table).where(and(...conditions)).limit(1);
  if (rows.length > 0) {
    throw new Error(
      `Expected database NOT to have a row in "${getTableName(table)}" matching ${JSON.stringify(where)}, but found one.`,
    );
  }
}

/**
 * Assert that a row with the given `id` exists and has a non-null `deletedAt` column
 * (i.e., it has been soft-deleted).
 *
 * @param db - CruzDatabase instance
 * @param table - Drizzle table reference (must have `id` and `deletedAt` columns)
 * @param id - The row's primary key value
 */
export async function assertSoftDeleted(
  db: CruzDatabase,
  table: SQLiteTable,
  id: string,
): Promise<void> {
  const tableAny = table as Record<string, any>;
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(tableAny.id, id), isNotNull(tableAny.deletedAt)))
    .limit(1);
  if (rows.length === 0) {
    throw new Error(
      `Expected row "${id}" in "${getTableName(table)}" to be soft-deleted, but it is not.`,
    );
  }
}
