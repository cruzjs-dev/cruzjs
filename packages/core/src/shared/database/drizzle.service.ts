import { createToken } from '../../di';
import { drizzle } from 'drizzle-orm/d1';
import type { CruzDatabase, AnyDialectDatabase } from './cruz-database';
import { DrizzleCruzDatabase } from './drizzle-cruz-database';

// Re-export the new types for consumers
export type { CruzDatabase, CruzCustomSelectBuilder, AnyDialectDatabase } from './cruz-database';
export { DrizzleCruzDatabase } from './drizzle-cruz-database';

/**
 * Drizzle database type (backward-compatible alias).
 *
 * Now resolves to `CruzDatabase` -- the dialect-agnostic interface that wraps
 * any Drizzle database (D1, BetterSQLite3, PostgresJs, MySql2) without `any`
 * in public positions.
 *
 * Existing service code using `@Inject(DRIZZLE) private readonly db: DrizzleDatabase`
 * continues to compile and work identically.
 *
 * @deprecated Use `CruzDatabase` directly. This alias will be removed in a future version.
 */
export type DrizzleDatabase = CruzDatabase;

/**
 * Injection token for the database.
 * Resolves to a `CruzDatabase` instance at runtime.
 */
export const DRIZZLE = createToken<CruzDatabase>('DrizzleDatabase');

// Declare the globals for Cloudflare Workers
declare global {
  // eslint-disable-next-line no-var
  var __drizzleDb: CruzDatabase | null;
  // eslint-disable-next-line no-var
  var __d1Database: D1Database | null;
}

/**
 * Drizzle database service
 *
 * In Cloudflare Workers/Pages, the database is provided via environment bindings.
 * This service provides a way to set/get the database instance for use in services.
 *
 * Usage:
 * - In _worker.js: Create the drizzle instance from env.DB and set on globalThis.__drizzleDb
 * - Services can access it via DrizzleService.getDb() or DRIZZLE token
 */
export class DrizzleService {
  private static db: CruzDatabase | null = null;
  private static schema: Record<string, unknown> | null = null;

  /**
   * Set the schema for Drizzle (called by the application at startup)
   */
  static setSchema(schema: Record<string, unknown>): void {
    this.schema = schema;
  }

  /**
   * Get the schema
   */
  static getSchema(): Record<string, unknown> | null {
    return this.schema;
  }

  /**
   * Initialize the database from a Cloudflare D1 binding or local SQLite fallback.
   * Handles the full decision: D1 if available, otherwise local better-sqlite3.
   *
   * @param d1 - Cloudflare D1 binding (undefined in local dev)
   */
  static async initFromContext(d1?: D1Database): Promise<void> {
    if (d1) {
      this.setDb(DrizzleCruzDatabase.create(drizzle(d1)));
      return;
    }

    if (this.isInitialized()) return;

    const schema = this.schema;
    if (!schema) {
      throw new Error('Schema not set. Call DrizzleService.setSchema() before initFromContext().');
    }

    const { LocalDb } = await import('./local-db');
    const dbPath = process.env.LOCAL_DB_PATH || './data/local.db';
    console.log(`[Local Dev] Initializing SQLite database at ${dbPath}`);

    const db = LocalDb.create(dbPath, schema);
    this.setDb(DrizzleCruzDatabase.create(db as AnyDialectDatabase));

    console.log('[Local Dev] Database initialized successfully');
  }

  /**
   * Set the active database instance.
   * For raw Drizzle databases, wrap them first: `DrizzleCruzDatabase.create(rawDb as AnyDialectDatabase)`.
   */
  static setDb(db: CruzDatabase): void {
    this.db = db;
  }

  /**
   * Get the database instance.
   * Checks the static property, global drizzle instance, or creates from D1 binding.
   * @throws Error if database has not been set
   */
  static getDb(): CruzDatabase {
    // Check static property first (for local dev)
    if (this.db) {
      return this.db;
    }

    // Check cached global drizzle instance
    if (typeof globalThis !== 'undefined' && globalThis.__drizzleDb) {
      return globalThis.__drizzleDb;
    }

    // Try to create from D1 binding (set by _worker.js)
    if (typeof globalThis !== 'undefined' && globalThis.__d1Database) {
      const schema = this.schema ?? undefined;
      const rawDb = schema
        ? drizzle(globalThis.__d1Database, { schema })
        : drizzle(globalThis.__d1Database);
      const db = DrizzleCruzDatabase.create(rawDb);
      globalThis.__drizzleDb = db;
      return db;
    }

    throw new Error(
      'Database not initialized. In Cloudflare Workers, ensure env.DB is bound in wrangler.toml and Pages settings.'
    );
  }

  /**
   * Check if database is initialized or D1 binding is available
   */
  static isInitialized(): boolean {
    return (
      this.db !== null ||
      (typeof globalThis !== 'undefined' && (
        globalThis.__drizzleDb !== null ||
        globalThis.__d1Database !== null
      ))
    );
  }

  /**
   * Clear the database instance (useful for testing)
   */
  static clear(): void {
    this.db = null;
    if (typeof globalThis !== 'undefined') {
      globalThis.__drizzleDb = null;
      globalThis.__d1Database = null;
    }
  }
}
