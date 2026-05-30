/**
 * Health Check Types
 *
 * Re-exports all health check types and the DI token.
 */

import { createToken } from '../di';
import type { HealthCheck } from './health-check.interface';

export type {
  HealthCheck,
  HealthCheckComponentResult,
  HealthCheckResponse,
} from './health-check.interface';

/**
 * DI token for multi-injection of health checks.
 *
 * Register custom health checks in your module:
 * ```typescript
 * @Module({
 *   providers: [
 *     { provide: HEALTH_CHECK, useClass: MyCustomCheck, multi: true },
 *   ],
 * })
 * ```
 */
export const HEALTH_CHECK = createToken<HealthCheck>('HealthCheck');
