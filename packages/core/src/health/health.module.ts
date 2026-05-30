/**
 * Health Module
 *
 * Provides extensible health check infrastructure with built-in checks
 * for database, cache, and storage. Additional checks can be registered
 * via multi-injection of the HEALTH_CHECK token.
 *
 * @example
 * ```typescript
 * // Register custom checks in your module
 * @Module({
 *   providers: [
 *     { provide: HEALTH_CHECK, useClass: MyCustomCheck, multi: true },
 *   ],
 * })
 * export class MyModule {}
 * ```
 */

import { Module } from '../di';
import { HealthCheckService } from './health-check.service';
import { HealthTrpc } from './health.trpc';
import { DatabaseHealthCheck } from './checks/database.check';
import { CacheHealthCheck } from './checks/cache.check';
import { StorageHealthCheck } from './checks/storage.check';
import { HEALTH_CHECK } from './health.types';

@Module({
  providers: [
    // Core health service
    HealthCheckService,
    HealthTrpc,

    // Built-in health checks (multi-injection)
    { provide: HEALTH_CHECK, useClass: DatabaseHealthCheck, multi: true },
    { provide: HEALTH_CHECK, useClass: CacheHealthCheck, multi: true },
    { provide: HEALTH_CHECK, useClass: StorageHealthCheck, multi: true },
  ],
  trpcRouters: {
    health: HealthTrpc,
  },
})
export class HealthModule {}
