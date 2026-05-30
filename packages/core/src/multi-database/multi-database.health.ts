/**
 * Multi-Database Health Check
 *
 * Verifies connectivity for all registered database connections.
 * Returns 'healthy' when all connections respond, 'degraded' when
 * replicas fail but primary is OK, 'unhealthy' when primary fails.
 */

import { Injectable, Inject } from '../di';
import { sql } from 'drizzle-orm';
import type { HealthCheck, HealthCheckComponentResult } from '../health/health-check.interface';
import { MultiDatabaseService } from './multi-database.service';
import { ConnectionRole } from './multi-database.types';

@Injectable()
export class MultiDatabaseHealthCheck implements HealthCheck {
  readonly name = 'multi-database';

  constructor(
    @Inject(MultiDatabaseService) private readonly multiDb: MultiDatabaseService,
  ) {}

  async check(): Promise<HealthCheckComponentResult> {
    const start = Date.now();
    const connections = this.multiDb.list();

    if (connections.length === 0) {
      return {
        status: 'healthy',
        message: 'No additional database connections registered',
        durationMs: Date.now() - start,
      };
    }

    const results: Record<string, { status: string; error?: string }> = {};
    let primaryFailed = false;
    let replicaFailed = false;

    for (const conn of connections) {
      try {
        const db = this.multiDb.connection(conn.name);
        await db.run(sql`SELECT 1`);
        results[conn.name] = { status: 'healthy' };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Connection failed';
        results[conn.name] = { status: 'unhealthy', error: errorMessage };

        if (conn.role === ConnectionRole.PRIMARY) {
          primaryFailed = true;
        } else {
          replicaFailed = true;
        }
      }
    }

    const durationMs = Date.now() - start;

    if (primaryFailed) {
      return {
        status: 'unhealthy',
        message: 'Primary database connection failed',
        details: results,
        durationMs,
      };
    }

    if (replicaFailed) {
      return {
        status: 'degraded',
        message: 'One or more replica/analytics connections failed',
        details: results,
        durationMs,
      };
    }

    return {
      status: 'healthy',
      message: `All ${connections.length} database connections healthy`,
      details: results,
      durationMs,
    };
  }
}
