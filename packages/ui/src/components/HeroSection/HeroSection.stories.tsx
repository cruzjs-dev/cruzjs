import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { HeroSection } from './HeroSection';

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Marketing/HeroSection',
  component: HeroSection,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full-width marketing hero block with heading, subheading, CTA buttons, optional media, and background support.',
      },
    },
  },
  argTypes: {
    alignment: { control: 'select', options: ['center', 'left'] },
    padding: { control: 'select', options: ['md', 'lg', 'xl'] },
    fullHeight: { control: 'boolean' },
  },
} satisfies Meta<typeof HeroSection>;

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

const BadgePill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-1.5 bg-primary-subtle text-primary text-xs font-semibold rounded-full px-3 py-1">
    {children}
  </span>
);

const MockScreenshot: React.FC = () => (
  <div className="bg-surface-lighter rounded-xl ring-1 ring-surface-border/50 shadow-lg p-4 aspect-video flex items-center justify-center text-text-muted text-sm">
    App Screenshot
  </div>
);

// ─── Default (centered) ────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    heading: 'Build SaaS apps at lightning speed',
    subheading:
      'CruzJS gives you authentication, billing, teams, and more out of the box. Ship your next idea in days, not months.',
    actions: (
      <>
        <PrimaryButton>Get Started Free</PrimaryButton>
        <SecondaryButton>View Documentation</SecondaryButton>
      </>
    ),
  },
};

// ─── LeftAligned (with media) ───────────────────────────────────────────────

export const LeftAligned: Story = {
  args: {
    heading: 'The full-stack framework for Cloudflare',
    subheading:
      'React Router v7, tRPC, Drizzle ORM, and D1 all wired together. Deploy globally on Cloudflare Pages in minutes.',
    alignment: 'left',
    actions: (
      <>
        <PrimaryButton>Start Building</PrimaryButton>
        <SecondaryButton>Live Demo</SecondaryButton>
      </>
    ),
    media: <MockScreenshot />,
  },
  parameters: {
    docs: {
      description: {
        story: 'Left-aligned hero with a side media slot for screenshots or illustrations.',
      },
    },
  },
};

// ─── WithBadge ──────────────────────────────────────────────────────────────

export const WithBadge: Story = {
  args: {
    heading: 'Introducing CruzJS v2',
    subheading:
      'Multi-cloud adapters, background jobs, and a brand-new CLI. Everything you need to ship production SaaS.',
    badge: <BadgePill>New in v2.0</BadgePill>,
    actions: (
      <>
        <PrimaryButton>Upgrade Now</PrimaryButton>
        <SecondaryButton>Read Changelog</SecondaryButton>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Announcement badge above the heading to highlight new releases or promotions.',
      },
    },
  },
};

// ─── WithBackgroundImage ────────────────────────────────────────────────────

export const WithBackgroundImage: Story = {
  args: {
    heading: 'Deploy anywhere. Scale everywhere.',
    subheading: 'From Cloudflare to AWS to your own Docker host.',
    backgroundImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80',
    actions: <PrimaryButton>Get Started</PrimaryButton>,
  },
  parameters: {
    docs: {
      description: {
        story: 'Hero with a background image applied via inline styles.',
      },
    },
  },
};

// ─── FullHeight ─────────────────────────────────────────────────────────────

export const FullHeight: Story = {
  args: {
    heading: 'Ship your SaaS today',
    subheading:
      'Stop wasting months on boilerplate. CruzJS handles auth, billing, orgs, and permissions so you can focus on your product.',
    fullHeight: true,
    backgroundGradient:
      'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 8%, var(--color-surface)) 0%, var(--color-surface) 100%)',
    actions: (
      <>
        <PrimaryButton>Start Free Trial</PrimaryButton>
        <SecondaryButton>Watch Demo</SecondaryButton>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Full viewport-height hero with a subtle gradient background.',
      },
    },
  },
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  args: {
    heading: 'Build SaaS apps at lightning speed',
    subheading: 'Ship your next idea in days, not months.',
    alignment: 'left',
    actions: (
      <>
        <PrimaryButton>Get Started</PrimaryButton>
        <SecondaryButton>Learn More</SecondaryButton>
      </>
    ),
    media: <MockScreenshot />,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'HeroSection at 375px mobile viewport width. Content and media stack vertically.',
      },
    },
  },
};
