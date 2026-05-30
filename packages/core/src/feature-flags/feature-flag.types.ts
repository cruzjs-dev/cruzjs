/**
 * Feature Flag Types
 *
 * Core types for the feature flag evaluation system.
 */

/** Supported flag types */
export type FlagType = 'boolean' | 'percentage' | 'segment';

/** Operators for segment-based targeting rules */
export type SegmentOperator = 'eq' | 'neq' | 'in' | 'notIn' | 'gt' | 'lt' | 'contains';

/** Segment entity types */
export type SegmentType = 'user' | 'org' | 'attribute';

/** Override entity types */
export type OverrideEntityType = 'user' | 'org';

/** Context passed to flag evaluation */
export type FlagEvaluationContext = {
  userId?: string;
  orgId?: string;
  attributes?: Record<string, string | number | boolean>;
};

/** Result of evaluating a feature flag */
export type FlagEvaluationResult = {
  enabled: boolean;
  variant?: string;
  reason: 'default' | 'override' | 'percentage' | 'segment' | 'disabled' | 'not_found';
};
