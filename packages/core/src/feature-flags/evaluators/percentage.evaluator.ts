/**
 * Percentage Rollout Evaluator
 *
 * Uses consistent hashing so the same user always lands in the same bucket.
 * This ensures a user doesn't flip between enabled/disabled across requests.
 */

import type { FeatureFlag } from '../feature-flag.schema';
import type { FlagEvaluationContext, FlagEvaluationResult } from '../feature-flag.types';

/**
 * Simple string hash that produces a consistent integer.
 * Uses FNV-1a algorithm for good distribution and speed.
 */
function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0; // FNV prime, keep as unsigned 32-bit
  }
  return hash;
}

/**
 * Hash a userId + flagKey combination to a bucket between 0 and 99.
 * Same inputs always produce the same bucket.
 */
export function hashToBucket(userId: string, flagKey: string): number {
  const hash = fnv1aHash(`${userId}:${flagKey}`);
  return hash % 100;
}

export function evaluatePercentage(
  flag: FeatureFlag,
  context: FlagEvaluationContext,
): FlagEvaluationResult {
  const userId = context.userId;
  if (!userId) {
    // No user context — fall back to default
    return {
      enabled: flag.defaultValue,
      reason: 'default',
    };
  }

  const bucket = hashToBucket(userId, flag.key);
  const percentage = flag.rolloutPercentage ?? 0;
  const enabled = bucket < percentage;

  return {
    enabled,
    reason: 'percentage',
  };
}
