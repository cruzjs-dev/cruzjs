import type { Meta, StoryObj } from '@storybook/react';
import { AuthLayout } from './AuthLayout';

// --- Logo helpers for stories --------------------------------------------------

const BrandLogo: React.FC = () => (
  <div className="flex items-center gap-1 select-none">
    <span className="text-2xl font-bold text-text-strong tracking-tight">cruz</span>
    <span className="text-2xl font-bold text-primary tracking-tight">js</span>
  </div>
);

const IconLogo: React.FC = () => (
  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6h12" />
    </svg>
  </div>
);

// --- Mock form for stories -----------------------------------------------------

const MockLoginForm: React.FC = () => (
  <div className="flex flex-col gap-4">
    <div>
      <label className="block text-sm font-medium text-text-strong mb-1.5">Email</label>
      <input
        type="email"
        placeholder="you@example.com"
        className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-text-strong mb-1.5">Password</label>
      <input
        type="password"
        placeholder="Enter your password"
        className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
    <button
      type="button"
      className="w-full rounded-xl bg-primary text-white font-medium py-2.5 text-sm hover:bg-primary-dark transition-colors"
    >
      Sign in
    </button>
  </div>
);

// --- Meta ----------------------------------------------------------------------

const meta = {
  title: 'Layout/AuthLayout',
  component: AuthLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Centered card layout for authentication pages. Provides logo, title, subtitle, content, and footer slots with a subtle gradient background.',
      },
    },
  },
  argTypes: {
    maxWidth: { control: 'select', options: ['sm', 'md', 'lg'] },
    title: { control: 'text' },
    subtitle: { control: 'text' },
  },
  args: {
    title: 'Sign in',
    subtitle: 'Welcome back. Enter your credentials to continue.',
    maxWidth: 'md',
  },
} satisfies Meta<typeof AuthLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Default -------------------------------------------------------------------

export const Default: Story = {
  render: (args) => (
    <AuthLayout {...args}>
      <MockLoginForm />
    </AuthLayout>
  ),
};

// --- WithLogo ------------------------------------------------------------------

export const WithLogo: Story = {
  render: () => (
    <AuthLayout
      title="Sign in to your account"
      subtitle="Or start your 14-day free trial"
      logo={<BrandLogo />}
    >
      <MockLoginForm />
    </AuthLayout>
  ),
  parameters: {
    docs: {
      description: { story: 'Auth layout with a brand wordmark logo above the card.' },
    },
  },
};

// --- WithIconLogo --------------------------------------------------------------

export const WithIconLogo: Story = {
  render: () => (
    <AuthLayout
      title="Welcome back"
      subtitle="Enter your email and password to sign in."
      logo={<IconLogo />}
    >
      <MockLoginForm />
    </AuthLayout>
  ),
  parameters: {
    docs: {
      description: { story: 'Auth layout with an icon-based logo above the card.' },
    },
  },
};

// --- WithFooter ----------------------------------------------------------------

export const WithFooter: Story = {
  render: () => (
    <AuthLayout
      title="Create your account"
      subtitle="Get started in less than a minute."
      logo={<BrandLogo />}
      footer={
        <div className="flex flex-col items-center gap-2">
          <span>
            Already have an account?{' '}
            <a href="#" className="text-primary font-medium hover:underline">Sign in</a>
          </span>
          <div className="flex gap-3 text-xs text-text-tertiary">
            <a href="#" className="hover:text-text-muted transition-colors">Terms</a>
            <span>-</span>
            <a href="#" className="hover:text-text-muted transition-colors">Privacy</a>
          </div>
        </div>
      }
    >
      <MockLoginForm />
    </AuthLayout>
  ),
  parameters: {
    docs: {
      description: { story: 'Auth layout with footer links below the card.' },
    },
  },
};

// --- Sizes ---------------------------------------------------------------------

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-12">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <AuthLayout key={size} title={`maxWidth: ${size}`} subtitle="Subtitle text" maxWidth={size}>
          <div className="py-8 text-center text-sm text-text-muted">
            Content area ({size})
          </div>
        </AuthLayout>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'All three max-width variants side by side.' },
    },
  },
};

// --- Minimal -------------------------------------------------------------------

export const Minimal: Story = {
  render: () => (
    <AuthLayout>
      <div className="py-8 text-center text-sm text-text-muted">
        No title, no logo, no footer. Just the card.
      </div>
    </AuthLayout>
  ),
  parameters: {
    docs: {
      description: { story: 'Minimal usage with only children and no optional props.' },
    },
  },
};

// --- Mobile --------------------------------------------------------------------

export const Mobile: Story = {
  render: () => (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back."
      logo={<BrandLogo />}
      footer={<span className="text-xs">Copyright 2026</span>}
    >
      <MockLoginForm />
    </AuthLayout>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: { story: 'Auth layout at 375px mobile viewport width.' },
    },
  },
};
