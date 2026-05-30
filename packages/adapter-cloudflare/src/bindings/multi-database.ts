/**
 * Cloudflare Multi-Database Setup
 *
 * Reads multi-database configuration and registers D1 bindings
 * as named connections. Supports multiple D1 databases bound
 * via wrangler.toml (e.g., DB_PRIMARY, DB_REPLICA, DB_ANALYTICS).
 *
 * Each binding is wrapped with drizzle() and registered in the
 * MultiDatabaseService with its configured role.
 */

import type { MultiDatabaseService } from '@cruzjs/core/multi-database';
import type { MultiDatabaseConfig } from '@cruzjs/core/multi-database';
import { drizzle } from 'drizzle-orm/d1';

/**
 * Wire Cloudflare D1 bindings into the MultiDatabaseService.
 *
 * @param env - Cloudflare Workers environment bindings
 * @param multiDbService - The MultiDatabaseService instance
 * @param config - Multi-database configuration with connection definitions
 *
 * @example
 * ```typescript
 * // In your Cloudflare adapter init():
 * setupMultiDatabase(env, multiDbService, {
 *   connections: [
 *     { name: 'primary', role: 'primary', bindingName: 'DB_PRIMARY' },
 *     { name: 'replica', role: 'replica', bindingName: 'DB_REPLICA' },
 *     { name: 'analytics', role: 'analytics', bindingName: 'DB_ANALYTICS' },
 *   ],
 * });
 * ```
 */
export function setupMultiDatabase(
  env: Record<string, unknown>,
  multiDbService: MultiDatabaseService,
  config: MultiDatabaseConfig,
): void {
  for (const conn of config.connections) {
    const bindingName = conn.bindingName ?? `DB_${conn.name.toUpperCase()}`;
    const d1Binding = env[bindingName] as D1Database | undefined;

    if (!d1Binding) {
      console.warn(
        `[MultiDatabase] D1 binding "${bindingName}" not found in environment for connection "${conn.name}". Skipping.`,
      );
      continue;
    }

    const db = drizzle(d1Binding);
    multiDbService.register(conn.name, db as any, conn.role);
  }
}
