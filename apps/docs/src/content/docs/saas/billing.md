---
title: Billing
description: Stripe integration via BillingService for subscription management, payment processing, webhook handling, and the customer portal.
---

`@cruzjs/saas` includes Stripe integration for subscription billing at the organization level. The `BillingService` manages plans and subscriptions, while the `WebhookService` processes Stripe events to keep your database in sync.

## Configuration

Set the following environment variables:

```env
# Stripe secret key (starts with sk_test_ or sk_live_)
STRIPE_SECRET_KEY=sk_test_xxx

# Stripe webhook signing secret (starts with whsec_)
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

In `cruz.config.ts`, define your billing plans:

```typescript
// apps/web/cruz.config.ts
export default defineConfig({
  billing: {
    defaultPlans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        interval: 'month',
        isUpgradeable: true,
        features: ['5 projects', '1 GB storage', 'Community support'],
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 2900, // $29.00 in cents
        interval: 'month',
        stripePriceId: 'price_xxx',
        isUpgradeable: true,
        features: ['Unlimited projects', '50 GB storage', 'Email support'],
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 9900, // $99.00 in cents
        interval: 'month',
        stripePriceId: 'price_yyy',
        isUpgradeable: false,
        features: ['Everything in Pro', '500 GB storage', 'Priority support', 'SSO'],
      },
    ],
    upgradeRules: {
      free: ['pro', 'enterprise'],
      pro: ['enterprise'],
    },
  },
});
```

## StripeService

The `StripeService` manages the Stripe client singleton:

```typescript
import { StripeService } from '@cruzjs/saas/stripe/stripe.service';

@injectable()
export class PaymentService {
  constructor(@inject(StripeService) private readonly stripe: StripeService) {}

  async createCustomer(email: string, orgId: string) {
    const client = this.stripe.getClient();
    return client.customers.create({
      email,
      metadata: { organizationId: orgId },
    });
  }
}
```

The Stripe client is lazily initialized on first access -- it reads `STRIPE_SECRET_KEY` from the ConfigService.

## BillingService

The `BillingService` provides subscription management:

### Listing Plans

```typescript
import { BillingService } from '@cruzjs/saas/billing/billing.service';

// Get all available plans
const plans = await billingService.getPlans();

// Get a specific plan
const proPlan = await billingService.getPlan('pro');

// Get plans the current plan can upgrade to
const upgrades = await billingService.getUpgradeablePlans('free');
// Returns: [proPlan, enterprisePlan]

// Check if a specific upgrade is allowed
const canUpgrade = await billingService.canUpgradeTo('free', 'enterprise');
// Returns: true
```

### Managing Subscriptions

```typescript
// Get subscription for an organization
const subscription = await billingService.getSubscription(orgId);
// Returns: {
//   id, organizationId, planId, status,
//   stripeSubscriptionId, stripeCustomerId,
//   currentPeriodStart, currentPeriodEnd,
//   cancelAtPeriodEnd, createdAt, updatedAt
// }

// Create a subscription
const newSub = await billingService.createSubscription({
  organizationId: orgId,
  planId: 'pro',
});

// Cancel at end of billing period
await billingService.cancelSubscription(subscription.id);
```

### Subscription Status

The subscription status tracks the Stripe lifecycle:

```typescript
type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired';
```

## Subscription Schema

```typescript
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';

const f = DrizzleUniversalFactory.create((b) => ({
  subscriptions: b.table('Subscription', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    stripeCustomerId: b.text('stripeCustomerId'),
    stripeSubscriptionId: b.text('stripeSubscriptionId').unique(),
    stripePriceId: b.text('stripePriceId'),
    status: b.text('status').notNull().default('active'),
    currentPeriodStart: b.timestamp('currentPeriodStart'),
    currentPeriodEnd: b.timestamp('currentPeriodEnd'),
    cancelAtPeriodEnd: b.boolean('cancelAtPeriodEnd').default(false),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(nowISO),
  }),
}));

export const { subscriptions } = f();
```

## Webhook Handling

The `WebhookService` processes Stripe webhook events to keep your database in sync:

```typescript
import { WebhookService } from '@cruzjs/saas/billing/webhook.service';

// In your webhook route handler
export async function action({ request }: ActionFunctionArgs) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  const container = await getAppContainer();
  const webhookService = container.get(WebhookService);

  try {
    await webhookService.processWebhook(payload, signature);
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook error', { status: 400 });
  }
}
```

### Handled Events

The webhook service processes these Stripe events:

| Event | Action |
|---|---|
| `checkout.session.completed` | Creates or updates subscription record |
| `customer.subscription.created` | Updates subscription status and period |
| `customer.subscription.updated` | Syncs status, period dates, and cancellation |
| `customer.subscription.deleted` | Marks subscription as `CANCELED` |
| `invoice.payment_succeeded` | Logs successful payment |
| `invoice.payment_failed` | Logs failed payment |

### Stripe Dashboard Webhook Configuration

In the Stripe Dashboard, create a webhook endpoint pointing to:

```
https://your-app.com/api/webhooks/stripe
```

Select these events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Copy the webhook signing secret to your `STRIPE_WEBHOOK_SECRET` environment variable.

## Checkout Flow

The typical checkout flow:

### 1. Create a Checkout Session

```typescript
export const billingRouter = router({
  createCheckout: orgProcedure
    .input(z.object({ planId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const stripe = ctx.container.get(StripeService).getClient();
      const plan = await ctx.container.get(BillingService).getPlan(input.planId);

      if (!plan || !plan.stripePriceId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found' });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          price: plan.stripePriceId,
          quantity: 1,
        }],
        metadata: {
          organizationId: ctx.org.orgId,
          planId: input.planId,
        },
        success_url: `${process.env.APP_URL}/orgs/${ctx.org.orgSlug}/billing?success=true`,
        cancel_url: `${process.env.APP_URL}/orgs/${ctx.org.orgSlug}/billing?canceled=true`,
      });

      return { url: session.url };
    }),
});
```

### 2. Redirect to Stripe

```typescript
function UpgradeButton({ planId }: { planId: string }) {
  const checkout = trpc.billing.createCheckout.useMutation();

  const handleUpgrade = async () => {
    const result = await checkout.mutateAsync({ planId });
    if (result.url) {
      window.location.href = result.url;
    }
  };

  return <button onClick={handleUpgrade}>Upgrade to Pro</button>;
}
```

### 3. Stripe Processes Payment

Stripe handles the payment form, 3D Secure, and card validation.

### 4. Webhook Updates Database

After payment, Stripe sends a `checkout.session.completed` webhook. The `WebhookService` creates the subscription record automatically.

## Customer Portal

Allow customers to manage their subscription (update payment method, cancel, view invoices) via Stripe's hosted Customer Portal:

```typescript
export const billingRouter = router({
  createPortalSession: orgProcedure.mutation(async ({ ctx }) => {
    const stripe = ctx.container.get(StripeService).getClient();
    const subscription = await ctx.container
      .get(BillingService)
      .getSubscription(ctx.org.orgId);

    if (!subscription?.stripeCustomerId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No subscription found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.APP_URL}/orgs/${ctx.org.orgSlug}/billing`,
    });

    return { url: session.url };
  }),
});
```

## Next Steps

- [Organizations](/pro/organizations) -- Org-level subscription management
- [Permissions](/pro/permissions) -- Gate features by subscription plan
- [Audit Logging](/pro/audit-logging) -- Track billing events
