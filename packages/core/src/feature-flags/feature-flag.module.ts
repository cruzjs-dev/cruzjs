/**
 * Feature Flag Module
 *
 * Registers the FeatureFlagService and FeatureFlagTrpc router into the DI container.
 * An optional FEATURE_FLAG_ADAPTER can be provided to delegate evaluation to an
 * external provider (LaunchDarkly, PostHog, Statsig, etc.).
 */

import { Module } from '../di';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagTrpc } from './feature-flag.trpc';

@Module({
  providers: [
    FeatureFlagService,
    FeatureFlagTrpc,
  ],
  trpcRouters: {
    featureFlag: FeatureFlagTrpc,
  },
})
export class FeatureFlagModule {}
