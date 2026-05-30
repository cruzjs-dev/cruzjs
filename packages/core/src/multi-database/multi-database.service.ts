/**
 * Multi-Database Service
 *
 * Central service for managing named database connections.
 * Supports primary, replica (with round-robin), and analytics roles.
 * The primary injected DRIZZLE database is always available as fallback.
 */

import { Injectable, Inject, Optional } from '../di';
import { DRIZZLE, type DrizzleDatabase } from '../shared/database/drizzle.service';
import { ConfigService } from '../shared/config/config.service';
import { ConnectionRole, type ConnectionInfo } from './multi-database.types';

@Injectable()
export class MultiDatabaseService {
  private readonly connections = new Map<string, { db: DrizzleDatabase; role: ConnectionRole }>();
  private replicaIndex = 0;

  constructor(
    @Inject(DRIZZLE) private readonly primaryDb: DrizzleDatabase,
    @Inject(ConfigService) @Optional() private readonly config?: ConfigService,
  ) {}

  /**
   * Register a named connection with its role.
   */
  register(name: string, db: DrizzleDatabase, role: ConnectionRole = ConnectionRole.PRIMARY): void {
    this.connections.set(name, { db, role });
  }

  /**
   * Get a named connection. Throws if not found.
   */
  connection(name: string): DrizzleDatabase {
    const entry = this.connections.get(name);
    if (!entry) {
      throw new Error(`Database connection "${name}" is not registered. Call register() first.`);
    }
    return entry.db;
  }

  /**
   * Get the primary connection.
   * Returns the first registered primary, or falls back to the injected DRIZZLE database.
   */
  primary(): DrizzleDatabase {
    for (const entry of this.connections.values()) {
      if (entry.role === ConnectionRole.PRIMARY) {
        return entry.db;
      }
    }
    return this.primaryDb;
  }

  /**
   * Get a replica connection using round-robin selection.
   * Falls back to primary() if no replicas are registered.
   */
  replica(): DrizzleDatabase {
    const replicas = this.getByRole(ConnectionRole.REPLICA);
    if (replicas.length === 0) {
      return this.primary();
    }
    const db = replicas[this.replicaIndex % replicas.length];
    this.replicaIndex = (this.replicaIndex + 1) % replicas.length;
    return db;
  }

  /**
   * Get the analytics connection.
   * Falls back to primary() if no analytics connection is registered.
   */
  analytics(): DrizzleDatabase {
    for (const entry of this.connections.values()) {
      if (entry.role === ConnectionRole.ANALYTICS) {
        return entry.db;
      }
    }
    return this.primary();
  }

  /**
   * List all registered connection names and their roles.
   */
  list(): ConnectionInfo[] {
    const result: ConnectionInfo[] = [];
    for (const [name, entry] of this.connections) {
      result.push({ name, role: entry.role });
    }
    return result;
  }

  /**
   * Execute a function on the primary connection.
   *
   * NOTE: Cross-connection transactions are best-effort only, not true XA.
   */
  async withPrimary<T>(fn: (db: DrizzleDatabase) => Promise<T>): Promise<T> {
    return fn(this.primary());
  }

  /**
   * Execute a function on a replica connection (round-robin selected).
   */
  async withReplica<T>(fn: (db: DrizzleDatabase) => Promise<T>): Promise<T> {
    return fn(this.replica());
  }

  // ── Private helpers ─────────────────────────────────────────────────

  private getByRole(role: ConnectionRole): DrizzleDatabase[] {
    const dbs: DrizzleDatabase[] = [];
    for (const entry of this.connections.values()) {
      if (entry.role === role) {
        dbs.push(entry.db);
      }
    }
    return dbs;
  }
}
