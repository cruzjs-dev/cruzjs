/**
 * Multi-Database Types
 *
 * Core types for managing multiple database connections
 * across different roles (primary, replica, analytics).
 */

export const ConnectionRole = {
  PRIMARY: 'primary',
  REPLICA: 'replica',
  ANALYTICS: 'analytics',
} as const;
export type ConnectionRole = (typeof ConnectionRole)[keyof typeof ConnectionRole];

export type DatabaseConnectionConfig = {
  name: string;
  role: ConnectionRole;
  /** Cloudflare D1 binding name (e.g., DB_PRIMARY, DB_REPLICA) */
  bindingName?: string;
  /** PostgreSQL connection string or SQLite file path */
  connectionString?: string;
};

export type MultiDatabaseConfig = {
  connections: DatabaseConnectionConfig[];
  /** Name of the default connection; defaults to first primary */
  defaultConnection?: string;
};

export type ConnectionInfo = {
  name: string;
  role: ConnectionRole;
};
