import { describe, it, expect, beforeEach } from 'vitest';
import 'reflect-metadata';
import { AIUsageTracker } from '../usage-tracker';
import type { UsageRecord } from '../usage-tracker';

function createRecord(overrides: Partial<UsageRecord> = {}): UsageRecord {
  return {
    provider: 'openai',
    model: 'gpt-4o-mini',
    inputTokens: 100,
    outputTokens: 50,
    durationMs: 500,
    timestamp: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  };
}

describe('AIUsageTracker', () => {
  let tracker: AIUsageTracker;

  beforeEach(() => {
    tracker = new AIUsageTracker();
  });

  describe('record()', () => {
    it('adds an entry', () => {
      const usage = createRecord();
      tracker.record(usage);

      const records = tracker.getRecords();
      expect(records).toHaveLength(1);
      expect(records[0]).toEqual(usage);
    });

    it('adds multiple entries', () => {
      tracker.record(createRecord({ inputTokens: 100 }));
      tracker.record(createRecord({ inputTokens: 200 }));
      tracker.record(createRecord({ inputTokens: 300 }));

      expect(tracker.getRecords()).toHaveLength(3);
    });
  });

  describe('getSummary()', () => {
    it('aggregates tokens across all records', () => {
      tracker.record(createRecord({ inputTokens: 100, outputTokens: 50 }));
      tracker.record(createRecord({ inputTokens: 200, outputTokens: 75 }));
      tracker.record(createRecord({ inputTokens: 300, outputTokens: 25 }));

      const summary = tracker.getSummary();

      expect(summary.totalInputTokens).toBe(600);
      expect(summary.totalOutputTokens).toBe(150);
      expect(summary.totalRequests).toBe(3);
    });

    it('filters by orgId when provided', () => {
      tracker.record(createRecord({ orgId: 'org-1', inputTokens: 100, outputTokens: 10 }));
      tracker.record(createRecord({ orgId: 'org-2', inputTokens: 200, outputTokens: 20 }));
      tracker.record(createRecord({ orgId: 'org-1', inputTokens: 300, outputTokens: 30 }));

      const summary = tracker.getSummary('org-1');

      expect(summary.totalInputTokens).toBe(400);
      expect(summary.totalOutputTokens).toBe(40);
      expect(summary.totalRequests).toBe(2);
    });

    it('returns zeros when no records exist', () => {
      const summary = tracker.getSummary();

      expect(summary.totalInputTokens).toBe(0);
      expect(summary.totalOutputTokens).toBe(0);
      expect(summary.totalRequests).toBe(0);
    });

    it('returns zeros when orgId has no records', () => {
      tracker.record(createRecord({ orgId: 'org-1', inputTokens: 100 }));

      const summary = tracker.getSummary('org-nonexistent');

      expect(summary.totalInputTokens).toBe(0);
      expect(summary.totalOutputTokens).toBe(0);
      expect(summary.totalRequests).toBe(0);
    });
  });

  describe('getRecords()', () => {
    it('returns all records when no orgId provided', () => {
      tracker.record(createRecord({ orgId: 'org-1' }));
      tracker.record(createRecord({ orgId: 'org-2' }));
      tracker.record(createRecord()); // no orgId

      const records = tracker.getRecords();
      expect(records).toHaveLength(3);
    });

    it('filters by orgId when provided', () => {
      tracker.record(createRecord({ orgId: 'org-1', inputTokens: 100 }));
      tracker.record(createRecord({ orgId: 'org-2', inputTokens: 200 }));
      tracker.record(createRecord({ orgId: 'org-1', inputTokens: 300 }));

      const records = tracker.getRecords('org-1');
      expect(records).toHaveLength(2);
      expect(records.every(r => r.orgId === 'org-1')).toBe(true);
    });

    it('returns a copy that does not affect internal state', () => {
      tracker.record(createRecord());
      const records = tracker.getRecords();
      records.push(createRecord());

      // Internal records should still have only 1
      expect(tracker.getRecords()).toHaveLength(1);
    });
  });

  describe('clear()', () => {
    it('empties all records', () => {
      tracker.record(createRecord());
      tracker.record(createRecord());
      tracker.record(createRecord());
      expect(tracker.getRecords()).toHaveLength(3);

      tracker.clear();
      expect(tracker.getRecords()).toHaveLength(0);
    });

    it('resets summary to zeros', () => {
      tracker.record(createRecord({ inputTokens: 500, outputTokens: 200 }));
      tracker.clear();

      const summary = tracker.getSummary();
      expect(summary.totalInputTokens).toBe(0);
      expect(summary.totalOutputTokens).toBe(0);
      expect(summary.totalRequests).toBe(0);
    });
  });
});
