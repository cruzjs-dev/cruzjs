/**
 * Stripe Billing Adapter
 *
 * Implements BillingAdapter using Stripe REST API via fetch.
 * No Stripe SDK -- fully CF Workers compatible.
 * All API calls use application/x-www-form-urlencoded format (Stripe's requirement).
 * Webhook verification via HMAC-SHA256 (Web Crypto API).
 */

import { Injectable, Inject } from '@cruzjs/core/di';
import { ConfigService } from '@cruzjs/core/shared/config/config.service';
import type { BillingAdapter } from '../billing.adapter';
import type { Subscription, SubscriptionStatus } from '../billing.types';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

@Injectable()
export class StripeBillingAdapter implements BillingAdapter {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  // ── Customer management ─────────────────────────────────────────────

  async createCustomer(
    orgId: string,
    email: string,
    name: string,
  ): Promise<{ customerId: string }> {
    const body = new URLSearchParams({
      email,
      name,
      'metadata[orgId]': orgId,
    });

    const data = await this.stripeRequest<{ id: string }>('POST', '/customers', body);
    return { customerId: data.id };
  }

  async getCustomer(
    customerId: string,
  ): Promise<{ email: string; name: string } | null> {
    try {
      const data = await this.stripeRequest<{
        email: string;
        name: string;
        deleted?: boolean;
      }>('GET', `/customers/${customerId}`);

      if (data.deleted) return null;
      return { email: data.email, name: data.name };
    } catch {
      return null;
    }
  }

  // ── Checkout ────────────────────────────────────────────────────────

  async createCheckoutSession(options: {
    customerId: string;
    priceId: string;
    quantity?: number;
    trialDays?: number;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<{ sessionId: string; url: string }> {
    const body = new URLSearchParams({
      customer: options.customerId,
      mode: 'subscription',
      'line_items[0][price]': options.priceId,
      'line_items[0][quantity]': String(options.quantity ?? 1),
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
    });

    if (options.trialDays && options.trialDays > 0) {
      body.set('subscription_data[trial_period_days]', String(options.trialDays));
    }

    if (options.metadata) {
      for (const [key, value] of Object.entries(options.metadata)) {
        body.set(`metadata[${key}]`, value);
      }
    }

    const data = await this.stripeRequest<{ id: string; url: string }>(
      'POST',
      '/checkout/sessions',
      body,
    );

    return { sessionId: data.id, url: data.url };
  }

  // ── Customer portal ─────────────────────────────────────────────────

  async createPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    const body = new URLSearchParams({
      customer: customerId,
      return_url: returnUrl,
    });

    const data = await this.stripeRequest<{ url: string }>(
      'POST',
      '/billing_portal/sessions',
      body,
    );

    return { url: data.url };
  }

  // ── Subscription management ─────────────────────────────────────────

  async cancelSubscription(
    subscriptionId: string,
    atPeriodEnd = true,
  ): Promise<void> {
    if (atPeriodEnd) {
      const body = new URLSearchParams({
        cancel_at_period_end: 'true',
      });
      await this.stripeRequest('POST', `/subscriptions/${subscriptionId}`, body);
    } else {
      await this.stripeRequest('DELETE', `/subscriptions/${subscriptionId}`);
    }
  }

  async updateSubscriptionQuantity(
    subscriptionId: string,
    quantity: number,
  ): Promise<void> {
    // Fetch subscription to get the first item ID
    const sub = await this.stripeRequest<{
      items: { data: Array<{ id: string }> };
    }>('GET', `/subscriptions/${subscriptionId}`);

    const itemId = sub.items?.data?.[0]?.id;
    if (!itemId) {
      throw new Error('Subscription has no items');
    }

    const body = new URLSearchParams({
      'items[0][id]': itemId,
      'items[0][quantity]': String(quantity),
    });

    await this.stripeRequest('POST', `/subscriptions/${subscriptionId}`, body);
  }

  async getSubscription(
    subscriptionId: string,
  ): Promise<Partial<Subscription> | null> {
    try {
      const data = await this.stripeRequest<{
        id: string;
        customer: string;
        status: string;
        current_period_start: number;
        current_period_end: number;
        cancel_at_period_end: boolean;
        trial_end: number | null;
        items: { data: Array<{ quantity: number }> };
        metadata: Record<string, string>;
      }>('GET', `/subscriptions/${subscriptionId}`);

      return {
        stripeSubscriptionId: data.id,
        stripeCustomerId: typeof data.customer === 'string' ? data.customer : '',
        status: data.status as SubscriptionStatus,
        currentPeriodStart: new Date(data.current_period_start * 1000),
        currentPeriodEnd: new Date(data.current_period_end * 1000),
        cancelAtPeriodEnd: data.cancel_at_period_end,
        trialEnd: data.trial_end ? new Date(data.trial_end * 1000) : null,
        quantity: data.items?.data?.[0]?.quantity ?? 1,
        metadata: data.metadata ?? {},
      };
    } catch {
      return null;
    }
  }

  // ── Usage metering ──────────────────────────────────────────────────

  async createUsageRecord(
    subscriptionItemId: string,
    quantity: number,
    timestamp: Date,
  ): Promise<void> {
    const body = new URLSearchParams({
      quantity: String(quantity),
      timestamp: String(Math.floor(timestamp.getTime() / 1000)),
      action: 'increment',
    });

    await this.stripeRequest(
      'POST',
      `/subscription_items/${subscriptionItemId}/usage_records`,
      body,
    );
  }

  // ── Webhook verification ────────────────────────────────────────────

  async verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    // Stripe signature header format: t=<timestamp>,v1=<signature>[,v0=<test-signature>]
    const parts = signature.split(',');
    const timestampPart = parts.find((p) => p.startsWith('t='));
    const signaturePart = parts.find((p) => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) return false;

    const timestamp = timestampPart.slice(2);
    const expectedSig = signaturePart.slice(3);

    // Check timestamp tolerance (5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || Math.abs(now - ts) > 300) return false;

    // Compute expected signature: HMAC-SHA256(secret, timestamp + '.' + payload)
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const computedSig = bufferToHex(sig);

    return timingSafeEqual(computedSig, expectedSig);
  }

  // ── Private helpers ─────────────────────────────────────────────────

  private get secretKey(): string {
    return this.config.getOrThrow<string>('STRIPE_SECRET_KEY');
  }

  private async stripeRequest<T>(
    method: string,
    path: string,
    body?: URLSearchParams,
  ): Promise<T> {
    const url = `${STRIPE_API_BASE}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.secretKey}`,
    };

    const init: RequestInit = { method, headers };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      init.body = body.toString();
    }

    const response = await fetch(url, init);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Stripe API error ${response.status}: ${errorBody}`,
      );
    }

    return response.json() as Promise<T>;
  }
}

// ── Crypto helpers ────────────────────────────────────────────────────

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
