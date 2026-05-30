import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { MarketingNavbar } from './MarketingNavbar';
import type { MarketingNavbarItem } from './MarketingNavbar';

const navItems: MarketingNavbarItem[] = [
  { id: 'features', label: 'Features', href: '#features' },
  { id: 'pricing', label: 'Pricing', href: '#pricing' },
  { id: 'docs', label: 'Docs', href: '/docs' },
  { id: 'blog', label: 'Blog', href: '/blog' },
];

const BrandLogo = () => (
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-sm font-bold">
      A
    </div>
    <span className="text-lg font-bold text-text">Acme</span>
  </div>
);

const CTAButton = () => (
  <button
    type="button"
    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
  >
    Get Started
  </button>
);

const meta = {
  title: 'Marketing/MarketingNavbar',
  component: MarketingNavbar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Marketing / landing page navbar with transparent-to-solid scroll behavior, announcement bar, and mobile menu.',
      },
    },
  },
  argTypes: {
    transparent: { control: 'boolean' },
    scrollThreshold: { control: 'number' },
  },
  args: {
    transparent: false,
    scrollThreshold: 50,
  },
} satisfies Meta<typeof MarketingNavbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function DefaultMarketingNavbar(args) {
    const [activeId, setActiveId] = useState('features');
    return (
      <div>
        <MarketingNavbar
          {...args}
          brand={<BrandLogo />}
          items={navItems}
          activeId={activeId}
          onNavigate={setActiveId}
        />
        <div className="p-8">
          <h1 className="text-2xl font-bold text-text mb-4">Landing Page</h1>
          <p className="text-text-secondary">Default solid navbar.</p>
        </div>
      </div>
    );
  },
};

export const Transparent: Story = {
  render: function TransparentMarketingNavbar(args) {
    const [activeId, setActiveId] = useState('features');
    return (
      <div>
        <MarketingNavbar
          {...args}
          transparent
          brand={<BrandLogo />}
          items={navItems}
          activeId={activeId}
          onNavigate={setActiveId}
          cta={<CTAButton />}
        />
        <div className="bg-gradient-to-b from-primary to-primary-hover text-white p-16 text-center">
          <h1 className="text-4xl font-bold mb-4">Hero Section</h1>
          <p className="text-lg opacity-80">Scroll down to see the navbar transition.</p>
        </div>
        <div className="p-8 space-y-4">
          {Array.from({ length: 30 }, (_, i) => (
            <p key={i} className="text-text-secondary text-sm">
              Content paragraph {i + 1}. Scroll to see the navbar transition from transparent to solid.
            </p>
          ))}
        </div>
      </div>
    );
  },
};

export const WithAnnouncement: Story = {
  render: function WithAnnouncementMarketingNavbar(args) {
    const [activeId, setActiveId] = useState('features');
    return (
      <div>
        <MarketingNavbar
          {...args}
          brand={<BrandLogo />}
          items={navItems}
          activeId={activeId}
          onNavigate={setActiveId}
          cta={<CTAButton />}
          announcement={
            <span>
              We just launched v2.0! <a href="/blog/v2" className="underline font-medium">Read the announcement</a>
            </span>
          }
        />
        <div className="p-8">
          <h1 className="text-2xl font-bold text-text mb-4">With Announcement</h1>
          <p className="text-text-secondary">Announcement bar above the navbar.</p>
        </div>
      </div>
    );
  },
};

export const WithCTA: Story = {
  render: function WithCTAMarketingNavbar(args) {
    return (
      <div>
        <MarketingNavbar
          {...args}
          brand={<BrandLogo />}
          items={navItems}
          cta={
            <div className="flex items-center gap-3">
              <a href="/login" className="text-sm font-medium text-text-secondary hover:text-text transition-colors">
                Sign in
              </a>
              <CTAButton />
            </div>
          }
        />
        <div className="p-8">
          <h1 className="text-2xl font-bold text-text mb-4">With CTA</h1>
          <p className="text-text-secondary">CTA button slot on the right.</p>
        </div>
      </div>
    );
  },
};

export const ActiveItem: Story = {
  render: function ActiveItemMarketingNavbar(args) {
    return (
      <MarketingNavbar
        {...args}
        brand={<BrandLogo />}
        items={navItems}
        activeId="pricing"
        cta={<CTAButton />}
      />
    );
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  render: function MobileMarketingNavbar(args) {
    const [activeId, setActiveId] = useState('features');
    return (
      <MarketingNavbar
        {...args}
        brand={<BrandLogo />}
        items={navItems}
        activeId={activeId}
        onNavigate={setActiveId}
        cta={<CTAButton />}
      />
    );
  },
};
