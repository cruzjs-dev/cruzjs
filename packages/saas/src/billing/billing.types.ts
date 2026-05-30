/**
 * Billing Types
 *
 * Core type definitions for the billing/subscription system.
 */

export const SubscriptionStatus = {
  ACTIVE: 'active',
  TRIALING: 'trialing',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  UNPAID: 'unpaid',
  INCOMPLETE: 'incomplete',
  PAUSED: 'paused',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const PlanInterval = {
  MONTH: 'month',
  YEAR: 'year',
} as const;
export type PlanInterval = (typeof PlanInterval)[keyof typeof PlanInterval];

export const PlanType = {
  FLAT: 'flat',
  PER_SEAT: 'per_seat',
  USAGE: 'usage',
} as const;
export type PlanType = (typeof PlanType)[keyof typeof PlanType];

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  stripePriceId: string;
  type: PlanType;
  amount: number; // in cents
  interval: PlanInterval;
  currency: string; // default: 'usd'
  trialDays: number;
  features: string[]; // marketing feature list
  limits: Record<string, number>; // e.g., { seats: 5, apiCalls: 10000 }
  active: boolean;
  sortOrder: number;
}

export interface Subscription {
  id: string;
  orgId: string;
  planId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
  quantity: number; // seats for per_seat plans
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  orgId: string;
  stripeInvoiceId: string;
  amount: number; // in cents
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  paidAt: Date | null;
  dueDate: Date | null;
  pdfUrl: string | null;
  hostedUrl: string | null;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}

export interface UsageRecord {
  id: string;
  orgId: string;
  subscriptionItemId: string;
  metric: string; // e.g., 'api_calls', 'storage_gb'
  quantity: number;
  timestamp: Date;
}

export const BILLING_ADAPTER = Symbol.for('BILLING_ADAPTER');
