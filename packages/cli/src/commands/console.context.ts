/**
 * Console context builder.
 *
 * Loads the project's database schema, initializes a local SQLite database,
 * builds the DI container with all registered modules, and exposes everything
 * as globals in the REPL.
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { resolveAppDir } from '../utils/shell';
import type { CruzContainer } from '@cruzjs/core/di';
import type { DrizzleDatabase, AnyDialectDatabase } from '@cruzjs/core';

/**
 * Minimal interface for the raw SQLite database (better-sqlite3).
 * We define this here to avoid a direct dependency on @types/better-sqlite3 in the CLI package.
 */
export interface RawSqliteDb {
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): unknown;
  };
  exec(sql: string): void;
  close(): void;
}

export interface ConsoleContext {
  db: DrizzleDatabase | null;
  /** Raw better-sqlite3 database for direct SQL (PRAGMA, sqlite_master, etc.) */
  rawDb: RawSqliteDb | null;
  container: CruzContainer | null;
  services: Record<string, unknown>;
  /** Service names available in the container (for tab-completion and listing) */
  serviceNames: string[];
  config: Record<string, string>;
  schema: Record<string, unknown>;

  /** Execute raw SQL and return rows */
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;

  /** Find rows from a named schema table */
  find: (table: string) => Promise<unknown[]>;
}

/**
 * Find the migrations directory.
 */
function findMigrationsDir(appDir: string): string | undefined {
  const candidates = [
    path.resolve(appDir, 'drizzle'),
    path.resolve(appDir, 'migrations'),
    path.resolve(appDir, 'src/database/migrations'),
  ];
  return candidates.find((d) => fs.existsSync(d));
}

/**
 * Build the full console context: schema, db, container, services, helpers.
 */
export async function buildContext(
  projectRoot: string,
  env: string,
): Promise<ConsoleContext> {
  const appDir = resolveAppDir(projectRoot);

  // Load .env file if present
  try {
    const dotenv = await import('dotenv');
    const envFile = env !== 'development'
      ? path.resolve(projectRoot, `.env.${env}`)
      : path.resolve(projectRoot, '.env');
    if (fs.existsSync(envFile)) {
      dotenv.config({ path: envFile });
    }
  } catch {
    // dotenv not available, continue without it
  }

  // Ensure LOCAL_DEV is set so the framework uses local SQLite
  process.env.LOCAL_DEV = 'true';

  // ── Load schema ──────────────────────────────────────────────────────────

  let schema: Record<string, unknown> = {};
  const schemaPaths = [
    path.resolve(appDir, 'src/database/schema.ts'),
    path.resolve(appDir, 'src/database/schema.js'),
    path.resolve(appDir, 'database/schema.ts'),
  ];

  for (const schemaPath of schemaPaths) {
    if (fs.existsSync(schemaPath)) {
      try {
        schema = await import(schemaPath);
        console.log(`  Schema loaded from ${path.relative(projectRoot, schemaPath)}`);
      } catch (err) {
        console.warn(`  Warning: Failed to load schema from ${schemaPath}: ${err}`);
      }
      break;
    }
  }

  // ── Initialize database ──────────────────────────────────────────────────

  let db: DrizzleDatabase | null = null;
  let rawSqliteDb: RawSqliteDb | null = null;
  let container: CruzContainer | null = null;

  try {
    const { DrizzleService, DrizzleCruzDatabase } = await import('@cruzjs/core');
    const { LocalDb } = await import('@cruzjs/core');

    // Set schema before init
    DrizzleService.setSchema(schema);

    // Find local database
    const dbPath = process.env.LOCAL_DB_PATH
      || path.resolve(appDir, 'data/local.db');

    if (fs.existsSync(dbPath) || fs.existsSync(path.dirname(dbPath))) {
      // Run migrations if available
      const migrationsDir = findMigrationsDir(appDir);
      if (migrationsDir) {
        await LocalDb.init(dbPath, migrationsDir);
      }

      const rawDb = LocalDb.create(dbPath, schema);
      db = DrizzleCruzDatabase.create(rawDb as AnyDialectDatabase);
      DrizzleService.setDb(db);

      // Extract the underlying better-sqlite3 instance for raw SQL access.
      // drizzle() returns { $client: Database } on the instance.
      try {
        rawSqliteDb = (rawDb as any).$client as RawSqliteDb;
      } catch {
        // Fall back: not critical, .tables and .describe won't work
      }

      console.log(`  Database connected at ${path.relative(projectRoot, dbPath)}`);
    } else {
      console.log('  No local database found. `db` will be null.');
      console.log(`  Run \`cruz db migrate\` first to create the database.`);
    }
  } catch (err) {
    console.warn(`  Warning: Failed to initialize database: ${err}`);
  }

  // ── Build DI container ───────────────────────────────────────────────────

  try {
    // Initialize CloudflareContext with empty env so services can resolve
    const { CloudflareContext } = await import(
      '@cruzjs/core/shared/cloudflare/context'
    );
    await CloudflareContext.init({ cloudflare: { env: {} } });

    // Try to load the app's server config to discover modules
    const { buildContainerWithProviders } = await import('@cruzjs/core');

    const serverPaths = [
      path.resolve(appDir, 'src/server.cloudflare.ts'),
      path.resolve(appDir, 'src/server.ts'),
    ];

    let modules: Array<{ module?: any }> = [];

    for (const serverPath of serverPaths) {
      if (fs.existsSync(serverPath)) {
        try {
          const serverModule = await import(serverPath);
          // The default export is the result of createCruzApp, not helpful directly.
          // Instead, try to find module exports. We'll load the modules from the config.
          // Since createCruzApp is already called, modules are already loaded in the import.
          // We need to parse the file or use a convention.
          // Simplest approach: just build with empty providers; core modules are always loaded.
          console.log(`  Server config found at ${path.relative(projectRoot, serverPath)}`);
        } catch {
          // Expected - server.cloudflare.ts imports CF-specific things
        }
        break;
      }
    }

    // Build container with core modules (user modules require CF runtime, so we skip them)
    container = await buildContainerWithProviders(modules);
    console.log('  DI container initialized with core modules');
  } catch (err) {
    console.warn(`  Warning: Failed to build DI container: ${err}`);
  }

  // ── Build services proxy ─────────────────────────────────────────────────

  const services: Record<string, unknown> = {};
  if (container) {
    return buildContextResult(db, rawSqliteDb, container, schema, services);
  }

  return buildContextResult(db, rawSqliteDb, container, schema, services);
}

function buildContextResult(
  db: DrizzleDatabase | null,
  rawSqliteDb: RawSqliteDb | null,
  container: CruzContainer | null,
  schema: Record<string, unknown>,
  services: Record<string, unknown>,
): ConsoleContext {
  // Extract service names from the container for tab-completion
  const serviceNames: string[] = [];
  if (container) {
    try {
      const bindings = (container as any)._bindingDictionary?._map;
      if (bindings) {
        for (const [key] of bindings) {
          const name = typeof key === 'symbol' ? key.description ?? key.toString() : String(key);
          // Strip the 'cruz:' prefix for cleaner names
          const cleanName = name.startsWith('cruz:') ? name.slice(5) : name;
          serviceNames.push(cleanName);
        }
        serviceNames.sort();
      }
    } catch {
      // Could not extract service names
    }
  }

  // Build a services proxy that attempts to resolve by class name
  const servicesProxy = new Proxy(services, {
    get(_target, prop: string) {
      if (!container) {
        console.log('Container not initialized. Cannot resolve services.');
        return undefined;
      }
      // Try to resolve by symbol token
      try {
        const token = Symbol.for(`cruz:${prop}`);
        if (container.isBound(token)) {
          return container.get(token);
        }
      } catch {
        // not found by token
      }
      console.log(`Service "${prop}" not found in container.`);
      return undefined;
    },
    // Support Object.keys() and for...in on the proxy for tab-completion
    ownKeys() {
      return serviceNames;
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      if (serviceNames.includes(prop)) {
        return { configurable: true, enumerable: true, writable: true };
      }
      return undefined;
    },
  });

  // Build config from process.env
  const config: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      config[key] = value;
    }
  }

  // Helper: raw SQL query
  const query = async (sql: string, _params?: unknown[]): Promise<unknown[]> => {
    if (!db) {
      console.log('Database not initialized.');
      return [];
    }
    try {
      // BetterSQLite3Database exposes .run() but for raw SQL we go through the underlying driver
      const result = (db as any).all({ sql, params: _params || [] });
      return result?.rows ?? result ?? [];
    } catch (err) {
      console.error('Query error:', err);
      return [];
    }
  };

  // Helper: find from a named table
  const find = async (tableName: string): Promise<unknown[]> => {
    if (!db) {
      console.log('Database not initialized.');
      return [];
    }
    const table = schema[tableName];
    if (!table) {
      console.log(`Table "${tableName}" not found in schema. Available: ${Object.keys(schema).join(', ')}`);
      return [];
    }
    try {
      return (db as any).select().from(table).all();
    } catch (err) {
      console.error('Find error:', err);
      return [];
    }
  };

  return {
    db,
    rawDb: rawSqliteDb,
    container,
    services: servicesProxy,
    serviceNames,
    config,
    schema,
    query,
    find,
  };
}
