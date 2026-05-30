import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
// Namespace imports from node: builtins. Named imports (e.g. `{ existsSync }`)
// break the client build because vite stubs `fs`/`path` with an empty
// browser-external that has no named exports. Namespace access defers to
// runtime, which only happens server-side (this module is dynamically imported
// by drizzle.service for local dev and never executes in the browser).
import * as fs from 'node:fs';
import * as nodePath from 'node:path';

const existsSync = fs.existsSync;
const mkdirSync = fs.mkdirSync;
const readFileSync = fs.readFileSync;
const readdirSync = fs.readdirSync;
const dirname = nodePath.dirname;
const join = nodePath.join;

/**
 * Manages local SQLite database for Cloudflare-free development.
 *
 * Provides database creation, migration, and schema push utilities
 * using better-sqlite3 directly instead of wrangler's D1 simulation.
 */
export class LocalDb {
  /**
   * Check if we're running in a local development environment
   * (i.e., no Cloudflare D1 binding available)
   */
  static get isLocalDevEnvironment(): boolean {
    return process.env.LOCAL_DEV === 'true';
  }

  /**
   * Create a local SQLite database using better-sqlite3
   *
   * @param dbPath - Path to the SQLite database file
   * @param schema - Drizzle schema object for type inference
   * @returns Drizzle database instance
   */
  static create<TSchema extends Record<string, unknown>>(
    dbPath: string,
    schema: TSchema
  ): BetterSQLite3Database<TSchema> {
    const sqlite = LocalDb.openDatabase(dbPath);
    return drizzle(sqlite, { schema });
  }

  /**
   * Initialize the local SQLite database by running migrations.
   *
   * @param dbPath - Path to the SQLite database file
   * @param migrationsPath - Path to the migrations folder (optional)
   */
  static async init(
    dbPath: string,
    migrationsPath?: string
  ): Promise<void> {
    const sqlite = LocalDb.openDatabase(dbPath);

    if (migrationsPath && existsSync(migrationsPath)) {
      await LocalDb.runMigrations(sqlite, migrationsPath);
    }

    sqlite.close();

    console.log(`[Local DB] Database initialized at ${dbPath}`);
  }

  /**
   * Push schema directly to database (for development)
   *
   * This is a simpler alternative to migrations that directly
   * creates/updates tables based on the schema. Use this for
   * rapid development when you don't need migration history.
   *
   * Note: This requires the drizzle-kit CLI to be available.
   */
  static async pushSchema(dbPath: string): Promise<void> {
    const { execSync } = await import('child_process');

    console.log('[Local DB] Pushing schema to database...');

    try {
      execSync(`npx drizzle-kit push --dialect=sqlite --url=${dbPath}`, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      console.log('[Local DB] Schema pushed successfully');
    } catch (error) {
      console.error('[Local DB] Failed to push schema:', error);
      throw error;
    }
  }

  /**
   * Open a SQLite database with standard pragmas (WAL mode, foreign keys).
   */
  private static openDatabase(dbPath: string): Database.Database {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    return sqlite;
  }

  /**
   * Run SQL migrations from a folder.
   * Migrations are applied in alphabetical order.
   * Uses a simple migrations table to track applied migrations.
   */
  private static async runMigrations(
    sqlite: Database.Database,
    migrationsPath: string
  ): Promise<void> {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    `);

    const files = readdirSync(migrationsPath);
    const migrationFiles = files
      .filter((f) => f.endsWith('.sql'))
      .map((f) => join(migrationsPath, f));

    migrationFiles.sort();

    const applied = new Set(
      sqlite
        .prepare('SELECT hash FROM __drizzle_migrations')
        .all()
        .map((row: any) => row.hash)
    );

    for (const file of migrationFiles) {
      const hash = file.split('/').pop() || file;

      if (applied.has(hash)) {
        continue;
      }

      console.log(`[Local DB] Applying migration: ${hash}`);

      const sql = readFileSync(file, 'utf-8');

      sqlite.transaction(() => {
        sqlite.exec(sql);
        sqlite
          .prepare('INSERT INTO __drizzle_migrations (hash) VALUES (?)')
          .run(hash);
      })();
    }
  }
}
