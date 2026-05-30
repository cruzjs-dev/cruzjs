/**
 * AI Usage Tracker
 *
 * In-memory tracking of AI usage per org/provider.
 * Records input/output tokens, duration, and provider details
 * for monitoring and billing purposes.
 */

import { injectable } from 'inversify';
import { createToken } from '@cruzjs/core/di/tokens/create-token';

export type UsageRecord = {
  orgId?: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  timestamp: Date;
};

export type UsageSummary = {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalRequests: number;
};

@injectable()
export class AIUsageTracker {
  private records: UsageRecord[] = [];

  /**
   * Record a usage entry.
   */
  record(usage: UsageRecord): void {
    this.records.push(usage);
  }

  /**
   * Get aggregated token and request counts.
   * Optionally filter by orgId.
   */
  getSummary(orgId?: string): UsageSummary {
    const filtered = orgId
      ? this.records.filter(r => r.orgId === orgId)
      : this.records;

    return {
      totalInputTokens: filtered.reduce((sum, r) => sum + r.inputTokens, 0),
      totalOutputTokens: filtered.reduce((sum, r) => sum + r.outputTokens, 0),
      totalRequests: filtered.length,
    };
  }

  /**
   * Get raw usage records.
   * Optionally filter by orgId.
   */
  getRecords(orgId?: string): UsageRecord[] {
    if (orgId) {
      return this.records.filter(r => r.orgId === orgId);
    }
    return [...this.records];
  }

  /**
   * Clear all usage records.
   */
  clear(): void {
    this.records = [];
  }
}

export const AI_USAGE_TRACKER = createToken<AIUsageTracker>('AIUsageTracker');
