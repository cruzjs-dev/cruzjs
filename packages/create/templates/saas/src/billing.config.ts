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
