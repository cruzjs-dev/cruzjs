import { injectable, inject } from 'inversify';
import Stripe from 'stripe';
import { ConfigService } from '@cruzjs/core/shared/config/config.service';

/**
 * Stripe service for managing Stripe client
 */
@injectable()
export class StripeService {
  private client: Stripe | null = null;

  constructor(@inject(ConfigService) private readonly configService: ConfigService) {}

  /**
   * Get or create Stripe client instance (singleton pattern)
   */
  getClient(): Stripe {
    if (this.client) {
      return this.client;
    }

    const secretKey = this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');

    // Use default API version for the installed Stripe package
    // This ensures compatibility without type casting
    this.client = new Stripe(secretKey, {
      typescript: true,
    });

    return this.client;
  }
}
