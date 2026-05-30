/**
 * Billing Module
 *
 * Provides billing, subscription management, Stripe webhook handling,
 * and usage metering services.
 */

import { Module } from '@cruzjs/core/di';
import { BILLING_ADAPTER } from './billing.types';
import { BillingService } from './billing.service';
import { StripeBillingAdapter } from './adapters/stripe.adapter';
import { BillingWebhookApiRouter } from './billing.webhook.api-router';
import { BillingTrpc } from './billing.trpc';

@Module({
  providers: [
    BillingService,
    StripeBillingAdapter,
    BillingWebhookApiRouter,
    BillingTrpc,
    { provide: BILLING_ADAPTER, useClass: StripeBillingAdapter },
  ],
  trpcRouters: {
    billing: BillingTrpc,
  },
  apiRouters: [BillingWebhookApiRouter],
})
export class BillingModule {}
