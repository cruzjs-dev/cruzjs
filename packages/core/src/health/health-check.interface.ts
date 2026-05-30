/**
 * Health Check Interface
 *
 * Defines the contract for pluggable health checks.
 * Implement this interface and register via multi-injection
 * using the HEALTH_CHECK token to add custom checks.
 */

export interface HealthCheck {
  /** Unique name for this health check (e.g., 'database', 'cache') */
  readonly name: string;

  /** Execute the health check and return the result */
  check(): Promise<HealthCheckComponentResult>;
}

export type HealthCheckComponentResult = {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  details?: Record<string, unknown>;
  durationMs?: number;
};

export type HealthCheckResponse = {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  checks: Record<string, HealthCheckComponentResult>;
};
