/**
 * Soft Delete Service
 *
 * Provides soft-delete, restore, force-delete, and scope filtering
 * for any Drizzle table that includes a `deletedAt` column.
 */

import { eq, isNull, isNotNull, inArray } from 'drizzle-orm';
import { Injectable } from '../di';
import { SoftDeleteScope } from './soft-delete.types';
import type { SoftDeletable } from './soft-delete.types';
import type { DrizzleDatabase } from '../shared/database/drizzle.service';

@Injectable()
export class SoftDeleteService {
  /**
   * Apply a soft-delete scope filter to a Drizzle where clause.
   * Returns the appropriate condition based on the scope.
   *
   * @param table - The Drizzle table reference (must have a `deletedAt` column)
   * @param scope - The soft-delete scope to apply
   * @returns A Drizzle SQL condition, or undefined for WITH_DELETED
   *
   * @example
   * ```typescript
   * const condition = softDeleteService.scopeCondition(myItems, SoftDeleteScope.DEFAULT);
   * const items = await db.select().from(myItems).where(condition);
   * ```
   */
  scopeCondition(table: { deletedAt: any }, scope: SoftDeleteScope = SoftDeleteScope.DEFAULT) {
    switch (scope) {
      case SoftDeleteScope.DEFAULT:
        return isNull(table.deletedAt);
      case SoftDeleteScope.ONLY_DELETED:
        return isNotNull(table.deletedAt);
      case SoftDeleteScope.WITH_DELETED:
        return undefined;
    }
  }

  /**
   * Soft-delete a single record by setting its `deletedAt` timestamp.
   */
  async softDelete(db: DrizzleDatabase, table: any, id: string): Promise<void> {
    await db
      .update(table)
      .set({ deletedAt: new Date() })
      .where(eq(table.id, id));
  }

  /**
   * Bulk soft-delete multiple records by their IDs.
   */
  async bulkSoftDelete(db: DrizzleDatabase, table: any, ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await db
      .update(table)
      .set({ deletedAt: new Date() })
      .where(inArray(table.id, ids));
  }

  /**
   * Restore a soft-deleted record by clearing its `deletedAt` timestamp.
   */
  async restore(db: DrizzleDatabase, table: any, id: string): Promise<void> {
    await db
      .update(table)
      .set({ deletedAt: null })
      .where(eq(table.id, id));
  }

  /**
   * Permanently delete a record from the database.
   */
  async forceDelete(db: DrizzleDatabase, table: any, id: string): Promise<void> {
    await db
      .delete(table)
      .where(eq(table.id, id));
  }

  /**
   * Check whether a record is currently soft-deleted.
   */
  isSoftDeleted(record: SoftDeletable): boolean {
    return record.deletedAt !== null;
  }
}
