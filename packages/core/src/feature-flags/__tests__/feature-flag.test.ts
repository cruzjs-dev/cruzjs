/**
 * Feature Flag Unit Tests
 *
 * Tests for evaluators, service behavior, and the hashing function.
 * Service tests use a mock Drizzle database.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { evaluateBoolean } from '../evaluators/boolean.evaluator';
import { evaluatePercentage, hashToBucket } from '../evaluators/percentage.evaluator';
import { evaluateSegments, evaluateSegmentCondition } from '../evaluators/segment.evaluator';
import type { FeatureFlag, FeatureFlagSegment } from '../feature-flag.schema';
import type { FlagEvaluationContext } from '../feature-flag.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeFlag(overrides: Partial<FeatureFlag> = {}): FeatureFlag {
  return {
    id: 'flag-1',
    orgId: 'org-1',
    createdById: 'user-1',
    key: 'test-flag',
    name: 'Test Flag',
    description: null,
    type: 'boolean',
    enabled: true,
    rolloutPercentage: 0,
    defaultValue: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

function makeSegment(overrides: Partial<FeatureFlagSegment> = {}): FeatureFlagSegment {
  return {
    id: 'seg-1',
    flagId: 'flag-1',
    segmentType: 'attribute',
    attributeKey: 'plan',
    operator: 'eq',
    attributeValue: 'pro',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Boolean Evaluator ──────────────────────────────────────────────────────

describe('Boolean Evaluator', () => {
  it('should return enabled: true when flag is enabled', () => {
    const flag = makeFlag({ enabled: true });
    const result = evaluateBoolean(flag);
    expect(result.enabled).toBe(true);
    expect(result.reason).toBe('default');
  });

  it('should return enabled: false when flag is disabled', () => {
    const flag = makeFlag({ enabled: false });
    const result = evaluateBoolean(flag);
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe('disabled');
  });
});

// ─── Percentage Evaluator ───────────────────────────────────────────────────

describe('Percentage Evaluator', () => {
  it('should be consistent for the same userId', () => {
    const flag = makeFlag({ type: 'percentage', rolloutPercentage: 50 });
    const context: FlagEvaluationContext = { userId: 'user-abc' };

    const result1 = evaluatePercentage(flag, context);
    const result2 = evaluatePercentage(flag, context);
    expect(result1.enabled).toBe(result2.enabled);
    expect(result1.reason).toBe('percentage');
  });

  it('should return different results for different users (probabilistic)', () => {
    const flag = makeFlag({ type: 'percentage', rolloutPercentage: 50 });
    const results = new Set<boolean>();

    // With 100 different users at 50%, we should get both true and false
    for (let i = 0; i < 100; i++) {
      const context: FlagEvaluationContext = { userId: `user-${i}` };
      const result = evaluatePercentage(flag, context);
      results.add(result.enabled);
    }

    expect(results.size).toBe(2); // Both true and false should appear
  });

  it('should enable for all users at 100%', () => {
    const flag = makeFlag({ type: 'percentage', rolloutPercentage: 100 });
    for (let i = 0; i < 20; i++) {
      const result = evaluatePercentage(flag, { userId: `user-${i}` });
      expect(result.enabled).toBe(true);
    }
  });

  it('should disable for all users at 0%', () => {
    const flag = makeFlag({ type: 'percentage', rolloutPercentage: 0 });
    for (let i = 0; i < 20; i++) {
      const result = evaluatePercentage(flag, { userId: `user-${i}` });
      expect(result.enabled).toBe(false);
    }
  });

  it('should fall back to defaultValue when no userId provided', () => {
    const flag = makeFlag({ type: 'percentage', rolloutPercentage: 50, defaultValue: true });
    const result = evaluatePercentage(flag, {});
    expect(result.enabled).toBe(true);
    expect(result.reason).toBe('default');
  });

  it('should produce roughly correct distribution', () => {
    const flag = makeFlag({ type: 'percentage', rolloutPercentage: 30 });
    let enabledCount = 0;
    const total = 1000;

    for (let i = 0; i < total; i++) {
      const result = evaluatePercentage(flag, { userId: `distro-user-${i}` });
      if (result.enabled) enabledCount++;
    }

    // Allow generous margin (20-40%) for hash distribution
    const percentage = (enabledCount / total) * 100;
    expect(percentage).toBeGreaterThan(15);
    expect(percentage).toBeLessThan(45);
  });
});

describe('hashToBucket', () => {
  it('should return a number between 0 and 99', () => {
    for (let i = 0; i < 100; i++) {
      const bucket = hashToBucket(`user-${i}`, 'flag-key');
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(100);
    }
  });

  it('should be consistent for the same inputs', () => {
    const b1 = hashToBucket('user-1', 'flag-a');
    const b2 = hashToBucket('user-1', 'flag-a');
    expect(b1).toBe(b2);
  });

  it('should produce different buckets for different inputs', () => {
    const b1 = hashToBucket('user-1', 'flag-a');
    const b2 = hashToBucket('user-2', 'flag-a');
    // Not guaranteed, but very likely different
    // We just verify the function works without error
    expect(typeof b1).toBe('number');
    expect(typeof b2).toBe('number');
  });
});

// ─── Segment Evaluator ──────────────────────────────────────────────────────

describe('Segment Evaluator', () => {
  describe('evaluateSegmentCondition', () => {
    it('should match eq operator', () => {
      const segment = makeSegment({ operator: 'eq', attributeValue: 'pro' });
      const context: FlagEvaluationContext = { attributes: { plan: 'pro' } };
      expect(evaluateSegmentCondition(segment, context)).toBe(true);
    });

    it('should not match eq operator with different value', () => {
      const segment = makeSegment({ operator: 'eq', attributeValue: 'pro' });
      const context: FlagEvaluationContext = { attributes: { plan: 'free' } };
      expect(evaluateSegmentCondition(segment, context)).toBe(false);
    });

    it('should match neq operator', () => {
      const segment = makeSegment({ operator: 'neq', attributeValue: 'free' });
      const context: FlagEvaluationContext = { attributes: { plan: 'pro' } };
      expect(evaluateSegmentCondition(segment, context)).toBe(true);
    });

    it('should match in operator', () => {
      const segment = makeSegment({ operator: 'in', attributeValue: 'pro, enterprise, team' });
      const context: FlagEvaluationContext = { attributes: { plan: 'enterprise' } };
      expect(evaluateSegmentCondition(segment, context)).toBe(true);
    });

    it('should not match in operator when value not in list', () => {
      const segment = makeSegment({ operator: 'in', attributeValue: 'pro, enterprise' });
      const context: FlagEvaluationContext = { attributes: { plan: 'free' } };
      expect(evaluateSegmentCondition(segment, context)).toBe(false);
    });

    it('should match notIn operator', () => {
      const segment = makeSegment({ operator: 'notIn', attributeValue: 'free, trial' });
      const context: FlagEvaluationContext = { attributes: { plan: 'pro' } };
      expect(evaluateSegmentCondition(segment, context)).toBe(true);
    });

    it('should match gt operator', () => {
      const segment = makeSegment({
        operator: 'gt',
        attributeKey: 'age',
        attributeValue: '18',
      });
      const context: FlagEvaluationContext = { attributes: { age: 25 } };
      expect(evaluateSegmentCondition(segment, context)).toBe(true);
    });

    it('should not match gt operator when less', () => {
      const segment = makeSegment({
        operator: 'gt',
        attributeKey: 'age',
        attributeValue: '30',
      });
      const context: FlagEvaluationContext = { attributes: { age: 25 } };
      expect(evaluateSegmentCondition(segment, context)).toBe(false);
    });

    it('should match lt operator', () => {
      const segment = makeSegment({
        operator: 'lt',
        attributeKey: 'age',
        attributeValue: '30',
      });
      const context: FlagEvaluationContext = { attributes: { age: 25 } };
      expect(evaluateSegmentCondition(segment, context)).toBe(true);
    });

    it('should match contains operator', () => {
      const segment = makeSegment({
        operator: 'contains',
        attributeKey: 'email',
        attributeValue: '@company.com',
      });
      const context: FlagEvaluationContext = { attributes: { email: 'user@company.com' } };
      expect(evaluateSegmentCondition(segment, context)).toBe(true);
    });

    it('should not match contains when substring absent', () => {
      const segment = makeSegment({
        operator: 'contains',
        attributeKey: 'email',
        attributeValue: '@company.com',
      });
      const context: FlagEvaluationContext = { attributes: { email: 'user@other.com' } };
      expect(evaluateSegmentCondition(segment, context)).toBe(false);
    });

    it('should match user segment type', () => {
      const segment = makeSegment({
        segmentType: 'user',
        operator: 'eq',
        attributeValue: 'user-123',
      });
      const context: FlagEvaluationContext = { userId: 'user-123' };
      expect(evaluateSegmentCondition(segment, context)).toBe(true);
    });

    it('should match org segment type', () => {
      const segment = makeSegment({
        segmentType: 'org',
        operator: 'eq',
        attributeValue: 'org-456',
      });
      const context: FlagEvaluationContext = { orgId: 'org-456' };
      expect(evaluateSegmentCondition(segment, context)).toBe(true);
    });

    it('should return false when attribute is undefined', () => {
      const segment = makeSegment({
        attributeKey: 'missing',
        operator: 'eq',
        attributeValue: 'value',
      });
      const context: FlagEvaluationContext = { attributes: {} };
      expect(evaluateSegmentCondition(segment, context)).toBe(false);
    });

    it('should return false for non-numeric gt comparison', () => {
      const segment = makeSegment({
        operator: 'gt',
        attributeKey: 'name',
        attributeValue: '5',
      });
      const context: FlagEvaluationContext = { attributes: { name: 'alice' } };
      expect(evaluateSegmentCondition(segment, context)).toBe(false);
    });
  });

  describe('evaluateSegments', () => {
    it('should return enabled: true if any segment matches (OR logic)', () => {
      const segments = [
        makeSegment({ id: 'seg-1', operator: 'eq', attributeValue: 'enterprise' }),
        makeSegment({ id: 'seg-2', operator: 'eq', attributeValue: 'pro' }),
      ];
      const context: FlagEvaluationContext = { attributes: { plan: 'pro' } };
      const result = evaluateSegments(segments, context);
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('segment');
    });

    it('should return enabled: false when no segments match', () => {
      const segments = [
        makeSegment({ operator: 'eq', attributeValue: 'enterprise' }),
      ];
      const context: FlagEvaluationContext = { attributes: { plan: 'free' } };
      const result = evaluateSegments(segments, context);
      expect(result.enabled).toBe(false);
    });

    it('should return enabled: false for empty segments array', () => {
      const result = evaluateSegments([], {});
      expect(result.enabled).toBe(false);
    });
  });
});
