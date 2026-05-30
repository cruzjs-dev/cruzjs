/**
 * Drizzle Configuration — dialect-aware
 *
 * Controls which dialect (and migration folder) drizzle-kit uses.
 *
 * Set CRUZ_DIALECT to one of: sqlite (default) | postgresql | mysql
 *
 * Examples:
 *   CRUZ_DIALECT=sqlite         → D1-compatible SQLite (Cloudflare default)
 *   CRUZ_DIALECT=postgresql     → PostgreSQL (AWS RDS, Neon, Supabase, etc.)
 *   CRUZ_DIALECT=mysql          → MySQL / PlanetScale
 *
 * Migration folders are kept separate per dialect:
 *   apps/demo/src/database/migrations/sqlite/
 *   apps/demo/src/database/migrations/postgresql/
 *   apps/demo/src/database/migrations/mysql/
 */

import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

const dialect = (process.env.CRUZ_DIALECT ?? 'sqlite') as
  | 'sqlite'
  | 'postgresql'
  | 'mysql';

const schema = './apps/demo/src/database/schema.ts';
const migrationsBase = './apps/demo/src/database/migrations';

function buildConfig(): Config {
  if (dialect === 'postgresql') {
    return {
      schema,
      out: `${migrationsBase}/postgresql`,
      dialect: 'postgresql',
      dbCredentials: {
        url: process.env.DATABASE_URL ?? '',
      },
      verbose: true,
      strict: true,
    };
  }

  if (dialect === 'mysql') {
    return {
      schema,
      out: `${migrationsBase}/mysql`,
      dialect: 'mysql',
      dbCredentials: {
        url: process.env.DATABASE_URL ?? '',
      },
      verbose: true,
      strict: true,
    };
  }

  // Default: SQLite / Cloudflare D1
  return {
    schema,
    out: `${migrationsBase}/sqlite`,
    dialect: 'sqlite',
    driver: 'd1-http',
    dbCredentials: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
      databaseId: process.env.CLOUDFLARE_DATABASE_ID ?? '',
      token: process.env.CLOUDFLARE_D1_TOKEN ?? '',
    },
    verbose: true,
    strict: true,
  };
}

export default buildConfig() satisfies Config;
