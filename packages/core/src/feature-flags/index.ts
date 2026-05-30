/**
 * @cruzjs/core Feature Flags
 *
 * Database-backed feature flags with boolean, percentage rollout,
 * and segment-based targeting. Supports external adapters for
 * LaunchDarkly, PostHog, Statsig, etc.
 */

// Types
export type {
  FlagType,
  SegmentOperator,
  SegmentType,
  OverrideEntityType,
  FlagEvaluationContext,
  FlagEvaluationResult,
} from './feature-flag.types';

// Adapter interface
export type { FeatureFlagAdapter } from './feature-flag.adapter';

// Schema
export {
  featureFlags,
  featureFlagSegments,
  featureFlagOverrides,
} from './feature-flag.schema';
export type {
  FeatureFlag,
  NewFeatureFlag,
  FeatureFlagSegment,
  NewFeatureFlagSegment,
  FeatureFlagOverride,
  NewFeatureFlagOverride,
} from './feature-flag.schema';

// Service
export { FeatureFlagService, FEATURE_FLAG_ADAPTER } from './feature-flag.service';

// tRPC Router
export { FeatureFlagTrpc } from './feature-flag.trpc';

// Validation
export {
  createFlagSchema,
  updateFlagSchema,
  setSegmentsSchema,
  setOverrideSchema,
  evaluateSchema,
  segmentSchema,
} from './feature-flag.validation';
export type {
  CreateFlagInput,
  UpdateFlagInput,
  SetSegmentsInput,
  SetOverrideInput,
  EvaluateInput,
  SegmentInput,
} from './feature-flag.validation';

// Evaluators
export { evaluateBoolean } from './evaluators/boolean.evaluator';
export { evaluatePercentage, hashToBucket } from './evaluators/percentage.evaluator';
export { evaluateSegments, evaluateSegmentCondition } from './evaluators/segment.evaluator';

// Module
export { FeatureFlagModule } from './feature-flag.module';
