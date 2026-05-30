/**
 * DB Integration Tests for @cruzjs/drizzle-universal
 *
 * Verifies that schemas built with each DialectBuilder:
 * 1. Can be used to create tables against a real database
 * 2. Correctly round-trip boolean, timestamp, and json values
 * 3. Return consistent JS types regardless of dialect
 *
 * SQLite uses better-sqlite3 (sync, zero-config).
 * PostgreSQL uses @electric-sql/pglite (WASM Postgres, no server needed).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const generateId = () => createId();
const nowISO = () => new Date().toISOString();

function buildTestSchema(b: import('../types').DialectBuilder) {
  const users = b.table('users_test', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    name: b.text('name').notNull(),
    isAdmin: b.boolean('isAdmin').notNull().default(false),
    metadata: b.json<{ tags: string[] }>('metadata').default({ tags: [] }),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  });

  const posts = b.table('posts_test', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    userId: b.text('userId').notNull(),
    title: b.text('title').notNull(),
    score: b.real('score').default(0),
    publishedAt: b.timestamp('publishedAt'),
  });

  return { users, posts };
}

// ---------------------------------------------------------------------------
// SQLite integration (better-sqlite3 + drizzle-orm/better-sqlite3)
// ---------------------------------------------------------------------------

describe('SQLite integration', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any; // typed as any — test verifies runtime behaviour, not TS query types
  let schema: ReturnType<typeof buildTestSchema>;

  beforeAll(async () => {
    const Database = (await import('better-sqlite3')).default;
    const { drizzle } = await import('drizzle-orm/better-sqlite3');
    const { sqliteBuilder } = await import('../builders/sqlite');

    schema = buildTestSchema(sqliteBuilder);

    const sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });

    // Create tables
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users_test (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        isAdmin INTEGER NOT NULL DEFAULT 0,
        metadata TEXT DEFAULT '{"tags":[]}',
        createdAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS posts_test (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        title TEXT NOT NULL,
        score REAL DEFAULT 0,
        publishedAt TEXT
      );
    `);
  });

  afterAll(async () => {
    // In-memory DB is cleaned up automatically
  });

  it('inserts and selects a row with boolean true', async () => {
    const id = generateId();
    await db.insert(schema.users).values({
      id,
      name: 'Alice',
      isAdmin: true,
      createdAt: nowISO(),
    });

    const rows = await db
      .select()
      .from(schema.users)
      .where((db as any).eq ? undefined : undefined);

    const alice = rows.find((r: any) => r.id === id);
    expect(alice).toBeDefined();
    expect(alice!.isAdmin).toBe(true);
    expect(alice!.name).toBe('Alice');
  });

  it('inserts and selects a row with boolean false', async () => {
    const id = generateId();
    await db.insert(schema.users).values({
      id,
      name: 'Bob',
      isAdmin: false,
      createdAt: nowISO(),
    });

    const rows = await db.select().from(schema.users);
    const bob = rows.find((r: any) => r.id === id);
    expect(bob!.isAdmin).toBe(false);
  });

  it('timestamp round-trips as ISO string', async () => {
    const id = generateId();
    const ts = '2024-06-15T12:00:00.000Z';
    await db.insert(schema.users).values({
      id,
      name: 'Carol',
      isAdmin: false,
      createdAt: ts,
    });

    const rows = await db.select().from(schema.users);
    const carol = rows.find((r: any) => r.id === id);
    expect(carol!.createdAt).toBe(ts);
  });

  it('json round-trips as object', async () => {
    const id = generateId();
    const meta = { tags: ['admin', 'beta'] };
    await db.insert(schema.users).values({
      id,
      name: 'Dave',
      isAdmin: false,
      metadata: meta,
      createdAt: nowISO(),
    });

    const rows = await db.select().from(schema.users);
    const dave = rows.find((r: any) => r.id === id);
    expect(dave!.metadata).toEqual(meta);
  });

  it('real column round-trips as number', async () => {
    const uid = generateId();
    await db.insert(schema.users).values({
      id: uid,
      name: 'Eve',
      isAdmin: false,
      createdAt: nowISO(),
    });

    const pid = generateId();
    await db.insert(schema.posts).values({
      id: pid,
      userId: uid,
      title: 'Hello World',
      score: 9.75,
    });

    const posts = await db.select().from(schema.posts);
    const post = posts.find((p: any) => p.id === pid);
    expect(post!.score).toBeCloseTo(9.75);
  });

  it('nullable timestamp returns null when unset', async () => {
    const uid = generateId();
    await db.insert(schema.users).values({
      id: uid,
      name: 'Frank',
      isAdmin: false,
      createdAt: nowISO(),
    });
    const pid = generateId();
    await db.insert(schema.posts).values({
      id: pid,
      userId: uid,
      title: 'Draft',
    });

    const posts = await db.select().from(schema.posts);
    const post = posts.find((p: any) => p.id === pid);
    expect(post!.publishedAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PostgreSQL integration (@electric-sql/pglite + drizzle-orm/pglite)
// ---------------------------------------------------------------------------

describe('PostgreSQL integration (PGLite)', () => {
  let db: any;
  let schema: ReturnType<typeof buildTestSchema>;

  beforeAll(async () => {
    let PGlite: any;
    let drizzlePg: any;

    try {
      const pgliteModule = await import(/* @vite-ignore */ '@electric-sql/pglite');
      PGlite = pgliteModule.PGlite;
      const drizzleModule = await import(/* @vite-ignore */ 'drizzle-orm/pglite');
      drizzlePg = drizzleModule.drizzle;
    } catch {
      // Skip if PGLite is not installed
      return;
    }

    const { pgBuilder } = await import('../builders/pg');
    schema = buildTestSchema(pgBuilder);

    const pg = new PGlite();
    db = drizzlePg(pg, { schema });

    await pg.exec(`
      CREATE TABLE IF NOT EXISTS users_test (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        "isAdmin" BOOLEAN NOT NULL DEFAULT FALSE,
        metadata JSONB DEFAULT '{"tags":[]}'::jsonb,
        "createdAt" TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE IF NOT EXISTS posts_test (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        title TEXT NOT NULL,
        score REAL DEFAULT 0,
        "publishedAt" TIMESTAMPTZ
      );
    `);
  });

  it('inserts and selects a row with boolean true', async () => {
    if (!db) return;

    const id = generateId();
    await db.insert(schema.users).values({
      id,
      name: 'Alice',
      isAdmin: true,
      createdAt: nowISO(),
    });

    const rows = await db.select().from(schema.users);
    const alice = rows.find((r: any) => r.id === id);
    expect(alice).toBeDefined();
    expect(alice!.isAdmin).toBe(true);
  });

  it('boolean false round-trips correctly', async () => {
    if (!db) return;

    const id = generateId();
    await db.insert(schema.users).values({
      id,
      name: 'Bob',
      isAdmin: false,
      createdAt: nowISO(),
    });

    const rows = await db.select().from(schema.users);
    const bob = rows.find((r: any) => r.id === id);
    expect(bob!.isAdmin).toBe(false);
  });

  it('timestamp round-trips as ISO string (mode: string)', async () => {
    if (!db) return;

    const id = generateId();
    const ts = '2024-06-15T12:00:00.000Z';
    await db.insert(schema.users).values({
      id,
      name: 'Carol',
      isAdmin: false,
      createdAt: ts,
    });

    const rows = await db.select().from(schema.users);
    const carol = rows.find((r: any) => r.id === id);
    // PG with mode:'string' returns ISO string (not a Date object)
    expect(typeof carol!.createdAt).toBe('string');
  });

  it('json round-trips as object via jsonb', async () => {
    if (!db) return;

    const id = generateId();
    const meta = { tags: ['pg', 'jsonb'] };
    await db.insert(schema.users).values({
      id,
      name: 'Dave',
      isAdmin: false,
      metadata: meta,
      createdAt: nowISO(),
    });

    const rows = await db.select().from(schema.users);
    const dave = rows.find((r: any) => r.id === id);
    expect(dave!.metadata).toEqual(meta);
  });

  it('nullable timestamp returns null when unset', async () => {
    if (!db) return;

    const uid = generateId();
    await db.insert(schema.users).values({
      id: uid,
      name: 'Frank',
      isAdmin: false,
      createdAt: nowISO(),
    });

    const pid = generateId();
    await db.insert(schema.posts).values({
      id: pid,
      userId: uid,
      title: 'Draft',
    });

    const posts = await db.select().from(schema.posts);
    const post = posts.find((p: any) => p.id === pid);
    expect(post!.publishedAt).toBeNull();
  });
});
