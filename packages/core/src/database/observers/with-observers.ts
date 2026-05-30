/**
 * withObservers -- Database lifecycle hook helpers
 *
 * Provides insert/update/delete helper functions that fire observer hooks
 * before and after the underlying Drizzle operations.
 *
 * This is an opt-in utility. Services that need observer-aware mutations
 * use these helpers instead of calling `db.insert()`/`db.update()`/`db.delete()` directly.
 * Regular Drizzle usage continues to work without observers.
 *
 * @example
 * ```typescript
 * const observed = withObservers(db, registry);
 *
 * // Insert with lifecycle hooks
 * const item = await observed.insert(myItems, { name: 'Test', orgId: '...' });
 *
 * // Update with lifecycle hooks
 * const updated = await observed.update(myItems, 'item-id', { name: 'New Name' });
 *
 * // Delete with lifecycle hooks
 * await observed.delete(myItems, 'item-id');
 * ```
 */

import { eq, getTableName } from 'drizzle-orm';
import type { Column, Table, TableConfig } from 'drizzle-orm';
import type { CruzDatabase } from '../../shared/database/cruz-database';
import type { ObserverRegistry } from './observer.registry';

/**
 * Safely extract the `id` column from a table definition.
 * All CruzJS tables use `text('id').primaryKey()`, so this is always present.
 */
function getIdColumn(table: Table<TableConfig>): Column {
  return (table as unknown as Record<string, Column>)['id'];
}

/**
 * Observed database operations returned by `withObservers`.
 */
export type ObservedDb = {
  /**
   * Insert a record with observer lifecycle hooks.
   * Calls `creating` before insert and `created` after.
   *
   * @param table - The Drizzle table definition
   * @param values - The values to insert
   * @returns The inserted record (from `.returning()`)
   */
  insert<TTable extends Table<TableConfig>>(
    table: TTable,
    values: TTable['$inferInsert'],
  ): Promise<TTable['$inferSelect']>;

  /**
   * Update a record by ID with observer lifecycle hooks.
   * Calls `updating` before update and `updated` after.
   *
   * @param table - The Drizzle table definition
   * @param id - The record ID
   * @param changes - The partial update data
   * @returns The updated record, or null if not found
   */
  update<TTable extends Table<TableConfig>>(
    table: TTable,
    id: string,
    changes: Partial<TTable['$inferInsert']>,
  ): Promise<TTable['$inferSelect'] | null>;

  /**
   * Delete a record by ID with observer lifecycle hooks.
   * Calls `deleting` before delete and `deleted` after.
   *
   * @param table - The Drizzle table definition
   * @param id - The record ID
   */
  delete(table: Table<TableConfig>, id: string): Promise<void>;
};

/**
 * Create an observed database wrapper that fires lifecycle hooks
 * around insert/update/delete operations.
 *
 * @param db - The CruzDatabase (Drizzle) instance
 * @param registry - The ObserverRegistry containing registered observers
 * @returns An object with insert/update/delete helpers that trigger observer hooks
 */
export function withObservers(db: CruzDatabase, registry: ObserverRegistry): ObservedDb {
  return {
    async insert<TTable extends Table<TableConfig>>(
      table: TTable,
      values: TTable['$inferInsert'],
    ): Promise<TTable['$inferSelect']> {
      const tableName = getTableName(table);
      const observers = registry.getObservers(tableName);

      for (const obs of observers) {
        await obs.creating?.(values);
      }

      const [result] = await db.insert(table).values(values).returning();

      for (const obs of observers) {
        await obs.created?.(result);
      }

      return result as TTable['$inferSelect'];
    },

    async update<TTable extends Table<TableConfig>>(
      table: TTable,
      id: string,
      changes: Partial<TTable['$inferInsert']>,
    ): Promise<TTable['$inferSelect'] | null> {
      const tableName = getTableName(table);
      const observers = registry.getObservers(tableName);

      for (const obs of observers) {
        await obs.updating?.(id, changes);
      }

      const idCol = getIdColumn(table);
      const [result] = await db
        .update(table)
        .set(changes as TTable['$inferInsert'])
        .where(eq(idCol, id))
        .returning();

      if (result) {
        for (const obs of observers) {
          await obs.updated?.(result);
        }
      }

      return (result as TTable['$inferSelect']) ?? null;
    },

    async delete(table: Table<TableConfig>, id: string): Promise<void> {
      const tableName = getTableName(table);
      const observers = registry.getObservers(tableName);

      for (const obs of observers) {
        await obs.deleting?.(id);
      }

      const idCol = getIdColumn(table);
      await db
        .delete(table)
        .where(eq(idCol, id));

      for (const obs of observers) {
        await obs.deleted?.(id);
      }
    },
  };
}
