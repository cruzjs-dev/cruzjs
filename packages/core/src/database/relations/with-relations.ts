import type { HasManyRelation } from './has-many';
import type { BelongsToRelation } from './belongs-to';
import type { ManyToManyRelation } from './many-to-many';
import type { Table, TableConfig } from 'drizzle-orm';

type AnyRelation =
  | HasManyRelation<Table<TableConfig>>
  | BelongsToRelation<Table<TableConfig>>
  | ManyToManyRelation<Table<TableConfig>>;

type RelationMap = Record<string, AnyRelation>;

type ResolvedRelation<R> =
  R extends HasManyRelation<infer T> ? T['$inferSelect'][] :
  R extends BelongsToRelation<infer T> ? T['$inferSelect'] | null :
  R extends ManyToManyRelation<infer T> ? T['$inferSelect'][] :
  never;

type WithRelationsResult<TRow, TRels extends RelationMap> = TRow & {
  [K in keyof TRels]: ResolvedRelation<TRels[K]>;
};

export async function withRelations<TRow extends Record<string, unknown>, TRels extends RelationMap>(
  rows: TRow[],
  relations: TRels,
): Promise<WithRelationsResult<TRow, TRels>[]> {
  if (rows.length === 0) return [];

  const sourceIds = rows.map((r) => r['id'] as string);

  const resolved: Record<string, unknown> = {};
  for (const [key, rel] of Object.entries(relations)) {
    if ('forMany' in rel) {
      resolved[key] = await rel.forMany(sourceIds);
    }
  }

  return rows.map((row) => {
    const extra: Record<string, unknown> = {};
    for (const [key, rel] of Object.entries(relations)) {
      const map = resolved[key] as Map<string, unknown>;
      const val = map.get(row['id'] as string);
      // hasMany/manyToMany default to []; belongsTo defaults to null
      extra[key] = val !== undefined ? val : null;
    }
    return { ...row, ...extra } as WithRelationsResult<TRow, TRels>;
  });
}
