import { eq, inArray } from 'drizzle-orm';
import type { Table, TableConfig, Column } from 'drizzle-orm';
import type { CruzDatabase } from '../../shared/database/cruz-database';

export interface ManyToManyRelation<TTarget extends Table<TableConfig>> {
  for(sourceId: string): Promise<TTarget['$inferSelect'][]>;
  forMany(sourceIds: string[]): Promise<Map<string, TTarget['$inferSelect'][]>>;
}

export function manyToMany<
  _TSource extends Table<TableConfig>,
  TPivot extends Table<TableConfig>,
  TTarget extends Table<TableConfig>,
>(
  db: CruzDatabase,
  _source: _TSource,
  pivot: TPivot,
  target: TTarget,
  sourceFk: Column,
  targetFk: Column,
): ManyToManyRelation<TTarget> {
  const targetPkName = 'id';

  return {
    async for(sourceId: string) {
      const pivotRows = (await db.select().from(pivot).where(eq(sourceFk, sourceId))) as TPivot['$inferSelect'][];
      if (pivotRows.length === 0) return [];
      const targetIds = pivotRows.map((r) => (r as Record<string, unknown>)[targetFk.name as string] as string);
      return db
        .select()
        .from(target)
        .where(inArray((target as unknown as Record<string, Column>)[targetPkName], targetIds)) as unknown as Promise<TTarget['$inferSelect'][]>;
    },

    async forMany(sourceIds: string[]) {
      if (sourceIds.length === 0) return new Map();
      const pivotRows = (await db.select().from(pivot).where(inArray(sourceFk, sourceIds))) as TPivot['$inferSelect'][];
      if (pivotRows.length === 0) {
        const empty = new Map<string, TTarget['$inferSelect'][]>();
        for (const id of sourceIds) empty.set(id, []);
        return empty;
      }

      const targetIds = [...new Set(pivotRows.map((r) => (r as Record<string, unknown>)[targetFk.name as string] as string))];
      const targetRows = (await db
        .select()
        .from(target)
        .where(inArray((target as unknown as Record<string, Column>)[targetPkName], targetIds))) as TTarget['$inferSelect'][];

      const targetById = new Map<string, TTarget['$inferSelect']>();
      for (const row of targetRows) {
        targetById.set((row as Record<string, unknown>)[targetPkName] as string, row);
      }

      const map = new Map<string, TTarget['$inferSelect'][]>();
      for (const id of sourceIds) map.set(id, []);
      for (const pivotRow of pivotRows) {
        const srcId = (pivotRow as Record<string, unknown>)[sourceFk.name as string] as string;
        const tgtId = (pivotRow as Record<string, unknown>)[targetFk.name as string] as string;
        const tgt = targetById.get(tgtId);
        if (tgt) map.get(srcId)?.push(tgt);
      }
      return map;
    },
  };
}
