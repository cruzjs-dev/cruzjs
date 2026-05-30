import { injectable, inject } from 'inversify';
import { DRIZZLE, type DrizzleDatabase } from '../database/drizzle.service';
import { sql } from 'drizzle-orm';

export type HealthCheckResult = {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    database?: {
      status: 'healthy' | 'unhealthy';
      error?: string;
    };
    cache?: {
      status: 'healthy' | 'unavailable';
      provider: 'kv';
    };
  };
};

export type ReadinessCheckResult = {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks: {
    database?: {
      status: 'ready' | 'not_ready';
      error?: string;
    };
    cache?: {
      status: 'ready' | 'unavailable';
      provider: 'kv';
    };
  };
};

/**
 * Health service for checking system health
 * Works with Cloudflare D1 database and KV cache
 */
@injectable()
export class HealthService {
  constructor(
    @inject(DRIZZLE) private readonly db: DrizzleDatabase
  ) {}

  /**
   * Perform comprehensive health check
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {},
    };

    // Check database connection
    try {
      // D1 uses run() for raw SQL queries
      await this.db.run(sql`SELECT 1`);
      checks.checks.database = { status: 'healthy' };
    } catch (error) {
      checks.status = 'unhealthy';
      checks.checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // KV cache is always available in Cloudflare environment
    // No explicit health check needed - it's managed by Cloudflare
    checks.checks.cache = { status: 'healthy', provider: 'kv' };

    return checks;
  }

  /**
   * Perform readiness check (database only)
   */
  async checkReadiness(): Promise<ReadinessCheckResult> {
    const checks: ReadinessCheckResult = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {},
    };

    // Check database connection
    try {
      // D1 uses run() for raw SQL queries
      await this.db.run(sql`SELECT 1`);
      checks.checks.database = { status: 'ready' };
    } catch (error) {
      checks.status = 'not_ready';
      checks.checks.database = {
        status: 'not_ready',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // KV cache is always ready in Cloudflare environment
    checks.checks.cache = { status: 'ready', provider: 'kv' };

    return checks;
  }

  /**
   * Simple liveness check (always returns alive)
   */
  checkLiveness(): { status: 'alive'; timestamp: string } {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
