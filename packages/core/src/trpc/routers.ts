import { authTrpc } from '../auth/auth.trpc';
import { uploadTrpc } from '../upload/upload.trpc';
import { HealthTrpc } from '../health/health.trpc';
import { jobTrpc } from '../jobs/job.trpc';
import { appTrpc } from '../shared/app/app.trpc';
import { router } from './context';
import type { RouterProcedures } from './router-class';
import { MaintenanceTrpc } from '../maintenance/maintenance.trpc';
import { SchedulerTrpc } from '../scheduler/scheduler.trpc';
import { FeatureFlagTrpc } from '../feature-flags/feature-flag.trpc';
import { WebhookTrpc } from '../webhooks/webhook.trpc';
import { BroadcastTrpc } from '../broadcasting/broadcast.trpc';

export type RegisterTrpcOptions = {
  overrides?: Record<string, any | null>;
};

const coreDefaults = {
  app: appTrpc,
  auth: authTrpc,
  upload: uploadTrpc,
  health: router({} as RouterProcedures<HealthTrpc>),
  job: jobTrpc,
  maintenance: router({} as RouterProcedures<MaintenanceTrpc>),
  scheduler: router({} as RouterProcedures<SchedulerTrpc>),
  featureFlag: router({} as RouterProcedures<FeatureFlagTrpc>),
  webhook: router({} as RouterProcedures<WebhookTrpc>),
  broadcast: router({} as RouterProcedures<BroadcastTrpc>),
} as const;

type CoreTrpcRouters = typeof coreDefaults;

/**
 * Register CruzJS core tRPC routers (auth, uploads, health, jobs).
 *
 * @example
 * ```ts
 * const appRouter = router({
 *   ...registerCruzCoreTrpcRouters(),
 *   ...registerCruzSaasTrpcRouters(),
 *   ...registerCruzStartTrpcRouters(),
 * });
 * ```
 *
 * @example Override or disable routers
 * ```ts
 * ...registerCruzCoreTrpcRouters({
 *   overrides: {
 *     health: null, // disable health router
 *     auth: myCustomAuthRouter, // replace auth router
 *   },
 * }),
 * ```
 */
export function registerCruzCoreTrpcRouters(options?: RegisterTrpcOptions): CoreTrpcRouters {
  if (!options?.overrides) return coreDefaults;

  const overrides = options.overrides;
  const result: Record<string, any> = {};
  for (const [key, defaultRouter] of Object.entries(coreDefaults)) {
    if (key in overrides) {
      if (overrides[key] !== null) {
        result[key] = overrides[key];
      }
    } else {
      result[key] = defaultRouter;
    }
  }

  return result as CoreTrpcRouters;
}
