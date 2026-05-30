import { publicProcedure, router } from '../../trpc/context';
import { getConfig } from '../config';

export const appTrpc = router({
  /**
   * Returns runtime feature flags for client-side feature gating.
   */
  features: publicProcedure.query(async () => {
    const config = await getConfig();
    return config.features;
  }),
});
