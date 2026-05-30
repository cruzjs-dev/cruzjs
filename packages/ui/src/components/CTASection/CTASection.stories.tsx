import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CTASection } from './CTASection';

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Marketing/CTASection',
  component: CTASection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Call-to-action banner section for marketing pages. Supports subtle, bold, and gradient background variants with optional background images.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['subtle', 'bold', 'gradient'] },
    alignment: { control: 'select', options: ['center', 'left'] },
  },
} satisfies Meta<typeof CTASection>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Shared elements ────────────────────────────────────────────────────────

const PrimaryButton: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <button
    type="button"
    className="bg-primary text-surface px-6 py-3 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
  >
    {children}
  </button>
);

const SecondaryButton: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <button
    type="button"
    className="ring-1 ring-surface-border text-text px-6 py-3 rounded-lg font-medium text-sm hover:bg-surface-lighter transition-colors"
  >
    {children}
  </button>
);

const BoldSecondaryButton: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <button
    type="button"
    className="ring-1 ring-white/30 text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-white/10 transition-colors"
  >
    {children}
  </button>
);

// ─── Default (subtle) ──────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    heading: 'Ready to build your next SaaS?',
    description:
      'Get started with CruzJS today and launch your product in days, not months. Free to start, no credit card required.',
    actions: (
      <>
        <PrimaryButton>Get Started Free</PrimaryButton>
        <SecondaryButton>View Documentation</SecondaryButton>
      </>
    ),
  },
};

// ─── Bold ──────────────────────────────────────────────────────────────────

export const Bold: Story = {
  args: {
    heading: 'Start building for free today',
    description:
      'Join thousands of developers shipping production SaaS applications with CruzJS.',
    variant: 'bold',
    actions: (
      <>
        <button
          type="button"
          className="bg-white text-primary px-6 py-3 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Create Account
        </button>
        <BoldSecondaryButton>Talk to Sales</BoldSecondaryButton>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Bold variant with the primary color as background and white text.',
      },
    },
  },
};

// ─── Gradient ──────────────────────────────────────────────────────────────

export const Gradient: Story = {
  args: {
    heading: 'Ship faster with CruzJS',
    description:
      'Auth, billing, teams, and permissions out of the box. Focus on what makes your product unique.',
    variant: 'gradient',
    actions: (
      <>
        <button
          type="button"
          className="bg-white text-primary px-6 py-3 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Get Started
        </button>
        <BoldSecondaryButton>Learn More</BoldSecondaryButton>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Gradient background variant using the primary color.',
      },
    },
  },
};

// ─── LeftAligned ────────────────────────────────────────────────────────────

export const LeftAligned: Story = {
  args: {
    heading: 'Deploy anywhere. Scale everywhere.',
    description:
      'From Cloudflare to AWS to your own Docker host. CruzJS adapts to your infrastructure.',
    alignment: 'left',
    actions: (
      <>
        <PrimaryButton>Start Building</PrimaryButton>
        <SecondaryButton>See Pricing</SecondaryButton>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Left-aligned variant for asymmetric layouts.',
      },
    },
  },
};

// ─── WithBackgroundImage ────────────────────────────────────────────────────

export const WithBackgroundImage: Story = {
  args: {
    heading: 'Join the community',
    description: 'Connect with other developers building on CruzJS.',
    backgroundImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80',
    actions: <PrimaryButton>Join Discord</PrimaryButton>,
  },
  parameters: {
    docs: {
      description: {
        story: 'CTA section with a background image applied via inline styles.',
      },
    },
  },
};

// ─── Mobile ────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  args: {
    heading: 'Ready to get started?',
    description: 'Create your free account and start building today.',
    actions: (
      <>
        <PrimaryButton>Sign Up</PrimaryButton>
        <SecondaryButton>Learn More</SecondaryButton>
      </>
    ),
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'CTASection at 375px mobile viewport width with responsive padding.',
      },
    },
  },
};
