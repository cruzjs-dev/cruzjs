---
title: "10 — Billing"
description: Add free and pro plans with Stripe. Limit free orgs to 3 projects.
---

# Chapter 10 — Billing

Add a free/pro billing model: free orgs can have up to 3 projects, pro orgs get unlimited. Use `@cruzjs/saas` and Stripe.

## Install the billing package

```bash
npm install @cruzjs/saas
```

## Wire BillingModule

```typescript
// apps/web/src/app.server.ts
import { BillingModule } from '@cruzjs/saas';

export default createCruzApp({
  modules: [
    BillingModule,
    // ...
  ],
});
```

## Configure plans

Create `apps/web/src/billing.config.ts`:

```typescript
import { definePlans } from '@cruzjs/saas';

export const PLANS = definePlans({
  free: {
    name: 'Free',
    priceId: null,
    limits: {
      projects: 3,
    },
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    limits: {
      projects: Infinity,
    },
  },
});
```

## Enforce the project limit

In `TasksService.createProject`:

```typescript
async createProject(orgId: string, input: CreateProjectInput) {
  const [{ count }] = await this.db
    .select({ count: sql<number>`count(*)` })
    .from(projects)
    .where(eq(projects.orgId, orgId));

  const subscription = await this.billingService.getSubscription(orgId);
  const plan = subscription?.plan ?? 'free';
  const limit = PLANS[plan].limits.projects;

  if (count >= limit) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Free plan allows ${limit} projects. Upgrade to Pro for unlimited projects.`,
    });
  }

  // ... create project
}
```

## Add the billing UI

The upgrade flow is pre-built in `@cruzjs/saas`. Add the billing routes to your app:

```typescript
// apps/web/src/app.server.ts
import { BillingModule, BILLING_ROUTES } from '@cruzjs/saas';

export default createCruzApp({
  modules: [BillingModule],
  routes: [...BILLING_ROUTES],
});
```

Now `/billing` shows the current plan and an upgrade button. `/billing/success` is the Stripe redirect after payment.

## Configure Stripe

Add to `.dev.vars` (local) and `cruz secrets set` (production):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
```

The webhook handler is included in `BillingModule` — it listens for Stripe events and updates the org's subscription status in D1.

## Test the upgrade flow

1. Create 3 projects as a free org — they all work
2. Try to create a 4th — you get a "Upgrade to Pro" error
3. Click the upgrade button → Stripe Checkout
4. Use test card `4242 4242 4242 4242`, expiry `12/34`, CVC `123`
5. Payment completes → redirect to `/billing/success` → org is now pro
6. Create a 4th project — it works

## What we built

- Free/pro plan definitions with project limits
- Server-side limit enforcement in `createProject`
- Stripe checkout flow with pre-built billing pages

**Next:** [Chapter 11 — Deployment](/tutorial/11-deployment/)
