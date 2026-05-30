/**
 * Docker / Self-Hosted Multi-Database Setup
 *
 * Registers multiple database connections for self-hosted deployments.
 * Supports SQLite file paths and PostgreSQL connection strings
 * via environment variables.
 *
 * For production, each connection uses a DATABASE_URL_<NAME> env var pattern.
 * For local SQLite, use file paths like ./data/replica.db.
 */

import type { MultiDatabaseService } from '@cruzjs/core/multi-database';
import type { MultiDatabaseConfig } from '@cruzjs/core/multi-database';

/**
 * Wire Docker/self-hosted database connections into the MultiDatabaseService.
 *
 * @param env - Environment variables (process.env)
 * @param multiDbService - The MultiDatabaseService instance
 * @param config - Multi-database configuration with connection definitions
 *
 * @example
 * ```typescript
 * setupMultiDatabase(process.env, multiDbService, {
 *   connections: [
 *     { name: 'primary', role: 'primary', connectionString: './data/primary.db' },
 *     { name: 'analytics', role: 'analytics', connectionString: process.env.ANALYTICS_DB_URL },
 *   ],
 * });
 * ```
 */
export function setupMultiDatabase(
  env: Record<string, string | undefined>,
  multiDbService: MultiDatabaseService,
  config: MultiDatabaseConfig,
): void {
  for (const conn of config.connections) {
    const connectionString =
      conn.connectionString ?? env[`DATABASE_URL_${conn.name.toUpperCase()}`];

    if (!connectionString) {
      console.warn(
        `[MultiDatabase] Connection string for "${conn.name}" not found. ` +
        `Set DATABASE_URL_${conn.name.toUpperCase()} or provide connectionString in config. Skipping.`,
      );
      continue;
    }

    // TODO: Detect SQLite vs PostgreSQL from connection string format
    // and create the appropriate drizzle instance.
    // SQLite: connectionString ending in .db or .sqlite
    // PostgreSQL: connectionString starting with postgres:// or postgresql://
    console.info(
      `[MultiDatabase] Docker connection "${conn.name}" (${conn.role}) configured at ${connectionString}. ` +
      `Driver integration pending.`,
    );
  }
}
