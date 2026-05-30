/**
 * Boolean Flag Evaluator
 *
 * Simple enabled/disabled check. Returns the flag's enabled state directly.
 */

import type { FeatureFlag } from '../feature-flag.schema';
import type { FlagEvaluationResult } from '../feature-flag.types';

export function evaluateBoolean(flag: FeatureFlag): FlagEvaluationResult {
  return {
    enabled: flag.enabled,
    reason: flag.enabled ? 'default' : 'disabled',
  };
}
