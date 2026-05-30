/**
 * Feature Flag Adapter
 *
 * Interface for external feature flag providers (LaunchDarkly, PostHog, Statsig, etc.).
 * When bound in the DI container, the FeatureFlagService delegates evaluation to this adapter
 * instead of using the built-in database-backed evaluation.
 */

import type { FlagEvaluationContext, FlagEvaluationResult } from './feature-flag.types';

export interface FeatureFlagAdapter {
  /** Evaluate a single flag for the given context */
  evaluate(flagKey: string, context: FlagEvaluationContext): Promise<FlagEvaluationResult>;

  /** Evaluate all flags for the given context */
  evaluateAll(context: FlagEvaluationContext): Promise<Record<string, FlagEvaluationResult>>;
}
