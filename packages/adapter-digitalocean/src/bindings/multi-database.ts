/**
 * DigitalOcean Multi-Database Setup
 *
 * Registers multiple database connections for DigitalOcean deployments.
 * Supports Managed Database connection strings via environment variables.
 *
 * For production, each connection uses a DATABASE_URL_<NAME> env var pattern.
 */

import type { MultiDatabaseService } from '@cruzjs/core/multi-database';
import type { MultiDatabaseConfig } from '@cruzjs/core/multi-database';

/**
 * Wire DigitalOcean database connections into the MultiDatabaseService.
 *
 * @param env - Environment variables
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
    // PostgreSQL driver integration is added.
    console.info(
      `[MultiDatabase] DigitalOcean connection "${conn.name}" (${conn.role}) configured. ` +
      `Driver integration pending.`,
    );
  }
}
