import { Injectable, Inject } from '@cruzjs/core/di';
import { JobService } from '@cruzjs/core/jobs/job.service';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { count, isNotNull, sql } from 'drizzle-orm';
import { authIdentity } from '@cruzjs/core/database/schema';
import { organizations } from '@cruzjs/core/database/schema';
import { subscriptions } from '../database/schema';

/**
 * Admin dashboard metrics
 */
export type DashboardMetrics = {
  users: {
    total: number;
    active: number;
    verified: number;
  };
  subscriptions: {
    total: number;
    byPlan: Record<string, number>;
    active: number;
    trialing: number;
    canceled: number;
  };
  revenue: {
    mrr: number; // Monthly Recurring Revenue (in cents)
    arr: number; // Annual Recurring Revenue (in cents)
  };
  jobs: {
    pending: number;
    processing: number;
    failed: number;
    completed: number;
  };
  organizations: {
    total: number;
    withSubscription: number;
  };
};

/**
 * Admin dashboard service
 */
@Injectable()
export class AdminDashboardService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(JobService) private readonly jobService: JobService
  ) {}

  /**
   * Get dashboard metrics
   */
  async getMetrics(): Promise<DashboardMetrics> {
    // Get user metrics (from authIdentity)
    const [totalUsersResult, verifiedUsersResult] = await Promise.all([
      this.db.select({ count: count() }).from(authIdentity),
      this.db.select({ count: count() }).from(authIdentity).where(isNotNull(authIdentity.emailVerified)),
    ]);

    const totalUsers = totalUsersResult[0]?.count || 0;
    const verifiedUsers = verifiedUsersResult[0]?.count || 0;

    // Get subscription metrics
    const subscriptionsData = await this.db
      .select({
        status: subscriptions.status,
        stripePriceId: subscriptions.stripePriceId,
      })
      .from(subscriptions);

    const subscriptionByPlan: Record<string, number> = {};
    let activeSubscriptions = 0;
    let trialingSubscriptions = 0;
    let canceledSubscriptions = 0;

    subscriptionsData.forEach((sub) => {
      const planId = sub.stripePriceId || 'unknown';
      subscriptionByPlan[planId] = (subscriptionByPlan[planId] || 0) + 1;

      if (sub.status === 'ACTIVE') {
        activeSubscriptions++;
      } else if (sub.status === 'TRIALING') {
        trialingSubscriptions++;
      } else if (sub.status === 'CANCELED') {
        canceledSubscriptions++;
      }
    });

    // Calculate revenue (placeholder - would need to fetch from Stripe or store in DB)
    // For now, estimate based on plan counts
    const mrr = 0; // TODO: Calculate from actual subscription prices
    const arr = mrr * 12;

    // Get job metrics
    const jobCounts = await this.jobService.getJobCounts();
    const jobMetrics = {
      pending: jobCounts.pending,
      processing: jobCounts.processing,
      failed: jobCounts.failed,
      completed: jobCounts.completed,
    };

    // Get organization metrics
    const [totalOrgsResult, orgsWithSubscriptionResult] = await Promise.all([
      this.db.select({ count: count() }).from(organizations),
      this.db
        .select({ count: count() })
        .from(organizations)
        .innerJoin(subscriptions, sql`${organizations.id} = ${subscriptions.orgId}`),
    ]);

    const totalOrgs = totalOrgsResult[0]?.count || 0;
    const orgsWithSubscription = orgsWithSubscriptionResult[0]?.count || 0;

    return {
      users: {
        total: totalUsers,
        active: totalUsers, // TODO: Add active status tracking
        verified: verifiedUsers,
      },
      subscriptions: {
        total: subscriptionsData.length,
        byPlan: subscriptionByPlan,
        active: activeSubscriptions,
        trialing: trialingSubscriptions,
        canceled: canceledSubscriptions,
      },
      revenue: {
        mrr,
        arr,
      },
      jobs: jobMetrics,
      organizations: {
        total: totalOrgs,
        withSubscription: orgsWithSubscription,
      },
    };
  }
}
