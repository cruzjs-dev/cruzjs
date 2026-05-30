import { StripeService } from '../stripe/stripe.service';
import { injectable, inject } from 'inversify';
import { BillingService } from './billing.service';

/**
 * Customer portal service for Stripe Customer Portal
 */
@injectable()
export class CustomerPortalService {
  constructor(
    @inject(BillingService) private readonly billingService: BillingService,
    @inject(StripeService) private readonly stripeService: StripeService
  ) {}

  /**
   * Create customer portal session
   * @param organizationId - Organization ID
   * @param returnUrl - URL to return to after portal session
   * @returns Portal session URL
   */
  async createPortalSession(
    organizationId: string,
    returnUrl: string
  ): Promise<string> {
    const stripe = this.stripeService.getClient();
    const subscription = await this.billingService.getSubscription(organizationId);

    if (!subscription?.stripeCustomerId) {
      throw new Error('No Stripe customer found for organization');
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return session.url;
  }
}
