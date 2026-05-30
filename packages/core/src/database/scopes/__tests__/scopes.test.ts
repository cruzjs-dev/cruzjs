import { describe, it, expect } from 'vitest';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createTestDb } from '../../../testing/test-db';
import { defineScope, applyScopes } from '../define-scope';
import { softNotDeleted, byUser } from '../common-scopes';

const postsTable = sqliteTable('posts', {
  id: text('id').primaryKey(),
  authorId: text('authorId').notNull(),
  status: text('status').notNull().default('draft'),
  deletedAt: text('deletedAt'),
});

const migrations = [
  `CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, authorId TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', deletedAt TEXT)`,
];

const schema = { postsTable };

describe('defineScope + applyScopes', () => {
  it('filters rows matching the scope condition', async () => {
    const db = createTestDb(schema, { migrations });
    await db.insert(postsTable).values([
      { id: 'p1', authorId: 'u1', status: 'published' },
      { id: 'p2', authorId: 'u1', status: 'draft' },
      { id: 'p3', authorId: 'u2', status: 'published' },
    ]);

    const publishedScope = defineScope(postsTable, (t) => {
      const { eq } = require('drizzle-orm');
      return eq(t.status, 'published');
    });

    const query = db.select().from(postsTable);
    const results = await applyScopes(query, publishedScope);
    expect(results).toHaveLength(2);
  });

  it('composes multiple scopes with AND', async () => {
    const db = createTestDb(schema, { migrations });
    await db.insert(postsTable).values([
      { id: 'p1', authorId: 'u1', status: 'published' },
      { id: 'p2', authorId: 'u2', status: 'published' },
      { id: 'p3', authorId: 'u1', status: 'draft' },
    ]);

    const query = db.select().from(postsTable);
    const results = await applyScopes(
      query,
      byUser(postsTable.authorId, 'u1'),
      defineScope(postsTable, (t) => {
        const { eq } = require('drizzle-orm');
        return eq(t.status, 'published');
      }),
    );
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('p1');
  });

  it('softNotDeleted filters out rows with deletedAt set', async () => {
    const db = createTestDb(schema, { migrations });
    await db.insert(postsTable).values([
      { id: 'p1', authorId: 'u1', status: 'published', deletedAt: null },
      { id: 'p2', authorId: 'u1', status: 'published', deletedAt: '2026-01-01T00:00:00Z' },
    ]);

    const query = db.select().from(postsTable);
    const results = await applyScopes(query, softNotDeleted(postsTable.deletedAt));
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('p1');
  });
});
