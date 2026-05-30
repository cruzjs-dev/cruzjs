import { sql } from 'drizzle-orm';
import { beforeEach, afterEach } from 'vitest';
import type { CruzDatabase } from '../shared/database/cruz-database';

const SAVEPOINT = 'cruz_test_tx';

/**
 * Run `fn` with `db`, then always roll back — leaving the database clean.
 * Use this in a single test when you want to inspect intermediate state.
 */
export async function withTestTransaction<T>(
  db: CruzDatabase,
  fn: (db: CruzDatabase) => Promise<T>
): Promise<T> {
  await db.run(sql.raw(`SAVEPOINT ${SAVEPOINT}`));
  try {
    return await fn(db);
  } finally {
    await db.run(sql.raw(`ROLLBACK TO SAVEPOINT ${SAVEPOINT}`));
    await db.run(sql.raw(`RELEASE SAVEPOINT ${SAVEPOINT}`));
  }
}

/**
 * Vitest helper — wraps each test in a savepoint that rolls back after.
 * Call once at the top of a describe block. Each `it` starts clean.
 *
 * @example
 * ```typescript
 * const db = createTestDb(schema, { migrations });
 * useTestTransaction(() => db);
 *
 * it('inserts a user', async () => {
 *   await db.insert(schema.users).values({ email: 'a@b.com' });
 *   // rolled back after this test
 * });
 * ```
 */
export function useTestTransaction(getDb: () => CruzDatabase): void {
  beforeEach(async () => {
    await getDb().run(sql.raw(`SAVEPOINT ${SAVEPOINT}`));
  });

  afterEach(async () => {
    await getDb().run(sql.raw(`ROLLBACK TO SAVEPOINT ${SAVEPOINT}`));
    await getDb().run(sql.raw(`RELEASE SAVEPOINT ${SAVEPOINT}`));
  });
}
