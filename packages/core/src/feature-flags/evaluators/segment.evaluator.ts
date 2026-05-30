/**
 * Segment Evaluator
 *
 * Evaluates segment conditions (eq, neq, in, notIn, gt, lt, contains)
 * against user/org attributes from the evaluation context.
 */

import type { FeatureFlagSegment } from '../feature-flag.schema';
import type { FlagEvaluationContext, FlagEvaluationResult } from '../feature-flag.types';

/**
 * Evaluate a single segment condition against the context.
 * Returns true if the condition matches.
 */
export function evaluateSegmentCondition(
  segment: FeatureFlagSegment,
  context: FlagEvaluationContext,
): boolean {
  let actualValue: string | number | boolean | undefined;

  switch (segment.segmentType) {
    case 'user':
      actualValue = context.userId;
      break;
    case 'org':
      actualValue = context.orgId;
      break;
    case 'attribute':
      actualValue = segment.attributeKey
        ? context.attributes?.[segment.attributeKey]
        : undefined;
      break;
    default:
      return false;
  }

  if (actualValue === undefined) {
    return false;
  }

  const targetValue = segment.attributeValue;
  const actualStr = String(actualValue);

  switch (segment.operator) {
    case 'eq':
      return actualStr === targetValue;

    case 'neq':
      return actualStr !== targetValue;

    case 'in': {
      // targetValue is a comma-separated list
      const values = targetValue.split(',').map((v) => v.trim());
      return values.includes(actualStr);
    }

    case 'notIn': {
      const values = targetValue.split(',').map((v) => v.trim());
      return !values.includes(actualStr);
    }

    case 'gt': {
      const numActual = Number(actualValue);
      const numTarget = Number(targetValue);
      if (isNaN(numActual) || isNaN(numTarget)) return false;
      return numActual > numTarget;
    }

    case 'lt': {
      const numActual = Number(actualValue);
      const numTarget = Number(targetValue);
      if (isNaN(numActual) || isNaN(numTarget)) return false;
      return numActual < numTarget;
    }

    case 'contains':
      return actualStr.includes(targetValue);

    default:
      return false;
  }
}

/**
 * Evaluate all segment conditions for a flag.
 * Returns enabled: true if ANY segment matches (OR logic).
 */
export function evaluateSegments(
  segments: FeatureFlagSegment[],
  context: FlagEvaluationContext,
): FlagEvaluationResult {
  if (segments.length === 0) {
    return { enabled: false, reason: 'segment' };
  }

  const matched = segments.some((segment) =>
    evaluateSegmentCondition(segment, context),
  );

  return {
    enabled: matched,
    reason: 'segment',
  };
}
