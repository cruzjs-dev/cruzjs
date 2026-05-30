import { publicProcedure, router } from '../../trpc/context';
import { HealthService } from './health.service';

export const healthTrpc = router({
  /**
   * Health check endpoint
   */
  check: publicProcedure.query(async ({ ctx }) => {
    const healthService = ctx.container.get<HealthService>(HealthService);
    return await healthService.checkHealth();
  }),

  /**
   * Liveness check endpoint
   */
  live: publicProcedure.query(async ({ ctx }) => {
    const healthService = ctx.container.get<HealthService>(HealthService);
    return healthService.checkLiveness();
  }),

  /**
   * Readiness check endpoint
   */
  ready: publicProcedure.query(async ({ ctx }) => {
    const healthService = ctx.container.get<HealthService>(HealthService);
    return await healthService.checkReadiness();
  }),
});
