import { describe, it, expect, beforeEach } from 'vitest';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createTestDb } from '../../../testing/test-db';
import { hasMany } from '../has-many';
import { belongsTo } from '../belongs-to';
import { manyToMany } from '../many-to-many';
import { withRelations } from '../with-relations';

const usersTable = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

const postsTable = sqliteTable('posts', {
  id: text('id').primaryKey(),
  authorId: text('authorId').notNull(),
  title: text('title').notNull(),
});

const tagsTable = sqliteTable('tags', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
});

const postTagsTable = sqliteTable('post_tags', {
  id: text('id').primaryKey(),
  postId: text('postId').notNull(),
  tagId: text('tagId').notNull(),
});

const migrations = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, authorId TEXT NOT NULL, title TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, label TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS post_tags (id TEXT PRIMARY KEY, postId TEXT NOT NULL, tagId TEXT NOT NULL)`,
];

const schema = { usersTable, postsTable, tagsTable, postTagsTable };

describe('hasMany', () => {
  it('returns all children for a single parent', async () => {
    const db = createTestDb(schema, { migrations });
    await db.insert(usersTable).values({ id: 'u1', name: 'Alice' });
    await db.insert(postsTable).values([
      { id: 'p1', authorId: 'u1', title: 'Post 1' },
      { id: 'p2', authorId: 'u1', title: 'Post 2' },
      { id: 'p3', authorId: 'u1', title: 'Post 3' },
    ]);

    const posts = await hasMany(db, usersTable, postsTable, postsTable.authorId).for('u1');
    expect(posts).toHaveLength(3);
  });

  it('forMany returns map keyed by parent id', async () => {
    const db = createTestDb(schema, { migrations });
    await db.insert(usersTable).values([{ id: 'u1', name: 'Alice' }, { id: 'u2', name: 'Bob' }]);
    await db.insert(postsTable).values([
      { id: 'p1', authorId: 'u1', title: 'A' },
      { id: 'p2', authorId: 'u2', title: 'B' },
      { id: 'p3', authorId: 'u2', title: 'C' },
    ]);

    const map = await hasMany(db, usersTable, postsTable, postsTable.authorId).forMany(['u1', 'u2']);
    expect(map.get('u1')).toHaveLength(1);
    expect(map.get('u2')).toHaveLength(2);
  });
});

describe('belongsTo', () => {
  it('returns parent for a foreign key value', async () => {
    const db = createTestDb(schema, { migrations });
    await db.insert(usersTable).values({ id: 'u1', name: 'Alice' });
    await db.insert(postsTable).values({ id: 'p1', authorId: 'u1', title: 'P' });

    const user = await belongsTo(db, postsTable, usersTable, postsTable.authorId).for('u1');
    expect(user?.name).toBe('Alice');
  });

  it('returns null for missing parent', async () => {
    const db = createTestDb(schema, { migrations });
    const user = await belongsTo(db, postsTable, usersTable, postsTable.authorId).for('nonexistent');
    expect(user).toBeNull();
  });
});

describe('manyToMany', () => {
  it('returns targets via pivot table', async () => {
    const db = createTestDb(schema, { migrations });
    await db.insert(postsTable).values({ id: 'p1', authorId: 'u1', title: 'P' });
    await db.insert(tagsTable).values([{ id: 't1', label: 'ts' }, { id: 't2', label: 'react' }]);
    await db.insert(postTagsTable).values([
      { id: 'pt1', postId: 'p1', tagId: 't1' },
      { id: 'pt2', postId: 'p1', tagId: 't2' },
    ]);

    const tags = await manyToMany(db, postsTable, postTagsTable, tagsTable, postTagsTable.postId, postTagsTable.tagId).for('p1');
    expect(tags).toHaveLength(2);
  });
});

describe('withRelations', () => {
  it('attaches relations to each row', async () => {
    const db = createTestDb(schema, { migrations });
    await db.insert(usersTable).values({ id: 'u1', name: 'Alice' });
    await db.insert(postsTable).values([
      { id: 'p1', authorId: 'u1', title: 'A' },
      { id: 'p2', authorId: 'u1', title: 'B' },
    ]);

    const users = await db.select().from(usersTable);
    const result = await withRelations(users as Record<string, unknown>[], {
      posts: hasMany(db, usersTable, postsTable, postsTable.authorId),
    });

    expect((result[0] as { posts: unknown[] }).posts).toHaveLength(2);
  });
});
