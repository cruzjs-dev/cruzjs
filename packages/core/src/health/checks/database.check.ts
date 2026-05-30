/**
 * Database Health Check
 *
 * Verifies database connectivity by running a simple SELECT 1 query.
 */

import { Injectable, Inject } from '../../di';
import { DRIZZLE, type DrizzleDatabase } from '../../shared/database/drizzle.service';
import { sql } from 'drizzle-orm';
import type { HealthCheck, HealthCheckComponentResult } from '../health-check.interface';

@Injectable()
export class DatabaseHealthCheck implements HealthCheck {
  readonly name = 'database';

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  async check(): Promise<HealthCheckComponentResult> {
    try {
      await this.db.run(sql`SELECT 1`);
      return {
        status: 'healthy',
        message: 'Database connection successful',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Database connection failed',
        details: {
          error: error instanceof Error ? error.name : 'UnknownError',
        },
      };
    }
  }
}
