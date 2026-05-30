/**
 * Soft Delete Columns
 *
 * Mixin function to add soft delete columns to any Drizzle table.
 *
 * @example
 * ```typescript
 * import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
 * import { softDeleteColumns } from '@cruzjs/core';
 *
 * export const myItems = sqliteTable('MyItems', {
 *   id: text('id').primaryKey(),
 *   name: text('name').notNull(),
 *   ...softDeleteColumns(),
 * });
 * ```
 */

import { integer } from 'drizzle-orm/sqlite-core';

export function softDeleteColumns() {
  return {
    deletedAt: integer('deleted_at', { mode: 'timestamp' as const }),
  };
}
