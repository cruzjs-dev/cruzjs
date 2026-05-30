/**
 * Feature Flag Service
 *
 * Manages feature flags with database-backed evaluation.
 * Supports boolean, percentage rollout, and segment-based targeting.
 *
 * Evaluation order:
 * 1. Override (per-user or per-org)
 * 2. Segment match
 * 3. Percentage rollout
 * 4. Global enabled/disabled
 */

import { Injectable, Inject, Optional } from '../di';
import { DRIZZLE, type DrizzleDatabase } from '../shared/database/drizzle.service';
import { createToken } from '../di/tokens/create-token';
import { eq, and, isNull } from 'drizzle-orm';
import { featureFlags, featureFlagSegments, featureFlagOverrides } from './feature-flag.schema';
import type { FeatureFlag, FeatureFlagSegment } from './feature-flag.schema';
import type { FeatureFlagAdapter } from './feature-flag.adapter';
import type { FlagEvaluationContext, FlagEvaluationResult } from './feature-flag.types';
import type { CreateFlagInput, SegmentInput } from './feature-flag.validation';
import { evaluateBoolean } from './evaluators/boolean.evaluator';
import { evaluatePercentage } from './evaluators/percentage.evaluator';
import { evaluateSegments } from './evaluators/segment.evaluator';

/** DI token for injecting an external feature flag adapter */
export const FEATURE_FLAG_ADAPTER = createToken<FeatureFlagAdapter>('FEATURE_FLAG_ADAPTER');

@Injectable()
export class FeatureFlagService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(FEATURE_FLAG_ADAPTER) @Optional() private readonly adapter?: FeatureFlagAdapter,
  ) {}

  // ─── Evaluation ───────────────────────────────────────────────────────

  /**
   * Evaluate a single flag.
   * If an external adapter is bound, delegates to it; otherwise uses DB evaluation.
   */
  async evaluate(
    flagKey: string,
    context: FlagEvaluationContext,
    orgId: string,
  ): Promise<FlagEvaluationResult> {
    if (this.adapter) {
      return this.adapter.evaluate(flagKey, context);
    }

    const [flag] = await this.db
      .select()
      .from(featureFlags)
      .where(
        and(
          eq(featureFlags.orgId, orgId),
          eq(featureFlags.key, flagKey),
          isNull(featureFlags.deletedAt),
        ),
      )
      .limit(1);

    if (!flag) {
      return { enabled: false, reason: 'not_found' };
    }

    if (!flag.enabled) {
      return { enabled: false, reason: 'disabled' };
    }

    return this.evaluateFlag(flag, context);
  }

  /**
   * Evaluate all flags for the given org and context.
   */
  async evaluateAll(
    context: FlagEvaluationContext,
    orgId: string,
  ): Promise<Record<string, FlagEvaluationResult>> {
    if (this.adapter) {
      return this.adapter.evaluateAll(context);
    }

    const flags = await this.db
      .select()
      .from(featureFlags)
      .where(
        and(
          eq(featureFlags.orgId, orgId),
          isNull(featureFlags.deletedAt),
        ),
      );

    const results: Record<string, FlagEvaluationResult> = {};
    for (const flag of flags) {
      if (!flag.enabled) {
        results[flag.key] = { enabled: false, reason: 'disabled' };
        continue;
      }
      results[flag.key] = await this.evaluateFlag(flag, context);
    }

    return results;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────

  /** List all non-deleted flags for an org */
  async list(orgId: string): Promise<FeatureFlag[]> {
    return this.db
      .select()
      .from(featureFlags)
      .where(
        and(
          eq(featureFlags.orgId, orgId),
          isNull(featureFlags.deletedAt),
        ),
      );
  }

  /** Create a new feature flag */
  async create(orgId: string, userId: string, input: CreateFlagInput): Promise<FeatureFlag> {
    const [flag] = await this.db
      .insert(featureFlags)
      .values({
        orgId,
        createdById: userId,
        key: input.key,
        name: input.name,
        description: input.description,
        type: input.type,
        enabled: input.enabled,
        rolloutPercentage: input.rolloutPercentage ?? 0,
        defaultValue: input.defaultValue,
      })
      .returning();
    return flag;
  }

  /** Update a feature flag */
  async update(
    orgId: string,
    flagId: string,
    input: Partial<Omit<CreateFlagInput, 'key'>>,
  ): Promise<FeatureFlag | null> {
    const [flag] = await this.db
      .update(featureFlags)
      .set({
        ...input,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(featureFlags.id, flagId),
          eq(featureFlags.orgId, orgId),
        ),
      )
      .returning();
    return flag ?? null;
  }

  /** Toggle a flag's enabled state */
  async toggle(orgId: string, flagId: string): Promise<FeatureFlag | null> {
    // Fetch current state
    const [existing] = await this.db
      .select()
      .from(featureFlags)
      .where(
        and(
          eq(featureFlags.id, flagId),
          eq(featureFlags.orgId, orgId),
          isNull(featureFlags.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) return null;

    const [flag] = await this.db
      .update(featureFlags)
      .set({
        enabled: !existing.enabled,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(featureFlags.id, flagId))
      .returning();

    return flag ?? null;
  }

  /** Set rollout percentage */
  async setRollout(orgId: string, flagId: string, percentage: number): Promise<FeatureFlag | null> {
    const [flag] = await this.db
      .update(featureFlags)
      .set({
        rolloutPercentage: percentage,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(featureFlags.id, flagId),
          eq(featureFlags.orgId, orgId),
        ),
      )
      .returning();
    return flag ?? null;
  }

  /** Soft-delete a flag */
  async delete(orgId: string, flagId: string): Promise<void> {
    await this.db
      .update(featureFlags)
      .set({ deletedAt: new Date().toISOString() })
      .where(
        and(
          eq(featureFlags.id, flagId),
          eq(featureFlags.orgId, orgId),
        ),
      );
  }

  // ─── Segments ─────────────────────────────────────────────────────────

  /** Replace all segments for a flag */
  async setSegments(
    orgId: string,
    flagId: string,
    segments: SegmentInput[],
  ): Promise<FeatureFlagSegment[]> {
    // Verify flag belongs to org
    const [flag] = await this.db
      .select()
      .from(featureFlags)
      .where(
        and(
          eq(featureFlags.id, flagId),
          eq(featureFlags.orgId, orgId),
        ),
      )
      .limit(1);

    if (!flag) return [];

    // Delete existing segments
    await this.db
      .delete(featureFlagSegments)
      .where(eq(featureFlagSegments.flagId, flagId));

    if (segments.length === 0) return [];

    // Insert new segments
    return this.db
      .insert(featureFlagSegments)
      .values(
        segments.map((s) => ({
          flagId,
          segmentType: s.segmentType,
          attributeKey: s.attributeKey,
          operator: s.operator,
          attributeValue: s.attributeValue,
        })),
      )
      .returning();
  }

  /** Remove a single segment */
  async removeSegment(orgId: string, flagId: string, segmentId: string): Promise<void> {
    // Verify flag belongs to org
    const [flag] = await this.db
      .select()
      .from(featureFlags)
      .where(
        and(
          eq(featureFlags.id, flagId),
          eq(featureFlags.orgId, orgId),
        ),
      )
      .limit(1);

    if (!flag) return;

    await this.db
      .delete(featureFlagSegments)
      .where(
        and(
          eq(featureFlagSegments.id, segmentId),
          eq(featureFlagSegments.flagId, flagId),
        ),
      );
  }

  // ─── Overrides ────────────────────────────────────────────────────────

  /** Set or update an override for a specific entity */
  async setOverride(
    flagId: string,
    entityType: 'user' | 'org',
    entityId: string,
    value: boolean,
    expiresAt?: string,
  ): Promise<void> {
    // Upsert: delete existing, then insert
    await this.db
      .delete(featureFlagOverrides)
      .where(
        and(
          eq(featureFlagOverrides.flagId, flagId),
          eq(featureFlagOverrides.entityType, entityType),
          eq(featureFlagOverrides.entityId, entityId),
        ),
      );

    await this.db.insert(featureFlagOverrides).values({
      flagId,
      entityType,
      entityId,
      value,
      expiresAt,
    });
  }

  // ─── Internal Evaluation ──────────────────────────────────────────────

  private async evaluateFlag(
    flag: FeatureFlag,
    context: FlagEvaluationContext,
  ): Promise<FlagEvaluationResult> {
    // 1. Check overrides (user override first, then org)
    const overrideResult = await this.checkOverrides(flag.id, context);
    if (overrideResult) return overrideResult;

    // 2. Segment evaluation
    if (flag.type === 'segment') {
      const segments = await this.db
        .select()
        .from(featureFlagSegments)
        .where(eq(featureFlagSegments.flagId, flag.id));

      if (segments.length > 0) {
        return evaluateSegments(segments, context);
      }
    }

    // 3. Percentage rollout
    if (flag.type === 'percentage') {
      return evaluatePercentage(flag, context);
    }

    // 4. Boolean (simple enabled check)
    return evaluateBoolean(flag);
  }

  private async checkOverrides(
    flagId: string,
    context: FlagEvaluationContext,
  ): Promise<FlagEvaluationResult | null> {
    // Check user override
    if (context.userId) {
      const [userOverride] = await this.db
        .select()
        .from(featureFlagOverrides)
        .where(
          and(
            eq(featureFlagOverrides.flagId, flagId),
            eq(featureFlagOverrides.entityType, 'user'),
            eq(featureFlagOverrides.entityId, context.userId),
          ),
        )
        .limit(1);

      if (userOverride) {
        // Check expiration
        if (userOverride.expiresAt && new Date(userOverride.expiresAt) < new Date()) {
          // Expired override — clean up and continue
          await this.db
            .delete(featureFlagOverrides)
            .where(eq(featureFlagOverrides.id, userOverride.id));
        } else {
          return { enabled: userOverride.value, reason: 'override' };
        }
      }
    }

    // Check org override
    if (context.orgId) {
      const [orgOverride] = await this.db
        .select()
        .from(featureFlagOverrides)
        .where(
          and(
            eq(featureFlagOverrides.flagId, flagId),
            eq(featureFlagOverrides.entityType, 'org'),
            eq(featureFlagOverrides.entityId, context.orgId),
          ),
        )
        .limit(1);

      if (orgOverride) {
        if (orgOverride.expiresAt && new Date(orgOverride.expiresAt) < new Date()) {
          await this.db
            .delete(featureFlagOverrides)
            .where(eq(featureFlagOverrides.id, orgOverride.id));
        } else {
          return { enabled: orgOverride.value, reason: 'override' };
        }
      }
    }

    return null;
  }
}
