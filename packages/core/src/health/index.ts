/**
 * Health Check Module - Public API
 */

// Interfaces & Types
export type {
  HealthCheck,
  HealthCheckComponentResult,
  HealthCheckResponse,
} from './health-check.interface';
export { HEALTH_CHECK } from './health.types';

// Service
export { HealthCheckService } from './health-check.service';

// tRPC Router
export { HealthTrpc } from './health.trpc';

// Built-in checks
export { DatabaseHealthCheck } from './checks/database.check';
export { CacheHealthCheck } from './checks/cache.check';
export { StorageHealthCheck } from './checks/storage.check';

// Module
export { HealthModule } from './health.module';
