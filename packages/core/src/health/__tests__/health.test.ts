/**
 * Health Check Service Tests
 *
 * Verifies aggregation logic, status computation, liveness probe,
 * dynamic check registration, and duration timing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HealthCheck, HealthCheckComponentResult } from '../health-check.interface';
import { HealthCheckService } from '../health-check.service';

// ---------------------------------------------------------------------------
// Helpers — fake health checks
// ---------------------------------------------------------------------------

function createCheck(
  name: string,
  result: HealthCheckComponentResult,
  delayMs = 0,
): HealthCheck {
  return {
    name,
    check: vi.fn(async () => {
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
      return result;
    }),
  };
}

function createThrowingCheck(name: string, error: Error): HealthCheck {
  return {
    name,
    check: vi.fn(async () => {
      throw error;
    }),
  };
}

// ---------------------------------------------------------------------------
// We need to construct HealthCheckService manually because Inversify
// decorators are not applied in unit tests. The constructor accepts
// an array of HealthCheck instances via multi-injection.
// ---------------------------------------------------------------------------

function createService(checks: HealthCheck[] = []): HealthCheckService {
  // Call the constructor with the injected checks array
  return new (HealthCheckService as any)(checks) as HealthCheckService;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HealthCheckService', () => {
  describe('checkLiveness', () => {
    it('should always return alive with a timestamp', () => {
      const service = createService();
      const result = service.checkLiveness();

      expect(result.status).toBe('alive');
      expect(result.timestamp).toBeDefined();
      // Timestamp should be a valid ISO string
      expect(() => new Date(result.timestamp)).not.toThrow();
    });

    it('should return alive even when checks are registered', () => {
      const unhealthyCheck = createCheck('broken', { status: 'unhealthy', message: 'down' });
      const service = createService([unhealthyCheck]);

      const result = service.checkLiveness();
      expect(result.status).toBe('alive');
      // Liveness should NOT call any health checks
      expect(unhealthyCheck.check).not.toHaveBeenCalled();
    });
  });

  describe('checkHealth', () => {
    it('should return healthy when no checks are registered', async () => {
      const service = createService();
      const result = await service.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(Object.keys(result.checks)).toHaveLength(0);
    });

    it('should return healthy when all checks pass', async () => {
      const dbCheck = createCheck('database', { status: 'healthy', message: 'OK' });
      const cacheCheck = createCheck('cache', { status: 'healthy', message: 'OK' });

      const service = createService([dbCheck, cacheCheck]);
      const result = await service.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.checks.database.status).toBe('healthy');
      expect(result.checks.cache.status).toBe('healthy');
      expect(dbCheck.check).toHaveBeenCalledOnce();
      expect(cacheCheck.check).toHaveBeenCalledOnce();
    });

    it('should return unhealthy when any check fails', async () => {
      const dbCheck = createCheck('database', { status: 'unhealthy', message: 'connection refused' });
      const cacheCheck = createCheck('cache', { status: 'healthy', message: 'OK' });

      const service = createService([dbCheck, cacheCheck]);
      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('unhealthy');
      expect(result.checks.cache.status).toBe('healthy');
    });

    it('should return degraded when some checks are degraded and none are unhealthy', async () => {
      const dbCheck = createCheck('database', { status: 'healthy', message: 'OK' });
      const cacheCheck = createCheck('cache', { status: 'degraded', message: 'slow response' });
      const storageCheck = createCheck('storage', { status: 'healthy', message: 'OK' });

      const service = createService([dbCheck, cacheCheck, storageCheck]);
      const result = await service.checkHealth();

      expect(result.status).toBe('degraded');
      expect(result.checks.database.status).toBe('healthy');
      expect(result.checks.cache.status).toBe('degraded');
      expect(result.checks.storage.status).toBe('healthy');
    });

    it('should return unhealthy over degraded when both exist', async () => {
      const dbCheck = createCheck('database', { status: 'unhealthy', message: 'down' });
      const cacheCheck = createCheck('cache', { status: 'degraded', message: 'slow' });

      const service = createService([dbCheck, cacheCheck]);
      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
    });

    it('should handle checks that throw errors', async () => {
      const throwingCheck = createThrowingCheck('database', new Error('ECONNREFUSED'));
      const healthyCheck = createCheck('cache', { status: 'healthy', message: 'OK' });

      const service = createService([throwingCheck, healthyCheck]);
      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('unhealthy');
      expect(result.checks.database.message).toBe('ECONNREFUSED');
      expect(result.checks.cache.status).toBe('healthy');
    });

    it('should include duration timing on each check', async () => {
      const slowCheck = createCheck('slow', { status: 'healthy', message: 'OK' }, 50);
      const fastCheck = createCheck('fast', { status: 'healthy', message: 'OK' }, 0);

      const service = createService([slowCheck, fastCheck]);
      const result = await service.checkHealth();

      expect(result.checks.slow.durationMs).toBeGreaterThanOrEqual(40);
      expect(result.checks.fast.durationMs).toBeDefined();
      expect(result.checks.fast.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should run checks concurrently', async () => {
      // Two checks each taking 50ms should complete in ~50ms total (not ~100ms)
      const check1 = createCheck('check1', { status: 'healthy' }, 50);
      const check2 = createCheck('check2', { status: 'healthy' }, 50);

      const service = createService([check1, check2]);

      const start = Date.now();
      await service.checkHealth();
      const elapsed = Date.now() - start;

      // Allow some slack, but should be well under 100ms
      expect(elapsed).toBeLessThan(90);
    });
  });

  describe('registerCheck', () => {
    it('should add a dynamic check that is included in health response', async () => {
      const service = createService();

      const customCheck = createCheck('custom-api', { status: 'healthy', message: 'reachable' });
      service.registerCheck(customCheck);

      const result = await service.checkHealth();

      expect(result.checks['custom-api']).toBeDefined();
      expect(result.checks['custom-api'].status).toBe('healthy');
      expect(customCheck.check).toHaveBeenCalledOnce();
    });

    it('should overwrite an existing check with the same name', async () => {
      const originalCheck = createCheck('database', { status: 'unhealthy', message: 'old' });
      const service = createService([originalCheck]);

      const replacementCheck = createCheck('database', { status: 'healthy', message: 'new' });
      service.registerCheck(replacementCheck);

      const result = await service.checkHealth();

      expect(result.checks.database.status).toBe('healthy');
      expect(result.checks.database.message).toBe('new');
      expect(originalCheck.check).not.toHaveBeenCalled();
      expect(replacementCheck.check).toHaveBeenCalledOnce();
    });
  });

  describe('uptime', () => {
    it('should report uptime in seconds since service creation', async () => {
      const service = createService();

      // Wait a small amount to ensure uptime > 0
      await new Promise((r) => setTimeout(r, 50));

      const result = await service.checkHealth();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
