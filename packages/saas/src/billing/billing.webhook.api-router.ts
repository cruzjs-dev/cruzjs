/**
 * Billing Webhook API Router
 *
 * Handles incoming Stripe webhook events.
 * Uses @ApiRouter for raw body access (tRPC would parse the body).
 * Verifies Stripe-Signature header, dispatches to BillingService, returns 200 immediately.
 */

import { Injectable, Inject } from '@cruzjs/core/di';
import { ApiRouter, Post, Req, HttpCode } from '@cruzjs/core/api/api.decorators';
import { ApiRouterBase } from '@cruzjs/core/api/api-router.base';
import { ConfigService } from '@cruzjs/core/shared/config/config.service';
import { BillingService } from './billing.service';
import type { BillingAdapter } from './billing.adapter';
import { BILLING_ADAPTER } from './billing.types';
import { billingInvoices, billingSubscriptions, billingCustomers, plans } from './billing.schema';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { eq } from 'drizzle-orm';

@ApiRouter('/api/billing/webhook')
@Injectable()
export class BillingWebhookApiRouter extends ApiRouterBase {
  @Inject(BillingService) private billingService!: BillingService;
  @Inject(BILLING_ADAPTER) private adapter!: BillingAdapter;
  @Inject(ConfigService) private config!: ConfigService;
  @Inject(DRIZZLE) private db!: DrizzleDatabase;

  @Post()
  @HttpCode(200)
  async handleWebhook(@Req() req: Request): Promise<Response> {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.text();
    const webhookSecret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');

    const verified = await this.adapter.verifyWebhookSignature(
      payload,
      signature,
      webhookSecret,
    );

    if (!verified) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let event: { type: string; data: { object: Record<string, unknown> } };
    try {
      event = JSON.parse(payload);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Dispatch event -- all processing is idempotent
    try {
      await this.handleEvent(event.type, event.data.object);
    } catch (error) {
      // Log but still return 200 to prevent Stripe retries for application errors
      console.error(`[BillingWebhook] Error handling ${event.type}:`, error);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleEvent(
    eventType: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    switch (eventType) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(data);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.billingService.syncSubscription(data.id as string);
        break;

      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaid(data);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(data);
        break;

      default:
        // Unhandled event type -- ignore
        break;
    }
  }

  private async handleCheckoutCompleted(
    session: Record<string, unknown>,
  ): Promise<void> {
    const metadata = session.metadata as Record<string, string> | undefined;
    const orgId = metadata?.orgId;
    const planId = metadata?.planId;

    if (!orgId || !planId) return;

    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    if (!subscriptionId || !customerId) return;

    // Ensure billing customer exists
    const [existingCustomer] = await this.db
      .select()
      .from(billingCustomers)
      .where(eq(billingCustomers.orgId, orgId))
      .limit(1);

    if (!existingCustomer) {
      await this.db.insert(billingCustomers).values({
        orgId,
        stripeCustomerId: customerId,
        email: (session.customer_email as string) ?? '',
        name: orgId,
      });
    }

    // Upsert subscription
    const [existingSub] = await this.db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.orgId, orgId))
      .limit(1);

    const now = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (existingSub) {
      await this.db
        .update(billingSubscriptions)
        .set({
          planId,
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId,
          status: 'active',
          updatedAt: now,
        })
        .where(eq(billingSubscriptions.id, existingSub.id));
    } else {
      await this.db.insert(billingSubscriptions).values({
        orgId,
        planId,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        quantity: 1,
      });
    }

    // Sync from Stripe for accurate period data
    await this.billingService.syncSubscription(subscriptionId);
  }

  private async handleInvoicePaid(
    invoice: Record<string, unknown>,
  ): Promise<void> {
    const stripeInvoiceId = invoice.id as string;
    if (!stripeInvoiceId) return;

    // Resolve orgId from subscription -> customer -> billingCustomer
    const subscriptionId = invoice.subscription as string;
    const customerId = invoice.customer as string;

    let orgId: string | null = null;

    if (customerId) {
      const [customer] = await this.db
        .select()
        .from(billingCustomers)
        .where(eq(billingCustomers.stripeCustomerId, customerId))
        .limit(1);
      orgId = customer?.orgId ?? null;
    }

    if (!orgId) return;

    // Upsert invoice
    const [existing] = await this.db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.stripeInvoiceId, stripeInvoiceId))
      .limit(1);

    const now = new Date().toISOString();
    const periodStart = invoice.period_start
      ? new Date((invoice.period_start as number) * 1000).toISOString()
      : now;
    const periodEnd = invoice.period_end
      ? new Date((invoice.period_end as number) * 1000).toISOString()
      : now;

    if (existing) {
      await this.db
        .update(billingInvoices)
        .set({
          status: 'paid',
          paidAt: now,
          amount: (invoice.amount_paid as number) ?? existing.amount,
          pdfUrl: (invoice.invoice_pdf as string) ?? existing.pdfUrl,
          hostedUrl: (invoice.hosted_invoice_url as string) ?? existing.hostedUrl,
        })
        .where(eq(billingInvoices.id, existing.id));
    } else {
      await this.db.insert(billingInvoices).values({
        orgId,
        stripeInvoiceId,
        amount: (invoice.amount_paid as number) ?? 0,
        currency: (invoice.currency as string) ?? 'usd',
        status: 'paid',
        paidAt: now,
        pdfUrl: (invoice.invoice_pdf as string) ?? null,
        hostedUrl: (invoice.hosted_invoice_url as string) ?? null,
        periodStart,
        periodEnd,
      });
    }
  }

  private async handleInvoicePaymentFailed(
    invoice: Record<string, unknown>,
  ): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    // Mark subscription as past_due
    await this.db
      .update(billingSubscriptions)
      .set({
        status: 'past_due',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(billingSubscriptions.stripeSubscriptionId, subscriptionId));
  }
}
