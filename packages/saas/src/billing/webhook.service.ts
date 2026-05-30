import { StripeService } from '../stripe/stripe.service';
import { ConfigService } from '@cruzjs/core/shared/config/config.service';
import { injectable, inject } from 'inversify';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { subscriptions } from '../database/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

/**
 * Webhook service for handling Stripe webhook events
 */
@injectable()
export class WebhookService {
  constructor(
    @inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @inject(ConfigService) private readonly configService: ConfigService,
    @inject(StripeService) private readonly stripeService: StripeService
  ) {}

  /**
   * Verify and process Stripe webhook event
   * @param payload - Raw webhook payload
   * @param signature - Webhook signature header
   * @returns Processed event
   */
  async processWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<Stripe.Event> {
    const stripe = this.stripeService.getClient();
    const webhookSecret = this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    // Process event based on type
    await this.handleEvent(event);

    return event;
  }

  /**
   * Handle Stripe webhook event
   */
  private async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[WebhookService] Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle checkout session completed
   */
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    const organizationId = session.metadata?.organizationId;
    const planId = session.metadata?.planId;

    if (!organizationId || !planId) {
      console.error('[WebhookService] Missing metadata in checkout session');
      return;
    }

    // Create or update subscription (Drizzle doesn't have upsert)
    const [existing] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.orgId, organizationId))
      .limit(1);

    let subscription;
    if (existing) {
      [subscription] = await this.db
        .update(subscriptions)
        .set({
          stripeSubscriptionId: session.subscription as string,
          stripeCustomerId: session.customer as string,
          status: 'ACTIVE',
        })
        .where(eq(subscriptions.orgId, organizationId))
        .returning();
    } else {
      const now = new Date();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      [subscription] = await this.db
        .insert(subscriptions)
        .values({
          orgId: organizationId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          status: 'active',
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: periodEnd.toISOString(),
          cancelAtPeriodEnd: false,
        })
        .returning();
    }

    console.log(`[WebhookService] Subscription created/updated: ${subscription.id}`);
  }

  /**
   * Handle subscription updated
   */
  private async handleSubscriptionUpdated(
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    const [subscription] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id))
      .limit(1);

    if (!subscription) {
      console.error(`[WebhookService] Subscription not found: ${stripeSubscription.id}`);
      return;
    }

    // Map Stripe status to our enum
    const statusMap: Record<string, 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED'> = {
      'active': 'ACTIVE',
      'trialing': 'TRIALING',
      'past_due': 'PAST_DUE',
      'canceled': 'CANCELED',
      'unpaid': 'UNPAID',
      'incomplete': 'INCOMPLETE',
      'incomplete_expired': 'INCOMPLETE_EXPIRED',
    };

    const stripeSub = stripeSubscription as Stripe.Subscription & {
      current_period_start: number;
      current_period_end: number;
      cancel_at_period_end: boolean;
    };
    await this.db
      .update(subscriptions)
      .set({
        status: statusMap[stripeSubscription.status] || 'active',
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(subscriptions.id, subscription.id));

    console.log(`[WebhookService] Subscription updated: ${subscription.id}`);
  }

  /**
   * Handle subscription deleted
   */
  private async handleSubscriptionDeleted(
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    const [subscription] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id))
      .limit(1);

    if (!subscription) {
      console.error(`[WebhookService] Subscription not found: ${stripeSubscription.id}`);
      return;
    }

    await this.db
      .update(subscriptions)
      .set({ status: 'CANCELED' })
      .where(eq(subscriptions.id, subscription.id));

    console.log(`[WebhookService] Subscription canceled: ${subscription.id}`);
  }

  /**
   * Handle payment succeeded
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const invoiceSubscription = (invoice as { subscription?: string | Stripe.Subscription | null }).subscription;
    const subscriptionId = typeof invoiceSubscription === 'string' 
      ? invoiceSubscription 
      : invoiceSubscription?.id;
    
    if (!subscriptionId) {
      return;
    }

    const [subscription] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
      .limit(1);

    if (subscription) {
      // Queue success email
      // TODO: Queue email job
      console.log(`[WebhookService] Payment succeeded for subscription: ${subscription.id}`);
    }
  }

  /**
   * Handle payment failed
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const invoiceSubscription = (invoice as { subscription?: string | Stripe.Subscription | null }).subscription;
    const subscriptionId = typeof invoiceSubscription === 'string' 
      ? invoiceSubscription 
      : invoiceSubscription?.id;
    
    if (!subscriptionId) {
      return;
    }

    const [subscription] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
      .limit(1);

    if (subscription) {
      // Queue failure email
      // TODO: Queue email job
      console.log(`[WebhookService] Payment failed for subscription: ${subscription.id}`);
    }
  }
}
