import type { Meta, StoryObj } from '@storybook/react';
import { Banner } from './Banner';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Marketing/Banner',
  component: Banner,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Dismissible announcement banner for top or bottom of page. Supports info, success, warning, and primary color variants with optional icon, CTA action, and sticky positioning.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['info', 'success', 'warning', 'primary'] },
    position: { control: 'select', options: ['top', 'bottom'] },
    dismissible: { control: 'boolean' },
    sticky: { control: 'boolean' },
    compact: { control: 'boolean' },
  },
  args: {
    variant: 'info',
    position: 'top',
    dismissible: true,
    sticky: false,
    compact: false,
    children: 'We are launching new features this week. Stay tuned for updates!',
  },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const MegaphoneIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M13.92 3.845a19.361 19.361 0 01-6.3 1.98C6.765 5.942 5.89 6 5 6a4 4 0 00-.504 7.969 15.974 15.974 0 001.271 3.341.75.75 0 001.354-.065 13.48 13.48 0 001.024-3.167 19.39 19.39 0 005.775 1.767.75.75 0 00.357-1.456A17.89 17.89 0 019.77 12.9a17.89 17.89 0 014.508-1.512.75.75 0 00-.357-1.456A19.392 19.392 0 009.2 11.29V8.711a19.39 19.39 0 004.722-1.41.75.75 0 00-.002-1.456zM15.75 5a.75.75 0 01.75.75v8.5a.75.75 0 01-1.5 0v-8.5a.75.75 0 01.75-.75z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" />
  </svg>
);

// ─── Default ───────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── Success ───────────────────────────────────────────────────────────────────

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Your account has been verified successfully.',
    icon: <SparklesIcon />,
  },
  parameters: {
    docs: {
      description: { story: 'Success variant with a sparkles icon.' },
    },
  },
};

// ─── Warning ───────────────────────────────────────────────────────────────────

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Scheduled maintenance on June 1st from 2:00 AM to 4:00 AM UTC.',
  },
  parameters: {
    docs: {
      description: { story: 'Warning variant for maintenance or degraded-service notices.' },
    },
  },
};

// ─── Primary ───────────────────────────────────────────────────────────────────

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Version 2.0 is here! Check out the new dashboard.',
    icon: <MegaphoneIcon />,
  },
  parameters: {
    docs: {
      description: { story: 'Primary (bold) variant for major announcements.' },
    },
  },
};

// ─── WithAction ────────────────────────────────────────────────────────────────

export const WithAction: Story = {
  args: {
    variant: 'primary',
    children: 'Upgrade to Pro for advanced analytics and priority support.',
    icon: <SparklesIcon />,
    action: (
      <a
        href="#upgrade"
        className="inline-flex items-center rounded-md bg-surface/20 px-2.5 py-1 text-xs font-semibold text-current hover:bg-surface/30 transition-colors"
      >
        Upgrade now
      </a>
    ),
  },
  parameters: {
    docs: {
      description: { story: 'Banner with a call-to-action button/link in the action slot.' },
    },
  },
};

// ─── Compact ───────────────────────────────────────────────────────────────────

export const Compact: Story = {
  args: {
    compact: true,
    variant: 'info',
    children: 'Beta: This feature is experimental and may change.',
  },
  parameters: {
    docs: {
      description: { story: 'Compact size with reduced padding and smaller text.' },
    },
  },
};

// ─── Bottom ────────────────────────────────────────────────────────────────────

export const Bottom: Story = {
  render: () => (
    <div className="relative min-h-[300px] flex flex-col">
      <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
        Page content
      </div>
      <Banner variant="info" position="bottom" sticky dismissible>
        This banner sticks to the bottom of the page.
      </Banner>
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Banner pinned to the bottom of the viewport with sticky positioning.' },
    },
  },
};

// ─── Mobile ────────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Banner variant="primary" icon={<MegaphoneIcon />} dismissible>
        New features available! Tap to learn more.
      </Banner>
      <Banner variant="warning" compact dismissible>
        Maintenance window tonight at midnight.
      </Banner>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: { story: 'Banners rendered at mobile viewport width.' },
    },
  },
};
