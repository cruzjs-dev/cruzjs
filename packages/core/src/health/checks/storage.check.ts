/**
 * Storage Health Check
 *
 * Verifies that the R2/storage bucket is accessible by checking
 * whether the CloudflareContext has a bound R2 bucket.
 */

import { Injectable } from '../../di';
import { CloudflareContext } from '../../shared/cloudflare/context';
import type { HealthCheck, HealthCheckComponentResult } from '../health-check.interface';

@Injectable()
export class StorageHealthCheck implements HealthCheck {
  readonly name = 'storage';

  async check(): Promise<HealthCheckComponentResult> {
    try {
      const bucket = CloudflareContext.r2;
      if (!bucket) {
        return {
          status: 'degraded',
          message: 'R2 storage bucket not bound (may be unavailable in local dev)',
          details: { provider: 'r2', bound: false },
        };
      }

      // Attempt a lightweight list operation to verify connectivity
      // Limit to 1 result to minimize cost
      await bucket.list({ limit: 1 });

      return {
        status: 'healthy',
        message: 'Storage bucket accessible',
        details: { provider: 'r2', bound: true },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Storage check failed',
        details: {
          provider: 'r2',
          error: error instanceof Error ? error.name : 'UnknownError',
        },
      };
    }
  }
}
