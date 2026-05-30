/**
 * AWS Multi-Database Setup
 *
 * Registers multiple database connections for AWS deployments.
 * Supports RDS/Aurora connection strings configured via environment variables.
 *
 * For production, each connection uses a DATABASE_URL_<NAME> env var pattern.
 * Falls back to logging a warning when a connection string is not available.
 */

import type { MultiDatabaseService } from '@cruzjs/core/multi-database';
import type { MultiDatabaseConfig } from '@cruzjs/core/multi-database';

/**
 * Wire AWS database connections into the MultiDatabaseService.
 *
 * @param env - Environment variables (process.env or Lambda context)
 * @param multiDbService - The MultiDatabaseService instance
 * @param config - Multi-database configuration with connection definitions
 *
 * @example
 * ```typescript
 * setupMultiDatabase(process.env, multiDbService, {
 *   connections: [
 *     { name: 'primary', role: 'primary', connectionString: process.env.DATABASE_URL_PRIMARY },
 *     { name: 'replica', role: 'replica', connectionString: process.env.DATABASE_URL_REPLICA },
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

    // TODO: Create actual drizzle instance from connection string when
    // PostgreSQL/MySQL driver integration is added (e.g., drizzle-orm/node-postgres).
    // For now, log the intent and skip registration.
    console.info(
      `[MultiDatabase] AWS connection "${conn.name}" (${conn.role}) configured. ` +
      `Driver integration pending.`,
    );
  }
}
