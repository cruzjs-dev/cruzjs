import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PricingCards } from './PricingCards';
import type { PricingTier } from './PricingCards';

// ─── Tier fixtures ──────────────────────────────────────────────────────────

const freeTier: PricingTier = {
  id: 'free',
  name: 'Free',
  description: 'Perfect for side projects and experimentation.',
  price: '$0',
  priceUnit: '/mo',
  features: [
    { text: '1 project', included: true },
    { text: '100 API requests/day', included: true },
    { text: 'Community support', included: true },
    { text: 'Custom domains', included: false },
    { text: 'Analytics', included: false },
    { text: 'Priority support', included: false },
  ],
  ctaLabel: 'Get Started',
  ctaVariant: 'outline',
};

const proTier: PricingTier = {
  id: 'pro',
  name: 'Pro',
  description: 'For growing teams that need more power.',
  price: 29,
  priceUnit: '/mo',
  features: [
    { text: 'Unlimited projects', included: true },
    { text: '10,000 API requests/day', included: true },
    { text: 'Priority support', included: true },
    { text: 'Custom domains', included: true },
    { text: 'Analytics', included: true },
    { text: 'SSO', included: false },
  ],
  ctaLabel: 'Upgrade to Pro',
  ctaVariant: 'solid',
};

const enterpriseTier: PricingTier = {
  id: 'enterprise',
  name: 'Enterprise',
  description: 'For organizations with advanced needs.',
  price: 'Custom',
  features: [
    { text: 'Everything in Pro', included: true },
    { text: 'Unlimited API requests', included: true },
    { text: 'Dedicated support', included: true },
    { text: 'Custom integrations', included: true },
    { text: 'SSO & SCIM', included: true },
    { text: 'SLA guarantee', included: true },
  ],
  ctaLabel: 'Contact Sales',
  ctaVariant: 'outline',
};

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Data/PricingCards',
  component: PricingCards,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Plan tier pricing cards with feature checklists, CTA buttons, and popular badge. Zero domain coupling.',
      },
    },
  },
  argTypes: {
    columns: { control: 'select', options: [2, 3, 4] },
  },
  args: {
    tiers: [freeTier, proTier, enterpriseTier],
  },
} satisfies Meta<typeof PricingCards>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── WithPopular ────────────────────────────────────────────────────────────

export const WithPopular: Story = {
  render: () => (
    <PricingCards
      tiers={[
        freeTier,
        { ...proTier, popular: true, badge: 'Most Popular' },
        enterpriseTier,
      ]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Middle tier marked as popular with a badge and visual emphasis.',
      },
    },
  },
};

// ─── WithBillingToggle ──────────────────────────────────────────────────────

const BillingToggleStory: React.FC = () => {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const monthlyTiers: PricingTier[] = [freeTier, proTier, enterpriseTier];
  const yearlyTiers: PricingTier[] = [
    freeTier,
    { ...proTier, price: 24, originalPrice: '$29' },
    enterpriseTier,
  ];

  return (
    <PricingCards
      tiers={period === 'monthly' ? monthlyTiers : yearlyTiers}
      billingToggle={{
        monthly: 'Monthly',
        yearly: 'Yearly',
        active: period,
        onChange: setPeriod,
        discount: 'Save 20%',
      }}
    />
  );
};

export const WithBillingToggle: Story = {
  render: () => <BillingToggleStory />,
  parameters: {
    docs: {
      description: {
        story: 'Monthly/yearly toggle with discount badge. Prices update on toggle.',
      },
    },
  },
};

// ─── WithDiscount ───────────────────────────────────────────────────────────

export const WithDiscount: Story = {
  render: () => (
    <PricingCards
      tiers={[
        freeTier,
        {
          ...proTier,
          price: '$19',
          originalPrice: '$29',
          popular: true,
          badge: 'Best Value',
        },
        enterpriseTier,
      ]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Discount pricing with strikethrough original price.',
      },
    },
  },
};

// ─── TwoColumns ─────────────────────────────────────────────────────────────

export const TwoColumns: Story = {
  render: () => (
    <PricingCards
      tiers={[freeTier, { ...proTier, popular: true, badge: 'Recommended' }]}
      columns={2}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Two-tier layout for simple free/paid plans.',
      },
    },
  },
};

// ─── CurrentPlan ────────────────────────────────────────────────────────────

export const CurrentPlan: Story = {
  render: () => (
    <PricingCards
      tiers={[
        { ...freeTier, current: true },
        { ...proTier, popular: true, badge: 'Most Popular' },
        enterpriseTier,
      ]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Free tier marked as the current plan with a disabled CTA.',
      },
    },
  },
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="p-4">
      <PricingCards
        tiers={[
          freeTier,
          { ...proTier, popular: true, badge: 'Most Popular' },
          enterpriseTier,
        ]}
      />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'PricingCards at 375px mobile viewport width, stacked single column.',
      },
    },
  },
};
