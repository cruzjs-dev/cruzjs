import { userProfileTrpc } from '../user-profile';
import { apiKeyTrpc } from '../api-keys';
import { realTimeTrpc } from '../real-time';
import { notificationTrpc } from '../notifications';
import { dashboardTrpc } from '../dashboard';
import { integrationTrpc } from '../integrations';
import { aiConnectionsTrpc } from '../ai-connections';
import { SocialAuthTrpc } from '../social-auth/social-auth.trpc';
import { router } from '@cruzjs/core/trpc/context';
import type { RouterProcedures } from '@cruzjs/core/trpc/router-class';
import type { RegisterTrpcOptions } from '@cruzjs/core/trpc/routers';

const startDefaults = {
  userProfile: userProfileTrpc,
  apiKey: apiKeyTrpc,
  realTime: realTimeTrpc,
  notification: notificationTrpc,
  dashboard: dashboardTrpc,
  integrations: integrationTrpc,
  aiConnections: aiConnectionsTrpc,
  socialAuth: router({} as RouterProcedures<SocialAuthTrpc>),
} as const;

type StartTrpcRouters = typeof startDefaults;

/**
 * Register CruzJS Start tRPC routers (user profile, API keys, real-time,
 * notifications, dashboard, integrations, AI connections).
 *
 * @example
 * ```ts
 * ...registerCruzStartTrpcRouters({
 *   overrides: {
 *     aiConnections: null, // disable AI connections router
 *   },
 * }),
 * ```
 */
export function registerCruzStartTrpcRouters(options?: RegisterTrpcOptions): StartTrpcRouters {
  if (!options?.overrides) return startDefaults;

  const overrides = options.overrides;
  const result: Record<string, any> = {};
  for (const [key, defaultRouter] of Object.entries(startDefaults)) {
    if (key in overrides) {
      if (overrides[key] !== null) {
        result[key] = overrides[key];
      }
    } else {
      result[key] = defaultRouter;
    }
  }

  return result as StartTrpcRouters;
}
