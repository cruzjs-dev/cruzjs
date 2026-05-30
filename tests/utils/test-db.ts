import * as schema from '@/database/schema';
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

export type TestDatabase = BetterSQLite3Database<typeof schema>;

let db: TestDatabase | null = null;
let sqliteDb: ReturnType<typeof Database> | null = null;

/**
 * Get test database client
 * Uses better-sqlite3 for local testing (same SQL dialect as D1)
 */
export function getTestDrizzleClient(): TestDatabase {
  if (db) {
    return db;
  }

  const testDbPath = process.env.TEST_DATABASE_PATH || ':memory:';

  sqliteDb = new Database(testDbPath);

  // Enable WAL mode for better performance
  sqliteDb.pragma('journal_mode = WAL');

  db = drizzleSqlite(sqliteDb, { schema });

  return db;
}

/**
 * Reset test database
 * Deletes all data from all tables. Silently skips tables that don't exist
 * (e.g. when running against an in-memory DB without migrations applied).
 */
export async function resetTestDatabase(): Promise<void> {
  const client = getTestDrizzleClient();

  const tables = [
    schema.auditLogs,
    schema.pipelineJobs,
    schema.contacts,
    schema.companies,
    schema.sources,
    schema.cohorts,
    schema.subscriptions,
    schema.orgMembers,
    schema.organizations,
    schema.jobs,
    schema.uploads,
    schema.emails,
    schema.sessions,
    schema.accounts,
    schema.authIdentity,
  ].filter(Boolean);

  for (const table of tables) {
    try {
      await client.delete(table as any);
    } catch {
      // Table may not exist in this DB instance — skip
    }
  }
}

/**
 * Seed test database with sample data
 */
export async function seedTestDatabase(): Promise<{
  user1: schema.AuthIdentity;
  user2: schema.AuthIdentity;
  org: schema.Organization;
}> {
  const client = getTestDrizzleClient();

  // Create test users
  const [user1] = await client
    .insert(schema.authIdentity)
    .values({
      email: 'test1@example.com',
      password: 'hashed-password-1',
      emailVerified: new Date().toISOString(),
    })
    .returning();

  const [user2] = await client
    .insert(schema.authIdentity)
    .values({
      email: 'test2@example.com',
      password: 'hashed-password-2',
      emailVerified: new Date().toISOString(),
    })
    .returning();

  // Create test organization
  const [org] = await client
    .insert(schema.organizations)
    .values({
      name: 'Test Organization',
      slug: 'test-org',
      ownerId: user1.id,
      settings: '{}',
    })
    .returning();

  // Add members
  await client.insert(schema.orgMembers).values({
    orgId: org.id,
    userId: user1.id,
    role: 'owner',
  });

  await client.insert(schema.orgMembers).values({
    orgId: org.id,
    userId: user2.id,
    role: 'member',
  });

  return { user1, user2, org };
}

/**
 * Close test database connection
 */
export async function closeTestDatabase(): Promise<void> {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    db = null;
  }
}

/**
 * Create a mock D1 database wrapper for testing Cloudflare Workers code
 * This wraps better-sqlite3 to match the D1 interface
 */
export function createMockD1Database(): D1Database {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');

  return {
    prepare(query: string) {
      const stmt = sqlite.prepare(query);
      return {
        bind(...values: unknown[]) {
          return {
            first<T = unknown>(colName?: string): Promise<T | null> {
              const row = stmt.get(...values) as Record<string, unknown> | undefined;
              if (!row) return Promise.resolve(null);
              if (colName) return Promise.resolve(row[colName] as T);
              return Promise.resolve(row as T);
            },
            run(): Promise<D1Result> {
              const info = stmt.run(...values);
              return Promise.resolve({
                success: true,
                meta: {
                  duration: 0,
                  changes: info.changes,
                  last_row_id: Number(info.lastInsertRowid),
                  rows_read: 0,
                  rows_written: info.changes,
                },
              });
            },
            all<T = unknown>(): Promise<D1Result<T>> {
              const rows = stmt.all(...values) as T[];
              return Promise.resolve({
                results: rows,
                success: true,
                meta: {
                  duration: 0,
                  changes: 0,
                  last_row_id: 0,
                  rows_read: rows.length,
                  rows_written: 0,
                },
              });
            },
            raw<T = unknown[]>(): Promise<T[]> {
              const rows = stmt.raw(...values) as T[];
              return Promise.resolve(rows);
            },
          };
        },
        first<T = unknown>(colName?: string): Promise<T | null> {
          return this.bind().first(colName);
        },
        run(): Promise<D1Result> {
          return this.bind().run();
        },
        all<T = unknown>(): Promise<D1Result<T>> {
          return this.bind().all();
        },
        raw<T = unknown[]>(): Promise<T[]> {
          return this.bind().raw();
        },
      } as D1PreparedStatement;
    },
    dump(): Promise<ArrayBuffer> {
      const buffer = sqlite.serialize();
      return Promise.resolve(buffer.buffer);
    },
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      return Promise.all(statements.map((stmt) => stmt.all<T>()));
    },
    exec(query: string): Promise<D1ExecResult> {
      const info = sqlite.exec(query);
      return Promise.resolve({
        count: 1,
        duration: 0,
      });
    },
  };
}

// D1 type definitions
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(): Promise<T[]>;
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    changes: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
}

interface D1ExecResult {
  count: number;
  duration: number;
}
