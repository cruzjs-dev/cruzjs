import type { SQL, Table, TableConfig } from 'drizzle-orm';
import { and } from 'drizzle-orm';
import type { CruzFromBuilder } from '../../shared/database/cruz-database';

/** A reusable, composable query filter. */
export interface Scope {
  /** Returns the SQL condition for this scope, or undefined if the scope is inactive. */
  apply(): SQL | undefined;
}

/**
 * Define a named, reusable query scope.
 *
 * @param table - The Drizzle table the scope operates on
 * @param fn - Function that receives the table and returns a SQL condition
 *
 * @example
 * const active = defineScope(users, (t) => eq(t.status, 'active'));
 * const verified = defineScope(users, (t) => isNotNull(t.verifiedAt));
 * const results = await applyScopes(db.select().from(users), active, verified);
 */
export function defineScope<TTable extends Table<TableConfig>>(
  table: TTable,
  fn: (table: TTable) => SQL | undefined,
): Scope {
  return { apply: () => fn(table) };
}

/**
 * Apply one or more scopes to a query, ANDing all conditions together.
 *
 * @param query - The base Drizzle query builder
 * @param scopes - One or more scopes to apply
 */
export function applyScopes<TResult>(
  query: CruzFromBuilder<TResult>,
  ...scopes: Scope[]
): CruzFromBuilder<TResult> {
  const conditions = scopes.map((s) => s.apply()).filter((c): c is SQL => c !== undefined);
  if (conditions.length === 0) return query;
  return query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
}
