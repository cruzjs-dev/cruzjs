/**
 * tRPC App Router type composition
 *
 * Combines framework routers (core, start) with your feature modules' routers.
 * Add your feature router types here as you build them.
 */
import { router } from '@cruzjs/core/trpc/context';
import { registerCruzCoreTrpcRouters } from '@cruzjs/core/trpc/routers';
import { registerCruzStartTrpcRouters } from '@cruzjs/start/trpc/routers';

const appRouter = router({
  ...registerCruzCoreTrpcRouters(),
  ...registerCruzStartTrpcRouters(),
  // Add your feature routers here:
  // myFeature: myFeatureTrpc,
});

export type AppRouter = typeof appRouter;
