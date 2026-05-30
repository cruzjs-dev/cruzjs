import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { injectable, inject } from 'inversify';
import { orgMembers } from '@cruzjs/core/database/schema';
import { uploads } from '@cruzjs/core/database/schema';
import { eq } from 'drizzle-orm';
import { BillingService } from './billing.service';
import { config } from '@cruzjs/core/shared/config';

export type UsageMetric = {
  name: string;
  value: number;
  limit?: number;
  unit: string;
};

export type UsageQuota = {
  metric: string;
  limit: number;
  used: number;
  remaining: number;
};

/**
 * Usage service for tracking and enforcing quotas
 */
@injectable()
export class UsageService {
  constructor(
    @inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @inject(BillingService) private readonly billingService: BillingService
  ) {}
  /**
   * Get usage metrics for organization
   */
  async getUsageMetrics(organizationId: string): Promise<UsageMetric[]> {
    const subscription = await this.billingService.getSubscription(organizationId);
    const planId = subscription?.planId || 'free';

    // Get organization member count
    const members = await this.db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.orgId, organizationId));
    const memberCount = members.length;

    // Get storage usage (sum of upload sizes) - based on orgId
    const orgUploads = await this.db
      .select()
      .from(uploads)
      .where(eq(uploads.orgId, organizationId));
    const storageUsed = orgUploads.reduce((total, upload) => total + (upload.size || 0), 0);

    // Define limits based on plan
    const limits = this.getPlanLimits(planId);

    return [
      {
        name: 'Team Members',
        value: memberCount,
        limit: limits.members,
        unit: 'members',
      },
      {
        name: 'Storage',
        value: storageUsed,
        limit: limits.storage,
        unit: 'bytes',
      },
    ];
  }

  /**
   * Get usage quotas for organization
   */
  async getUsageQuotas(organizationId: string): Promise<UsageQuota[]> {
    const metrics = await this.getUsageMetrics(organizationId);

    return metrics
      .filter((m) => m.limit !== undefined)
      .map((m) => ({
        metric: m.name,
        limit: m.limit!,
        used: m.value,
        remaining: Math.max(0, m.limit! - m.value),
      }));
  }

  /**
   * Check if organization has exceeded quota
   */
  async checkQuota(
    organizationId: string,
    metric: string,
    value: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    const quotas = await this.getUsageQuotas(organizationId);
    const quota = quotas.find((q) => q.metric === metric);

    if (!quota) {
      // No limit for this metric
      return { allowed: true, remaining: Infinity };
    }

    const remaining = quota.remaining - value;
    return {
      allowed: remaining >= 0,
      remaining: Math.max(0, remaining),
    };
  }

  /**
   * Get plan limits
   */
  private getPlanLimits(planId: string): { members: number; storage: number } {
    return config.usage.planLimits[planId] || config.usage.planLimits.free;
  }
}
