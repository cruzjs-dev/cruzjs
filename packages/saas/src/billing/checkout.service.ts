import { StripeService } from '../stripe/stripe.service';
import { injectable, inject } from 'inversify';
import { BillingService } from './billing.service';

/**
 * Checkout service for Stripe Checkout integration
 */
@injectable()
export class CheckoutService {
  constructor(
    @inject(BillingService) private readonly billingService: BillingService,
    @inject(StripeService) private readonly stripeService: StripeService
  ) {}

  /**
   * Create Stripe Checkout session
   * @param organizationId - Organization ID
   * @param planId - Plan ID
   * @param interval - Billing interval ('month' or 'year')
   * @param successUrl - URL to redirect after successful payment
   * @param cancelUrl - URL to redirect after canceled payment
   * @returns Checkout session URL
   */
  async createCheckoutSession(
    organizationId: string,
    planId: string,
    interval: 'month' | 'year',
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    const stripe = this.stripeService.getClient();

    const plan = await this.billingService.getPlan(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Get the appropriate Stripe price ID based on interval
    const stripePriceId = interval === 'year' 
      ? plan.yearlyStripePriceId 
      : plan.monthlyStripePriceId;

    if (!stripePriceId) {
      throw new Error(`Plan does not have a Stripe price ID for ${interval} interval`);
    }

    // Create or get Stripe customer
    const customer = await this.getOrCreateCustomer(organizationId);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId,
        planId,
        interval,
      },
    });

    return session.url || '';
  }

  /**
   * Get or create Stripe customer for organization
   */
  private async getOrCreateCustomer(organizationId: string): Promise<{ id: string }> {
    const stripe = this.stripeService.getClient();
    const subscription = await this.billingService.getSubscription(organizationId);

    if (subscription?.stripeCustomerId) {
      return await stripe.customers.retrieve(subscription.stripeCustomerId) as { id: string };
    }

    // Create new customer
    const customer = await stripe.customers.create({
      metadata: {
        organizationId,
      },
    });

    // Update subscription with customer ID
    if (subscription) {
      // TODO: Update subscription record
    }

    return customer;
  }
}
