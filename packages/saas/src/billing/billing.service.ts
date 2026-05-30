/**
 * Billing Service
 *
 * Manages plans, subscriptions, invoices, usage metering, and entitlements.
 * Org-scoped: all queries filter by orgId.
 * Uses BillingAdapter (optional) for payment provider integration.
 */

import { Injectable, Inject, Optional } from '@cruzjs/core/di';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { ConfigService } from '@cruzjs/core/shared/config/config.service';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import {
  plans,
  billingCustomers,
  billingSubscriptions,
  billingInvoices,
  billingUsageRecords,
} from './billing.schema';
import type { BillingAdapter } from './billing.adapter';
import { BILLING_ADAPTER } from './billing.types';
import type {
  Plan,
  Subscription,
  Invoice,
  UsageRecord,
  SubscriptionStatus,
} from './billing.types';

@Injectable()
export class BillingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(BILLING_ADAPTER)
    @Optional()
    private readonly adapter?: BillingAdapter,
  ) {}

  // ── Plans ───────────────────────────────────────────────────────────

  async listPlans(): Promise<Plan[]> {
    const rows = await this.db
      .select()
      .from(plans)
      .where(eq(plans.active, true))
      .orderBy(plans.sortOrder);

    return rows.map(this.mapPlanRow);
  }

  async getPlan(planId: string): Promise<Plan | null> {
    const [row] = await this.db
      .select()
      .from(plans)
      .where(eq(plans.id, planId))
      .limit(1);

    return row ? this.mapPlanRow(row) : null;
  }

  // ── Checkout + Portal ───────────────────────────────────────────────

  async createCheckoutSession(
    orgId: string,
    planId: string,
    options: {
      quantity?: number;
      successUrl: string;
      cancelUrl: string;
    },
  ): Promise<{ url: string }> {
    this.requireAdapter();

    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const customer = await this.getOrCreateCustomer(orgId);

    const result = await this.adapter!.createCheckoutSession({
      customerId: customer.stripeCustomerId,
      priceId: plan.stripePriceId,
      quantity: options.quantity,
      trialDays: plan.trialDays > 0 ? plan.trialDays : undefined,
      successUrl: options.successUrl,
      cancelUrl: options.cancelUrl,
      metadata: { orgId, planId },
    });

    return { url: result.url };
  }

  async createPortalSession(
    orgId: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    this.requireAdapter();

    const customer = await this.getCustomer(orgId);
    if (!customer) {
      throw new Error('No billing customer found for organization');
    }

    return this.adapter!.createPortalSession(customer.stripeCustomerId, returnUrl);
  }

  // ── Subscription management ─────────────────────────────────────────

  async getSubscription(orgId: string): Promise<Subscription | null> {
    const [row] = await this.db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.orgId, orgId))
      .limit(1);

    return row ? this.mapSubscriptionRow(row) : null;
  }

  async cancelSubscription(orgId: string, atPeriodEnd = true): Promise<void> {
    const subscription = await this.getSubscription(orgId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    if (this.adapter) {
      await this.adapter.cancelSubscription(
        subscription.stripeSubscriptionId,
        atPeriodEnd,
      );
    }

    if (atPeriodEnd) {
      await this.db
        .update(billingSubscriptions)
        .set({
          cancelAtPeriodEnd: true,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(billingSubscriptions.orgId, orgId));
    } else {
      await this.db
        .update(billingSubscriptions)
        .set({
          status: 'canceled',
          cancelAtPeriodEnd: false,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(billingSubscriptions.orgId, orgId));
    }
  }

  async updateSeats(orgId: string, seats: number): Promise<void> {
    const subscription = await this.getSubscription(orgId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    if (this.adapter) {
      await this.adapter.updateSubscriptionQuantity(
        subscription.stripeSubscriptionId,
        seats,
      );
    }

    await this.db
      .update(billingSubscriptions)
      .set({
        quantity: seats,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(billingSubscriptions.orgId, orgId));
  }

  // ── Invoices ────────────────────────────────────────────────────────

  async getInvoices(orgId: string): Promise<Invoice[]> {
    const rows = await this.db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.orgId, orgId))
      .orderBy(desc(billingInvoices.createdAt));

    return rows.map(this.mapInvoiceRow);
  }

  // ── Usage metering ──────────────────────────────────────────────────

  async recordUsage(orgId: string, metric: string, quantity: number): Promise<void> {
    const subscription = await this.getSubscription(orgId);
    const now = new Date();

    // Record locally regardless of adapter
    await this.db.insert(billingUsageRecords).values({
      orgId,
      subscriptionItemId: subscription?.stripeSubscriptionId ?? 'local',
      metric,
      quantity,
      timestamp: now.toISOString(),
    });

    // Report to Stripe if adapter is available and subscription exists
    if (this.adapter && subscription?.stripeSubscriptionId) {
      try {
        await this.adapter.createUsageRecord(
          subscription.stripeSubscriptionId,
          quantity,
          now,
        );
      } catch {
        // Log but don't fail -- local record is the source of truth
      }
    }
  }

  async getUsage(
    orgId: string,
    metric: string,
    from: Date,
    to: Date,
  ): Promise<UsageRecord[]> {
    const rows = await this.db
      .select()
      .from(billingUsageRecords)
      .where(
        and(
          eq(billingUsageRecords.orgId, orgId),
          eq(billingUsageRecords.metric, metric),
          gte(billingUsageRecords.timestamp, from.toISOString()),
          lte(billingUsageRecords.timestamp, to.toISOString()),
        ),
      )
      .orderBy(desc(billingUsageRecords.timestamp));

    return rows.map((row) => ({
      id: row.id,
      orgId: row.orgId,
      subscriptionItemId: row.subscriptionItemId,
      metric: row.metric,
      quantity: row.quantity,
      timestamp: new Date(row.timestamp),
    }));
  }

  // ── Entitlements ────────────────────────────────────────────────────

  async hasFeature(orgId: string, feature: string): Promise<boolean> {
    const subscription = await this.getSubscription(orgId);
    if (!subscription) return false;

    const plan = await this.getPlan(subscription.planId);
    if (!plan) return false;

    return plan.features.includes(feature);
  }

  async withinLimit(orgId: string, metric: string, value: number): Promise<boolean> {
    const limits = await this.getLimits(orgId);
    const limit = limits[metric];
    if (limit === undefined) return true; // No limit means unlimited
    return value <= limit;
  }

  async getLimits(orgId: string): Promise<Record<string, number>> {
    const subscription = await this.getSubscription(orgId);
    if (!subscription) return {};

    const plan = await this.getPlan(subscription.planId);
    if (!plan) return {};

    return plan.limits;
  }

  // ── Webhook sync ────────────────────────────────────────────────────

  async syncSubscription(stripeSubscriptionId: string): Promise<void> {
    if (!this.adapter) return;

    const stripeData = await this.adapter.getSubscription(stripeSubscriptionId);
    if (!stripeData) return;

    const [existing] = await this.db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .limit(1);

    const now = new Date().toISOString();

    if (existing) {
      await this.db
        .update(billingSubscriptions)
        .set({
          status: stripeData.status ?? existing.status,
          currentPeriodStart: stripeData.currentPeriodStart?.toISOString() ?? existing.currentPeriodStart,
          currentPeriodEnd: stripeData.currentPeriodEnd?.toISOString() ?? existing.currentPeriodEnd,
          cancelAtPeriodEnd: stripeData.cancelAtPeriodEnd ?? existing.cancelAtPeriodEnd,
          trialEnd: stripeData.trialEnd?.toISOString() ?? existing.trialEnd,
          quantity: stripeData.quantity ?? existing.quantity,
          updatedAt: now,
        })
        .where(eq(billingSubscriptions.id, existing.id));
    }
    // If no existing record, it will be created during checkout completion
  }

  async syncInvoice(stripeInvoiceId: string): Promise<void> {
    // Fetch invoice from Stripe if adapter is available
    // For now, we rely on webhook data being passed via the webhook handler
    // This method is a hook for future Stripe API fetch-based sync
    const [existing] = await this.db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.stripeInvoiceId, stripeInvoiceId))
      .limit(1);

    if (!existing) {
      // Invoice will be created when the webhook event contains full data
      return;
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────

  private async getOrCreateCustomer(orgId: string): Promise<{ stripeCustomerId: string }> {
    const existing = await this.getCustomer(orgId);
    if (existing) return existing;

    this.requireAdapter();

    // Use a default email/name -- in production these come from the org
    const result = await this.adapter!.createCustomer(
      orgId,
      `billing+${orgId}@placeholder.local`,
      orgId,
    );

    await this.db.insert(billingCustomers).values({
      orgId,
      stripeCustomerId: result.customerId,
      email: `billing+${orgId}@placeholder.local`,
      name: orgId,
    });

    return { stripeCustomerId: result.customerId };
  }

  private async getCustomer(orgId: string): Promise<{ stripeCustomerId: string } | null> {
    const [row] = await this.db
      .select()
      .from(billingCustomers)
      .where(eq(billingCustomers.orgId, orgId))
      .limit(1);

    return row ? { stripeCustomerId: row.stripeCustomerId } : null;
  }

  private requireAdapter(): asserts this is { adapter: BillingAdapter } {
    if (!this.adapter) {
      throw new Error(
        'BillingAdapter is not configured. Bind BILLING_ADAPTER in your module.',
      );
    }
  }

  private mapPlanRow(row: typeof plans.$inferSelect): Plan {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      stripePriceId: row.stripePriceId,
      type: row.type as Plan['type'],
      amount: row.amount,
      interval: row.interval as Plan['interval'],
      currency: row.currency,
      trialDays: row.trialDays,
      features: this.parseJson<string[]>(row.features, []),
      limits: this.parseJson<Record<string, number>>(row.limits, {}),
      active: row.active,
      sortOrder: row.sortOrder,
    };
  }

  private mapSubscriptionRow(
    row: typeof billingSubscriptions.$inferSelect,
  ): Subscription {
    return {
      id: row.id,
      orgId: row.orgId,
      planId: row.planId,
      stripeSubscriptionId: row.stripeSubscriptionId,
      stripeCustomerId: row.stripeCustomerId,
      status: row.status as SubscriptionStatus,
      currentPeriodStart: new Date(row.currentPeriodStart),
      currentPeriodEnd: new Date(row.currentPeriodEnd),
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      trialEnd: row.trialEnd ? new Date(row.trialEnd) : null,
      quantity: row.quantity,
      metadata: this.parseJson<Record<string, unknown>>(row.metadata, {}),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  private mapInvoiceRow(
    row: typeof billingInvoices.$inferSelect,
  ): Invoice {
    return {
      id: row.id,
      orgId: row.orgId,
      stripeInvoiceId: row.stripeInvoiceId,
      amount: row.amount,
      currency: row.currency,
      status: row.status as Invoice['status'],
      paidAt: row.paidAt ? new Date(row.paidAt) : null,
      dueDate: row.dueDate ? new Date(row.dueDate) : null,
      pdfUrl: row.pdfUrl,
      hostedUrl: row.hostedUrl,
      periodStart: new Date(row.periodStart),
      periodEnd: new Date(row.periodEnd),
      createdAt: new Date(row.createdAt),
    };
  }

  private parseJson<T>(value: string, fallback: T): T {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
}
