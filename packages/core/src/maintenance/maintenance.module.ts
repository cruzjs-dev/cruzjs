/**
 * Maintenance Module
 *
 * Provides maintenance mode toggle, KV-backed state, bypass logic,
 * and tRPC admin endpoints.
 *
 * Register via `createCruzApp({ modules: [MaintenanceModule] })`.
 * To enable the request-level middleware, also set `maintenanceMode: true`
 * in the CruzAppConfig.
 */

import { Module } from '../di';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceTrpc } from './maintenance.trpc';

@Module({
  providers: [MaintenanceService, MaintenanceTrpc],
  trpcRouters: {
    maintenance: MaintenanceTrpc,
  },
})
export class MaintenanceModule {}
