import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PageShell } from './PageShell';
import type { PageShellTab } from './PageShell';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Layout/PageShell',
  component: PageShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Page-level layout shell with header, optional breadcrumbs, tab bar, actions slot, and responsive content area.',
      },
    },
  },
  argTypes: {
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
  },
  args: {
    title: 'Page Title',
    padding: 'md',
  },
} satisfies Meta<typeof PageShell>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Icons ───────────────────────────────────────────────────────────────────

const SettingsIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
    <path
      fillRule="evenodd"
      d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
      clipRule="evenodd"
    />
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
  </svg>
);

const CreditCardIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
  </svg>
);

// ─── Shared data ─────────────────────────────────────────────────────────────

const sampleTabs: PageShellTab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  { id: 'members', label: 'Members', icon: <UsersIcon /> },
  { id: 'billing', label: 'Billing', icon: <CreditCardIcon />, disabled: true },
];

const SampleContent = ({ text }: { text: string }) => (
  <div className="rounded-lg border border-dashed border-surface-border bg-surface-light p-8 text-center text-text-secondary text-sm">
    {text}
  </div>
);

// ─── Default ─────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: (args) => (
    <PageShell {...args}>
      <SampleContent text="Page content goes here" />
    </PageShell>
  ),
  args: {
    title: 'Dashboard',
    description: 'Welcome back. Here is an overview of your workspace.',
  },
};

// ─── WithBreadcrumbs ─────────────────────────────────────────────────────────

export const WithBreadcrumbs: Story = {
  render: (args) => (
    <PageShell {...args}>
      <SampleContent text="Content with breadcrumb navigation above the title" />
    </PageShell>
  ),
  args: {
    title: 'Project Settings',
    description: 'Configure your project preferences and integrations.',
    breadcrumbs: (
      <nav className="flex items-center gap-1.5 text-sm text-text-secondary">
        <a href="#" className="hover:text-primary">Home</a>
        <span>/</span>
        <a href="#" className="hover:text-primary">Projects</a>
        <span>/</span>
        <span className="text-text font-medium">Settings</span>
      </nav>
    ),
  },
};

// ─── WithTabs ────────────────────────────────────────────────────────────────

export const WithTabs: Story = {
  render: function WithTabsRender(args) {
    const [activeTab, setActiveTab] = useState('overview');
    return (
      <PageShell {...args} activeTab={activeTab} onTabChange={setActiveTab}>
        <SampleContent text={`Content for "${activeTab}" tab`} />
      </PageShell>
    );
  },
  args: {
    title: 'Organization',
    description: 'Manage your organization settings and members.',
    tabs: sampleTabs,
  },
};

// ─── WithActions ─────────────────────────────────────────────────────────────

export const WithActions: Story = {
  render: (args) => (
    <PageShell {...args}>
      <SampleContent text="Page content with action buttons in the header" />
    </PageShell>
  ),
  args: {
    title: 'Team Members',
    description: 'View and manage your team.',
    actions: (
      <div className="flex gap-2">
        <button
          type="button"
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-surface-border bg-surface text-text hover:bg-surface-light transition-colors"
        >
          Export
        </button>
        <button
          type="button"
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-white hover:opacity-90 transition-opacity"
        >
          Invite Member
        </button>
      </div>
    ),
  },
};

// ─── FullExample ─────────────────────────────────────────────────────────────

export const FullExample: Story = {
  render: function FullExampleRender(args) {
    const [activeTab, setActiveTab] = useState('overview');
    return (
      <PageShell {...args} activeTab={activeTab} onTabChange={setActiveTab}>
        <div className="space-y-4">
          <SampleContent text={`Active tab: ${activeTab}`} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SampleContent text="Card 1" />
            <SampleContent text="Card 2" />
            <SampleContent text="Card 3" />
          </div>
        </div>
      </PageShell>
    );
  },
  args: {
    title: 'Workspace Settings',
    description: 'Complete page shell with breadcrumbs, tabs, and actions.',
    breadcrumbs: (
      <nav className="flex items-center gap-1.5 text-sm text-text-secondary">
        <a href="#" className="hover:text-primary">Home</a>
        <span>/</span>
        <a href="#" className="hover:text-primary">Workspaces</a>
        <span>/</span>
        <span className="text-text font-medium">Settings</span>
      </nav>
    ),
    tabs: sampleTabs,
    actions: (
      <button
        type="button"
        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-white hover:opacity-90 transition-opacity"
      >
        Save Changes
      </button>
    ),
    padding: 'lg',
  },
};

// ─── Mobile ──────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: function MobileRender(args) {
    const [activeTab, setActiveTab] = useState('overview');
    return (
      <PageShell {...args} activeTab={activeTab} onTabChange={setActiveTab}>
        <div className="space-y-4">
          <SampleContent text={`Mobile view - active tab: ${activeTab}`} />
          <SampleContent text="Content stacks vertically on small screens" />
        </div>
      </PageShell>
    );
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  args: {
    title: 'Mobile Page',
    description: 'This demonstrates responsive stacking on mobile viewports.',
    tabs: sampleTabs,
    actions: (
      <button
        type="button"
        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-white hover:opacity-90 transition-opacity"
      >
        Action
      </button>
    ),
  },
};
