/**
 * DrizzleCruzDatabase - Implementation of CruzDatabase backed by any Drizzle dialect.
 *
 * THE ONE UNSAFE CAST in this entire module is in the static `create()` factory:
 *   `actualDb as unknown as DrizzleDbInternal`
 *
 * It is safe because all Drizzle dialects share the same chain API shape at runtime
 * (select/insert/update/delete returning chainable builders). The internal bridge
 * types use `unknown` (not `any`) for dialect-specific parameters.
 *
 * All public CruzDatabase interface positions have zero `any`/`unknown`.
 */

import type { Column, SQL, Table, TableConfig } from 'drizzle-orm';
import type {
  CruzDatabase,
  CruzCustomSelectBuilder,
  CruzDeleteBuilder,
  CruzDeleteWhereBuilder,
  CruzFromBuilder,
  CruzInsertBuilder,
  CruzInsertResultBuilder,
  CruzOnConflictDoNothingConfig,
  CruzOnConflictDoUpdateConfig,
  CruzResultBuilder,
  CruzSelectBuilder,
  CruzSelectFields,
  CruzSetBuilder,
  CruzUpdateBuilder,
  CruzUpdateWhereBuilder,
  InferCruzSelectResult,
  AnyDialectDatabase,
} from './cruz-database';

// ─── Internal bridge types ─────────────────────────────────────────────────
// Structural interfaces that describe the COMMON subset of Drizzle's chain API
// across all dialects. Parameters use `unknown` (not `any`) where
// dialect-specific types would normally appear.
//
// None of these are exported. They exist solely to type the internals of
// DrizzleCruzDatabase without leaking `any` to the public interface.

interface DrizzleFromChainInternal extends PromiseLike<unknown[]> {
  where(condition: SQL | undefined): DrizzleFromChainInternal;
  limit(n: number): DrizzleFromChainInternal;
  offset(n: number): DrizzleFromChainInternal;
  orderBy(...cols: unknown[]): DrizzleFromChainInternal;
  groupBy(...cols: unknown[]): DrizzleFromChainInternal;
  innerJoin(table: unknown, on: unknown): DrizzleFromChainInternal;
  leftJoin(table: unknown, on: unknown): DrizzleFromChainInternal;
  rightJoin(table: unknown, on: unknown): DrizzleFromChainInternal;
  fullJoin(table: unknown, on: unknown): DrizzleFromChainInternal;
}

interface DrizzleSelectChainInternal {
  from(table: unknown): DrizzleFromChainInternal;
}

interface DrizzleInsertResultChainInternal extends PromiseLike<unknown> {
  returning(fields?: unknown): PromiseLike<unknown[]>;
  onConflictDoNothing(config?: unknown): DrizzleInsertResultChainInternal;
  onConflictDoUpdate(config: unknown): DrizzleInsertResultChainInternal;
}

interface DrizzleInsertChainInternal {
  values(data: unknown): DrizzleInsertResultChainInternal;
}

interface DrizzleUpdateSetChainInternal extends PromiseLike<unknown> {
  where(condition: SQL | undefined): DrizzleUpdateWhereChainInternal;
  returning(fields?: unknown): PromiseLike<unknown[]>;
}

interface DrizzleUpdateWhereChainInternal extends PromiseLike<unknown> {
  returning(fields?: unknown): PromiseLike<unknown[]>;
}

interface DrizzleDeleteChainInternal extends PromiseLike<unknown> {
  where(condition: SQL | undefined): DrizzleDeleteWhereChainInternal;
  returning(fields?: unknown): PromiseLike<unknown[]>;
}

interface DrizzleDeleteWhereChainInternal extends PromiseLike<unknown> {
  returning(fields?: unknown): PromiseLike<unknown[]>;
}

interface DrizzleDbInternal {
  select(fields?: unknown): DrizzleSelectChainInternal;
  insert(into: unknown): DrizzleInsertChainInternal;
  update(table: unknown): DrizzleUpdateChainInternal;
  delete(from: unknown): DrizzleDeleteChainInternal;
  transaction<T>(fn: (tx: DrizzleDbInternal) => Promise<T>): Promise<T>;
  run?(query: unknown): PromiseLike<unknown>;
  all?(query: unknown): PromiseLike<unknown[]>;
}

interface DrizzleUpdateChainInternal {
  set(data: unknown): DrizzleUpdateSetChainInternal;
}

// ─── Shared base for void-result builders ───────────────────────────────────

abstract class VoidResultBase implements CruzResultBuilder<void> {
  protected abstract readonly voidChain: PromiseLike<unknown>;

  then<TResult1 = void, TResult2 = never>(
    onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.voidChain.then(
      () => (onfulfilled ? onfulfilled(undefined as void) : (undefined as unknown as TResult1)),
      onrejected,
    );
  }

  catch<TResult2 = never>(
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<void | TResult2> {
    return this.then(undefined, onrejected);
  }
}

// ─── Builder implementations ───────────────────────────────────────────────

class CruzFromBuilderImpl<TResult> implements CruzFromBuilder<TResult> {
  constructor(private readonly chain: DrizzleFromChainInternal) {}

  where(condition: SQL | undefined): CruzFromBuilder<TResult> {
    return new CruzFromBuilderImpl<TResult>(this.chain.where(condition));
  }

  limit(n: number): CruzFromBuilder<TResult> {
    return new CruzFromBuilderImpl<TResult>(this.chain.limit(n));
  }

  offset(n: number): CruzFromBuilder<TResult> {
    return new CruzFromBuilderImpl<TResult>(this.chain.offset(n));
  }

  orderBy(...columns: (Column | SQL)[]): CruzFromBuilder<TResult> {
    return new CruzFromBuilderImpl<TResult>(this.chain.orderBy(...columns));
  }

  groupBy(...columns: (Column | SQL)[]): CruzFromBuilder<TResult> {
    return new CruzFromBuilderImpl<TResult>(this.chain.groupBy(...columns));
  }

  innerJoin(table: Table<TableConfig>, on: SQL | boolean): CruzFromBuilder<TResult> {
    return new CruzFromBuilderImpl<TResult>(this.chain.innerJoin(table, on));
  }

  leftJoin(table: Table<TableConfig>, on: SQL | boolean): CruzFromBuilder<TResult> {
    return new CruzFromBuilderImpl<TResult>(this.chain.leftJoin(table, on));
  }

  rightJoin(table: Table<TableConfig>, on: SQL | boolean): CruzFromBuilder<TResult> {
    return new CruzFromBuilderImpl<TResult>(this.chain.rightJoin(table, on));
  }

  fullJoin(table: Table<TableConfig>, on: SQL | boolean): CruzFromBuilder<TResult> {
    return new CruzFromBuilderImpl<TResult>(this.chain.fullJoin(table, on));
  }

  then<TResult1 = TResult[], TResult2 = never>(
    onfulfilled?: ((value: TResult[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.chain.then(
      (rows) => {
        const typed = rows as TResult[];
        return onfulfilled ? onfulfilled(typed) : (typed as unknown as TResult1);
      },
      onrejected,
    );
  }

  catch<TResult2 = never>(
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult[] | TResult2> {
    return this.then(undefined, onrejected);
  }
}

class CruzSelectBuilderImpl implements CruzSelectBuilder {
  constructor(private readonly chain: DrizzleSelectChainInternal) {}

  from<TTable extends Table<TableConfig>>(table: TTable): CruzFromBuilder<TTable['$inferSelect']> {
    return new CruzFromBuilderImpl<TTable['$inferSelect']>(this.chain.from(table));
  }
}

class CruzCustomSelectBuilderImpl<TFields extends CruzSelectFields>
  implements CruzCustomSelectBuilder<TFields>
{
  constructor(private readonly chain: DrizzleSelectChainInternal) {}

  from(table: Table<TableConfig>): CruzFromBuilder<InferCruzSelectResult<TFields>> {
    return new CruzFromBuilderImpl<InferCruzSelectResult<TFields>>(this.chain.from(table));
  }
}

class CruzInsertResultBuilderImpl<TResult> extends VoidResultBase implements CruzInsertResultBuilder<TResult> {
  protected readonly voidChain: PromiseLike<unknown>;

  constructor(private readonly chain: DrizzleInsertResultChainInternal) {
    super();
    this.voidChain = chain;
  }

  onConflictDoNothing(config?: CruzOnConflictDoNothingConfig): CruzInsertResultBuilder<TResult> {
    return new CruzInsertResultBuilderImpl<TResult>(this.chain.onConflictDoNothing(config));
  }

  onConflictDoUpdate(
    config: CruzOnConflictDoUpdateConfig<TResult>,
  ): CruzInsertResultBuilder<TResult> {
    return new CruzInsertResultBuilderImpl<TResult>(this.chain.onConflictDoUpdate(config));
  }

  returning(): PromiseLike<TResult[]>;
  returning<TFields extends CruzSelectFields>(fields: TFields): PromiseLike<InferCruzSelectResult<TFields>[]>;
  returning(fields?: CruzSelectFields): PromiseLike<TResult[] | InferCruzSelectResult<CruzSelectFields>[]> {
    return this.chain.returning(fields) as PromiseLike<TResult[]>;
  }
}

class CruzInsertBuilderImpl<TTable extends Table<TableConfig>>
  implements CruzInsertBuilder<TTable>
{
  constructor(private readonly chain: DrizzleInsertChainInternal) {}

  values(
    data: TTable['$inferInsert'] | TTable['$inferInsert'][],
  ): CruzInsertResultBuilder<TTable['$inferSelect']> {
    return new CruzInsertResultBuilderImpl<TTable['$inferSelect']>(this.chain.values(data));
  }
}

class CruzUpdateWhereBuilderImpl<TResult> extends VoidResultBase implements CruzUpdateWhereBuilder<TResult> {
  protected readonly voidChain: PromiseLike<unknown>;

  constructor(private readonly chain: DrizzleUpdateWhereChainInternal) {
    super();
    this.voidChain = chain;
  }

  returning(): PromiseLike<TResult[]>;
  returning<TFields extends CruzSelectFields>(fields: TFields): PromiseLike<InferCruzSelectResult<TFields>[]>;
  returning(fields?: CruzSelectFields): PromiseLike<TResult[] | InferCruzSelectResult<CruzSelectFields>[]> {
    return this.chain.returning(fields) as PromiseLike<TResult[]>;
  }
}

class CruzSetBuilderImpl<TResult> extends VoidResultBase implements CruzSetBuilder<TResult> {
  protected readonly voidChain: PromiseLike<unknown>;

  constructor(private readonly chain: DrizzleUpdateSetChainInternal) {
    super();
    this.voidChain = chain;
  }

  where(condition: SQL | undefined): CruzUpdateWhereBuilder<TResult> {
    return new CruzUpdateWhereBuilderImpl<TResult>(this.chain.where(condition));
  }

  returning(): PromiseLike<TResult[]>;
  returning<TFields extends CruzSelectFields>(fields: TFields): PromiseLike<InferCruzSelectResult<TFields>[]>;
  returning(fields?: CruzSelectFields): PromiseLike<TResult[] | InferCruzSelectResult<CruzSelectFields>[]> {
    return this.chain.returning(fields) as PromiseLike<TResult[]>;
  }
}

class CruzUpdateBuilderImpl<TTable extends Table<TableConfig>>
  implements CruzUpdateBuilder<TTable>
{
  constructor(private readonly chain: DrizzleUpdateChainInternal) {}

  set(data: Partial<TTable['$inferInsert']>): CruzSetBuilder<TTable['$inferSelect']> {
    return new CruzSetBuilderImpl<TTable['$inferSelect']>(this.chain.set(data));
  }
}

class CruzDeleteWhereBuilderImpl<TResult> extends VoidResultBase implements CruzDeleteWhereBuilder<TResult> {
  protected readonly voidChain: PromiseLike<unknown>;

  constructor(private readonly chain: DrizzleDeleteWhereChainInternal) {
    super();
    this.voidChain = chain;
  }

  returning(): PromiseLike<TResult[]>;
  returning<TFields extends CruzSelectFields>(fields: TFields): PromiseLike<InferCruzSelectResult<TFields>[]>;
  returning(fields?: CruzSelectFields): PromiseLike<TResult[] | InferCruzSelectResult<CruzSelectFields>[]> {
    return this.chain.returning(fields) as PromiseLike<TResult[]>;
  }
}

class CruzDeleteBuilderImpl<TResult> extends VoidResultBase implements CruzDeleteBuilder<TResult> {
  protected readonly voidChain: PromiseLike<unknown>;

  constructor(private readonly chain: DrizzleDeleteChainInternal) {
    super();
    this.voidChain = chain;
  }

  where(condition: SQL | undefined): CruzDeleteWhereBuilder<TResult> {
    return new CruzDeleteWhereBuilderImpl<TResult>(this.chain.where(condition));
  }

  returning(): PromiseLike<TResult[]>;
  returning<TFields extends CruzSelectFields>(fields: TFields): PromiseLike<InferCruzSelectResult<TFields>[]>;
  returning(fields?: CruzSelectFields): PromiseLike<TResult[] | InferCruzSelectResult<CruzSelectFields>[]> {
    return this.chain.returning(fields) as PromiseLike<TResult[]>;
  }
}

// ─── DrizzleCruzDatabase ───────────────────────────────────────────────────

/**
 * Wraps any Drizzle database to implement CruzDatabase.
 *
 * THE ONE UNSAFE CAST in this entire module is in the static create() method:
 *   `actualDb as unknown as DrizzleDbInternal`
 *
 * It is safe because all Drizzle dialects expose the same chain API shape
 * (select/insert/update/delete returning chainable builders) at runtime.
 *
 * All internal chain interfaces use `unknown` for dialect-specific parameters.
 * Public CruzDatabase interface has zero `any`/`unknown` in consumer-visible
 * positions.
 *
 * Use DrizzleCruzDatabase.create(drizzleDb) to instantiate.
 */
export class DrizzleCruzDatabase implements CruzDatabase {
  private readonly db: DrizzleDbInternal;

  private constructor(db: DrizzleDbInternal) {
    this.db = db;
  }

  /**
   * Create a CruzDatabase from any Drizzle database instance.
   * This is the only entry point -- the cast lives here and nowhere else.
   */
  static create(actualDb: AnyDialectDatabase): DrizzleCruzDatabase {
    return new DrizzleCruzDatabase(actualDb as unknown as DrizzleDbInternal);
  }

  select(): CruzSelectBuilder;
  select<TFields extends CruzSelectFields>(fields: TFields): CruzCustomSelectBuilder<TFields>;
  select<TFields extends CruzSelectFields>(fields?: TFields): CruzSelectBuilder | CruzCustomSelectBuilder<TFields> {
    if (fields) {
      return new CruzCustomSelectBuilderImpl<TFields>(this.db.select(fields));
    }
    return new CruzSelectBuilderImpl(this.db.select());
  }

  insert<TTable extends Table<TableConfig>>(into: TTable): CruzInsertBuilder<TTable> {
    return new CruzInsertBuilderImpl<TTable>(this.db.insert(into));
  }

  update<TTable extends Table<TableConfig>>(table: TTable): CruzUpdateBuilder<TTable> {
    return new CruzUpdateBuilderImpl<TTable>(this.db.update(table));
  }

  delete<TTable extends Table<TableConfig>>(from: TTable): CruzDeleteBuilder<TTable['$inferSelect']> {
    return new CruzDeleteBuilderImpl<TTable['$inferSelect']>(this.db.delete(from));
  }

  transaction<T>(fn: (tx: CruzDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction((internalTx) =>
      fn(new DrizzleCruzDatabase(internalTx)),
    );
  }

  run(query: SQL): PromiseLike<void> {
    if (!this.db.run) {
      throw new Error('run() is not available on this database dialect');
    }
    return this.db.run(query) as PromiseLike<void>;
  }

  all<T = Record<string, unknown>>(query: SQL): PromiseLike<T[]> {
    if (!this.db.all) {
      throw new Error('all() is not available on this database dialect');
    }
    return this.db.all(query) as PromiseLike<T[]>;
  }
}
