# Getting Started with Billing

This project includes Stripe billing via `@cruzjs/saas`.

## Setup (5 steps)

1. **Create a Stripe account** at https://stripe.com and grab your test API keys.

2. **Set environment variables** in `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRO_PRICE_ID=price_...
   ```

3. **Run the dev server**:
   ```bash
   cruz dev
   ```

4. **Test the upgrade flow** at `http://localhost:5000/billing`:
   - Click "Upgrade to Pro"
   - Use test card: `4242 4242 4242 4242`, expiry `12/34`, CVC `123`
   - You'll be redirected to `/billing/success`

5. **Deploy**:
   ```bash
   cruz secrets set --env production STRIPE_SECRET_KEY sk_live_...
   cruz secrets set --env production STRIPE_WEBHOOK_SECRET whsec_...
   cruz deploy production
   ```

## Enforcing plan limits

In your service:

```typescript
import { PLANS } from '../billing.config';

const subscription = await this.billingService.getSubscription(orgId);
const plan = subscription?.plan ?? 'free';
const limit = PLANS[plan].limits.projects;

if (currentCount >= limit) {
  throw new TRPCError({ code: 'FORBIDDEN', message: 'Upgrade to Pro for unlimited projects' });
}
```

## Webhook

The Stripe webhook is automatically handled by `BillingModule`. It listens at `/api/webhooks/stripe` and updates subscription status in D1.

In the Stripe dashboard, set your webhook endpoint to:
- Local: Use `stripe listen --forward-to localhost:5000/api/webhooks/stripe`
- Production: `https://your-app.pages.dev/api/webhooks/stripe`
