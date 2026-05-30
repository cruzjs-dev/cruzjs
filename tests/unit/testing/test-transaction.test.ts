import { describe, it, expect } from 'vitest';
import { createTestDb, withTestTransaction, useTestTransaction } from '@cruzjs/core/testing';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql, eq } from 'drizzle-orm';

const testUsers = sqliteTable('test_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
});

const schema = { testUsers };

function makeDb() {
  return createTestDb(schema, {
    migrations: [
      'CREATE TABLE IF NOT EXISTS test_users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE)',
    ],
  });
}

describe('withTestTransaction', () => {
  it('rolls back after fn completes', async () => {
    const db = makeDb();

    await withTestTransaction(db, async (tx) => {
      await tx.insert(testUsers).values({ email: 'a@example.com' });
      const rows = await tx.select().from(testUsers);
      expect(rows).toHaveLength(1);
    });

    const after = await db.select().from(testUsers);
    expect(after).toHaveLength(0);
  });

  it('rolls back on error too', async () => {
    const db = makeDb();

    await expect(
      withTestTransaction(db, async (tx) => {
        await tx.insert(testUsers).values({ email: 'b@example.com' });
        throw new Error('intentional error');
      })
    ).rejects.toThrow('intentional error');

    const after = await db.select().from(testUsers);
    expect(after).toHaveLength(0);
  });

  it('returns the fn result', async () => {
    const db = makeDb();
    const result = await withTestTransaction(db, async () => 42);
    expect(result).toBe(42);
  });
});

describe('useTestTransaction', () => {
  const db = makeDb();
  useTestTransaction(() => db);

  it('test 1: inserts a row with unique email', async () => {
    await db.insert(testUsers).values({ email: 'shared@example.com' });
    const rows = await db.select().from(testUsers);
    expect(rows).toHaveLength(1);
  });

  it('test 2: same unique email succeeds (prior test rolled back)', async () => {
    await db.insert(testUsers).values({ email: 'shared@example.com' });
    const rows = await db.select().from(testUsers);
    expect(rows).toHaveLength(1);
  });
});
