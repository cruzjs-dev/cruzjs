/**
 * Health tRPC Router (OOP)
 *
 * Exposes health, detailed, and readiness endpoints as public procedures.
 */

import { Router, Route, TrpcRouter } from '../trpc/router-class';
import { Inject } from '../di';
import { publicProcedure } from '../trpc/context';
import { HealthCheckService } from './health-check.service';

@Router()
export class HealthTrpc extends TrpcRouter {
  @Inject(HealthCheckService) private healthService!: HealthCheckService;

  /** Simple liveness probe — always returns alive */
  @Route() health = publicProcedure.query(() =>
    this.healthService.checkLiveness(),
  );

  /** Detailed health check — runs all registered checks */
  @Route() detailed = publicProcedure.query(async () =>
    this.healthService.checkHealth(),
  );

  /** Readiness probe — same as detailed, useful for k8s-style readiness */
  @Route() readiness = publicProcedure.query(async () =>
    this.healthService.checkHealth(),
  );
}
