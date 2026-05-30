/**
 * Cache Health Check
 *
 * Verifies cache connectivity by writing and reading a test key.
 * Uses KVCacheServiceFactory to create a namespaced cache instance.
 */

import { Injectable, Inject } from '../../di';
import { KVCacheServiceFactory } from '../../shared/cloudflare/kv-cache.service';
import type { KVCacheService } from '../../shared/cloudflare/kv-cache.service';
import type { HealthCheck, HealthCheckComponentResult } from '../health-check.interface';

const HEALTH_CHECK_KEY = '__health_check__';
const HEALTH_CHECK_VALUE = 'ok';

@Injectable()
export class CacheHealthCheck implements HealthCheck {
  readonly name = 'cache';

  private readonly cache: KVCacheService;

  constructor(
    @Inject(KVCacheServiceFactory) cacheFactory: KVCacheServiceFactory,
  ) {
    this.cache = cacheFactory.create('health');
  }

  async check(): Promise<HealthCheckComponentResult> {
    try {
      // Write a test key with a short TTL
      const writeResult = await this.cache.set(HEALTH_CHECK_KEY, HEALTH_CHECK_VALUE, 60);
      if (!writeResult) {
        return {
          status: 'degraded',
          message: 'Cache write unavailable (KV namespace may not be bound)',
          details: { provider: 'kv' },
        };
      }

      // Read it back
      const readResult = await this.cache.get<string>(HEALTH_CHECK_KEY);
      if (readResult !== HEALTH_CHECK_VALUE) {
        return {
          status: 'degraded',
          message: 'Cache read returned unexpected value',
          details: {
            provider: 'kv',
            expected: HEALTH_CHECK_VALUE,
            actual: readResult,
          },
        };
      }

      // Clean up
      await this.cache.delete(HEALTH_CHECK_KEY);

      return {
        status: 'healthy',
        message: 'Cache read/write successful',
        details: { provider: 'kv' },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Cache check failed',
        details: {
          provider: 'kv',
          error: error instanceof Error ? error.name : 'UnknownError',
        },
      };
    }
  }
}
