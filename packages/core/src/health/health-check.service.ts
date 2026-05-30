/**
 * Health Check Service
 *
 * Aggregates all registered health checks and provides liveness,
 * readiness, and detailed health endpoints.
 *
 * Health checks are collected via multi-injection of the HEALTH_CHECK token.
 * Additional checks can be registered dynamically via registerCheck().
 */

import { Injectable, MultiInject, Optional } from '../di';
import type {
  HealthCheck,
  HealthCheckComponentResult,
  HealthCheckResponse,
} from './health-check.interface';
import { HEALTH_CHECK } from './health.types';

@Injectable()
export class HealthCheckService {
  private readonly checks: Map<string, HealthCheck> = new Map();
  private readonly startTime: number;

  constructor(
    @MultiInject(HEALTH_CHECK)
    @Optional()
    injectedChecks: HealthCheck[] = [],
  ) {
    this.startTime = Date.now();
    for (const check of injectedChecks) {
      this.checks.set(check.name, check);
    }
  }

  /**
   * Register a health check dynamically at runtime.
   * If a check with the same name already exists, it will be overwritten.
   */
  registerCheck(check: HealthCheck): void {
    this.checks.set(check.name, check);
  }

  /**
   * Simple liveness probe. Always returns alive if the process is running.
   */
  checkLiveness(): { status: 'alive'; timestamp: string } {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Run all registered health checks and aggregate results.
   *
   * Overall status logic:
   * - 'healthy' when all checks are healthy
   * - 'degraded' when at least one check is degraded and none are unhealthy
   * - 'unhealthy' when any check is unhealthy
   */
  async checkHealth(): Promise<HealthCheckResponse> {
    const checksEntries = Array.from(this.checks.entries());
    const results: Record<string, HealthCheckComponentResult> = {};

    // Run all checks concurrently
    const settled = await Promise.allSettled(
      checksEntries.map(async ([name, check]) => {
        const start = Date.now();
        try {
          const result = await check.check();
          result.durationMs = Date.now() - start;
          return { name, result };
        } catch (error) {
          return {
            name,
            result: {
              status: 'unhealthy' as const,
              message: error instanceof Error ? error.message : 'Unknown error',
              durationMs: Date.now() - start,
            },
          };
        }
      }),
    );

    let hasUnhealthy = false;
    let hasDegraded = false;

    for (const entry of settled) {
      if (entry.status === 'fulfilled') {
        const { name, result } = entry.value;
        results[name] = result;
        if (result.status === 'unhealthy') hasUnhealthy = true;
        if (result.status === 'degraded') hasDegraded = true;
      }
    }

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (hasUnhealthy) overallStatus = 'unhealthy';
    else if (hasDegraded) overallStatus = 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: results,
    };
  }
}
