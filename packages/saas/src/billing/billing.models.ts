/**
 * Billing Models (backward compatibility)
 *
 * Re-exports types from billing.types.ts.
 * New code should import from billing.types.ts directly.
 */

import { z } from 'zod';

// Legacy types -- preserved for backward compatibility
export type BillingPlan = {
  id: string;
  name: string;
  description: string;
  currency: string;
  features: string[];
  monthlyPrice: number;
  monthlyStripeProductId?: string;
  monthlyStripePriceId?: string;
  yearlyPrice: number;
  yearlyStripeProductId?: string;
  yearlyStripePriceId?: string;
  upgradeableFrom?: string[];
  isUpgradeable?: boolean;
};

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'unpaid'
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired';

export type Subscription = {
  id: string;
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateSubscriptionInput = {
  organizationId: string;
  planId: string;
  paymentMethodId?: string;
};

export type UpdateSubscriptionInput = {
  planId?: string;
  cancelAtPeriodEnd?: boolean;
};

export const createSubscriptionSchema = z.object({
  organizationId: z.string(),
  planId: z.string(),
  paymentMethodId: z.string().optional(),
});

export const updateSubscriptionSchema = z.object({
  planId: z.string().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});
