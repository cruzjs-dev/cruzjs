/**
 * Billing Adapter Interface
 *
 * Abstraction over payment provider APIs (Stripe, etc.).
 * Implementations must use fetch (no SDKs) for CF Workers compatibility.
 */

import type { Subscription } from './billing.types';

export interface BillingAdapter {
  // Customer management
  createCustomer(
    orgId: string,
    email: string,
    name: string,
  ): Promise<{ customerId: string }>;

  getCustomer(
    customerId: string,
  ): Promise<{ email: string; name: string } | null>;

  // Checkout
  createCheckoutSession(options: {
    customerId: string;
    priceId: string;
    quantity?: number;
    trialDays?: number;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<{ sessionId: string; url: string }>;

  // Customer portal
  createPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<{ url: string }>;

  // Subscription management
  cancelSubscription(
    subscriptionId: string,
    atPeriodEnd?: boolean,
  ): Promise<void>;

  updateSubscriptionQuantity(
    subscriptionId: string,
    quantity: number,
  ): Promise<void>;

  getSubscription(
    subscriptionId: string,
  ): Promise<Partial<Subscription> | null>;

  // Usage metering
  createUsageRecord(
    subscriptionItemId: string,
    quantity: number,
    timestamp: Date,
  ): Promise<void>;

  // Webhook verification
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): Promise<boolean>;
}
