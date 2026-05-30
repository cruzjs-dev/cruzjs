/**
 * ScopedDb — Automatic scope condition builder for multi-tenant queries.
 *
 * Inspects a Drizzle table at runtime to determine which scope columns exist
 * (orgId, userId, deletedAt) and produces the appropriate SQL conditions.
 *
 * @example
 * ```ts
 * const scoped = createScopedDb(db, { orgId: 'org_123', includeSoftDeleted: false });
 * const conditions = scoped.buildScopeConditions(myTable);
 * const rows = await db.select().from(myTable).where(and(...conditions));
 * ```
 */

import { eq, isNull, type SQL, type Table, type TableConfig, type Column } from 'drizzle-orm';
import type { CruzDatabase } from './cruz-database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScopedDbOptions {
  /** Filter by organization ID (applied when the table has an `orgId` column). */
  orgId?: string;
  /** Filter by user ID (applied when the table has a `userId` column). */
  userId?: string;
  /** When false (default), adds `isNull(table.deletedAt)` if the column exists. */
  includeSoftDeleted?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Look up a column by name in a Drizzle table's column map.
 * Returns the Column if found, null otherwise.
 */
function getColumn(table: Table<TableConfig>, name: string): Column | null {
  // Drizzle tables expose columns via the Symbol-keyed `Columns` brand,
  // but also as direct properties on the table object.
  const col = (table as unknown as Record<string, unknown>)[name];
  if (col && typeof col === 'object' && 'name' in (col as object)) {
    return col as Column;
  }
  return null;
}

// ---------------------------------------------------------------------------
// ScopedDb class
// ---------------------------------------------------------------------------

export class ScopedDb {
  constructor(
    public readonly db: CruzDatabase,
    private readonly options: ScopedDbOptions,
  ) {}

  /**
   * Build an array of SQL conditions appropriate for the given table and
   * the scope options this instance was created with.
   *
   * Returns an empty array when no conditions apply (e.g. no matching
   * columns or no scope values provided).
   *
   * Usage:
   * ```ts
   * const conds = scoped.buildScopeConditions(myTable);
   * const rows = await scoped.db.select().from(myTable).where(and(...conds));
   * ```
   */
  buildScopeConditions(table: Table<TableConfig>): SQL[] {
    const conditions: SQL[] = [];

    // Org scope
    if (this.options.orgId) {
      const orgIdCol = getColumn(table, 'orgId');
      if (orgIdCol) {
        conditions.push(eq(orgIdCol, this.options.orgId));
      }
    }

    // User scope
    if (this.options.userId) {
      const userIdCol = getColumn(table, 'userId');
      if (userIdCol) {
        conditions.push(eq(userIdCol, this.options.userId));
      }
    }

    // Soft-delete filter (default: exclude soft-deleted rows)
    if (!this.options.includeSoftDeleted) {
      const deletedAtCol = getColumn(table, 'deletedAt');
      if (deletedAtCol) {
        conditions.push(isNull(deletedAtCol));
      }
    }

    return conditions;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a ScopedDb instance that can produce scope conditions for any table.
 *
 * @param db - The CruzDatabase instance (passed through for convenience).
 * @param options - Scope parameters: orgId, userId, includeSoftDeleted.
 */
export function createScopedDb(
  db: CruzDatabase,
  options: ScopedDbOptions = {},
): ScopedDb {
  return new ScopedDb(db, options);
}
