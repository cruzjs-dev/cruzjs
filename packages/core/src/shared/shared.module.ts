/**
 * Shared Module
 *
 * Contains infrastructure services used across all domains.
 * Configured for Cloudflare Workers environment (R2 storage, KV cache).
 */

import { Module } from '../di';
import { RouteRegistry } from '../framework/route-registry';
import { R2Service, KVCacheServiceFactory } from './cloudflare';
import { ConfigService } from './config/config.service';
import {
  DRIZZLE,
  DrizzleService,
} from './database/drizzle.service';
import { EventEmitterService } from './events/event-emitter.service.server';
import { HealthCheckService } from '../health/health-check.service';
import { HealthTrpc } from '../health/health.trpc';
import { DatabaseHealthCheck } from '../health/checks/database.check';
import { CacheHealthCheck } from '../health/checks/cache.check';
import { StorageHealthCheck } from '../health/checks/storage.check';
import { HEALTH_CHECK } from '../health/health.types';
import { appTrpc } from './app/app.trpc';
import { Logger } from '../logging';
import { MetricsService } from './monitoring/metrics.service';
import { LocalStorageDriver } from './storage/drivers/local.driver.server';
import { R2StorageDriver } from './storage/drivers/r2.driver';
import { StorageService } from './storage/storage.service.server';
@Module({
  providers: [
    // Core infrastructure
    ConfigService,
    R2Service,
    R2StorageDriver,
    LocalStorageDriver,
    StorageService,
    Logger,
    MetricsService,
    EventEmitterService,

    // Health check system (enhanced, extensible)
    HealthCheckService,
    HealthTrpc,
    { provide: HEALTH_CHECK, useClass: DatabaseHealthCheck, multi: true },
    { provide: HEALTH_CHECK, useClass: CacheHealthCheck, multi: true },
    { provide: HEALTH_CHECK, useClass: StorageHealthCheck, multi: true },

    // Framework infrastructure
    RouteRegistry,

    // Cache service - use Cloudflare KV for persistent caching
    KVCacheServiceFactory,

    // Database - lazy factory to avoid calling getDb() at module load time
    { provide: DRIZZLE, useFactory: () => DrizzleService.getDb() },
  ],
  trpcRouters: {
    app: appTrpc,
    health: HealthTrpc,
  },
})
export class SharedModule {}
