import { eq, inArray } from 'drizzle-orm';
import type { Table, TableConfig, Column } from 'drizzle-orm';
import type { CruzDatabase } from '../../shared/database/cruz-database';

/** Relation helper for loading child records belonging to a parent. */
export interface HasManyRelation<TChild extends Table<TableConfig>> {
  /** Load all children for a single parent ID. */
  for(parentId: string): Promise<TChild['$inferSelect'][]>;
  /** Load all children for multiple parent IDs, grouped into a Map keyed by parent ID. */
  forMany(parentIds: string[]): Promise<Map<string, TChild['$inferSelect'][]>>;
}

/**
 * Define a has-many relation between two tables.
 *
 * @param db - Drizzle database instance
 * @param _parent - Parent table (for type inference only)
 * @param child - Child table to query
 * @param foreignKey - Column on the child table that references the parent ID
 *
 * @example
 * const userTasks = hasMany(db, users, tasks, tasks.userId);
 * const myTasks = await userTasks.for(userId);
 */
export function hasMany<
  TParent extends Table<TableConfig>,
  TChild extends Table<TableConfig>,
>(
  db: CruzDatabase,
  _parent: TParent,
  child: TChild,
  foreignKey: Column,
): HasManyRelation<TChild> {
  return {
    async for(parentId: string) {
      return db.select().from(child).where(eq(foreignKey, parentId)) as unknown as Promise<TChild['$inferSelect'][]>;
    },

    async forMany(parentIds: string[]) {
      if (parentIds.length === 0) return new Map();
      const rows = (await db.select().from(child).where(inArray(foreignKey, parentIds))) as TChild['$inferSelect'][];
      const map = new Map<string, TChild['$inferSelect'][]>();
      for (const parentId of parentIds) map.set(parentId, []);
      for (const row of rows) {
        const fkValue = (row as Record<string, unknown>)[foreignKey.name as string] as string;
        map.get(fkValue)?.push(row);
      }
      return map;
    },
  };
}
