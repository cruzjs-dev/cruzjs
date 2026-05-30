import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SettingsLayout } from './SettingsLayout';
import type { SettingsNavGroup } from './SettingsLayout';

// --- Icon helpers for stories ----------------------------------------------------

const UserIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SettingsIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const LockIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ShieldIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const MonitorIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const CreditCardIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const FileTextIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

// --- Mock content for stories ----------------------------------------------------

const MockContent: React.FC<{ section: string }> = ({ section }) => (
  <div className="space-y-4">
    <h2 className="text-xl font-semibold text-text">{section}</h2>
    <p className="text-sm text-text-secondary">
      This is the content area for the {section.toLowerCase()} settings section.
      Configure your preferences here.
    </p>
    <div className="rounded-lg border border-surface-border p-4">
      <p className="text-sm text-text-muted">Settings form placeholder</p>
    </div>
  </div>
);

// --- Shared groups ---------------------------------------------------------------

const defaultGroups: SettingsNavGroup[] = [
  {
    label: 'General',
    items: [
      { id: 'profile', label: 'Profile' },
      { id: 'account', label: 'Account' },
    ],
  },
  {
    label: 'Security',
    items: [
      { id: 'password', label: 'Password' },
      { id: '2fa', label: 'Two-Factor Auth' },
      { id: 'sessions', label: 'Sessions' },
    ],
  },
  {
    label: 'Billing',
    items: [
      { id: 'plan', label: 'Plan' },
      { id: 'invoices', label: 'Invoices' },
    ],
  },
];

const groupsWithIcons: SettingsNavGroup[] = [
  {
    label: 'General',
    items: [
      { id: 'profile', label: 'Profile', icon: <UserIcon /> },
      { id: 'account', label: 'Account', icon: <SettingsIcon /> },
    ],
  },
  {
    label: 'Security',
    items: [
      { id: 'password', label: 'Password', icon: <LockIcon /> },
      { id: '2fa', label: 'Two-Factor Auth', icon: <ShieldIcon /> },
      { id: 'sessions', label: 'Sessions', icon: <MonitorIcon /> },
    ],
  },
  {
    label: 'Billing',
    items: [
      { id: 'plan', label: 'Plan', icon: <CreditCardIcon /> },
      { id: 'invoices', label: 'Invoices', icon: <FileTextIcon /> },
    ],
  },
];

const groupsWithBadges: SettingsNavGroup[] = [
  {
    label: 'General',
    items: [
      { id: 'profile', label: 'Profile' },
      { id: 'account', label: 'Account' },
    ],
  },
  {
    label: 'Security',
    items: [
      { id: 'password', label: 'Password', badge: 1 },
      { id: '2fa', label: 'Two-Factor Auth', badge: 'New' },
      { id: 'sessions', label: 'Sessions', badge: 3 },
    ],
  },
  {
    label: 'Billing',
    items: [
      { id: 'plan', label: 'Plan', badge: 'Pro' },
      { id: 'invoices', label: 'Invoices' },
    ],
  },
];

// --- Meta ------------------------------------------------------------------------

const meta = {
  title: 'Layout/SettingsLayout',
  component: SettingsLayout,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Settings page shell with sidebar navigation and content area. Supports desktop two-column layout and mobile horizontal pill bar.',
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
    activeId: { control: 'text' },
    backHref: { control: 'text' },
    backLabel: { control: 'text' },
  },
  args: {
    title: 'Settings',
    activeId: 'profile',
  },
} satisfies Meta<typeof SettingsLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Default ---------------------------------------------------------------------

export const Default: Story = {
  render: (args) => (
    <SettingsLayout {...args} groups={defaultGroups}>
      <MockContent section="Profile" />
    </SettingsLayout>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Default settings layout with 3 groups: General, Security, and Billing.',
      },
    },
  },
};

// --- WithBadges ------------------------------------------------------------------

export const WithBadges: Story = {
  render: () => (
    <SettingsLayout groups={groupsWithBadges} activeId="password">
      <MockContent section="Password" />
    </SettingsLayout>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Nav items with notification badges showing counts and labels.',
      },
    },
  },
};

// --- WithIcons -------------------------------------------------------------------

export const WithIcons: Story = {
  render: () => (
    <SettingsLayout groups={groupsWithIcons} activeId="profile">
      <MockContent section="Profile" />
    </SettingsLayout>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All nav items with leading icons.',
      },
    },
  },
};

// --- WithBackLink ----------------------------------------------------------------

export const WithBackLink: Story = {
  render: () => (
    <SettingsLayout
      groups={defaultGroups}
      activeId="profile"
      backHref="/dashboard"
      backLabel="Dashboard"
    >
      <MockContent section="Profile" />
    </SettingsLayout>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Settings layout with a back link at the top of the sidebar.',
      },
    },
  },
};

// --- ActiveState -----------------------------------------------------------------

export const ActiveState: Story = {
  render: () => (
    <SettingsLayout groups={groupsWithIcons} activeId="2fa">
      <MockContent section="Two-Factor Authentication" />
    </SettingsLayout>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows the active state highlight on the Two-Factor Auth item.',
      },
    },
  },
};

// --- Mobile ----------------------------------------------------------------------

export const Mobile: Story = {
  render: () => (
    <SettingsLayout groups={defaultGroups} activeId="profile">
      <MockContent section="Profile" />
    </SettingsLayout>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Mobile layout at 375px with horizontal scrollable pill navigation.',
      },
    },
  },
};
