import { eq, inArray } from 'drizzle-orm';
import type { Table, TableConfig, Column } from 'drizzle-orm';
import type { CruzDatabase } from '../../shared/database/cruz-database';

export interface BelongsToRelation<TParent extends Table<TableConfig>> {
  for(foreignKeyValue: string): Promise<TParent['$inferSelect'] | null>;
  forMany(foreignKeyValues: string[]): Promise<Map<string, TParent['$inferSelect'] | null>>;
}

export function belongsTo<
  _TChild extends Table<TableConfig>,
  TParent extends Table<TableConfig>,
>(
  db: CruzDatabase,
  _child: _TChild,
  parent: TParent,
  foreignKey: Column,
): BelongsToRelation<TParent> {
  // Determine the primary key column name (assumes 'id' as convention)
  const parentPkName = 'id';

  return {
    async for(foreignKeyValue: string) {
      const rows = (await db
        .select()
        .from(parent)
        .where(eq((parent as unknown as Record<string, Column>)[parentPkName], foreignKeyValue))
        .limit(1)) as TParent['$inferSelect'][];
      return rows[0] ?? null;
    },

    async forMany(foreignKeyValues: string[]) {
      if (foreignKeyValues.length === 0) return new Map();
      const unique = [...new Set(foreignKeyValues)];
      const rows = (await db
        .select()
        .from(parent)
        .where(inArray((parent as unknown as Record<string, Column>)[parentPkName], unique))) as TParent['$inferSelect'][];

      const byId = new Map<string, TParent['$inferSelect']>();
      for (const row of rows) {
        byId.set((row as Record<string, unknown>)[parentPkName] as string, row);
      }

      const result = new Map<string, TParent['$inferSelect'] | null>();
      for (const fkValue of foreignKeyValues) {
        result.set(fkValue, byId.get(fkValue) ?? null);
      }
      return result;
    },
  };
}
