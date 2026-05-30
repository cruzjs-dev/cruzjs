import type { Meta, StoryObj } from '@storybook/react';
import { SettingsSection } from './SettingsSection';

const meta = {
  title: 'Layout/SettingsSection',
  component: SettingsSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Card-style settings section with title, description, and form content slot. Used inside SettingsLayout for building settings pages.',
      },
    },
  },
  argTypes: {
    danger: { control: 'boolean' },
    collapsible: { control: 'boolean' },
    defaultExpanded: { control: 'boolean' },
  },
} satisfies Meta<typeof SettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Profile Information',
    description: 'Update your personal details and public profile.',
    children: null as unknown as React.ReactNode,
  },
  render: (args) => (
    <div className="max-w-2xl">
      <SettingsSection {...args}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Name</label>
            <input
              type="text"
              defaultValue="Jane Doe"
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Email</label>
            <input
              type="email"
              defaultValue="jane@example.com"
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </SettingsSection>
    </div>
  ),
};

export const WithActions: Story = {
  args: {
    title: 'Notification Preferences',
    description: 'Choose how and when you want to be notified.',
    children: null as unknown as React.ReactNode,
  },
  render: (args) => (
    <div className="max-w-2xl">
      <SettingsSection
        {...args}
        actions={
          <>
            <button
              type="button"
              className="text-text-secondary text-sm hover:text-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              className="bg-primary text-surface rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Save changes
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="rounded" />
            <span className="text-sm text-text">Email notifications</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="rounded" />
            <span className="text-sm text-text">Push notifications</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="rounded" />
            <span className="text-sm text-text">Weekly digest</span>
          </label>
        </div>
      </SettingsSection>
    </div>
  ),
};

export const Danger: Story = {
  args: {
    title: 'Delete Account',
    description:
      'Permanently delete your account and all associated data. This action cannot be undone.',
    danger: true,
    children: null as unknown as React.ReactNode,
  },
  render: (args) => (
    <div className="max-w-2xl">
      <SettingsSection
        {...args}
        actions={
          <button
            type="button"
            className="bg-danger text-surface rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Delete account
          </button>
        }
      >
        <p className="text-sm text-text-secondary">
          Once you delete your account, there is no going back. All your data, projects,
          and settings will be permanently removed from our servers.
        </p>
      </SettingsSection>
    </div>
  ),
};

export const WithIcon: Story = {
  args: {
    title: 'Security',
    description: 'Manage your password and two-factor authentication.',
    children: null as unknown as React.ReactNode,
  },
  render: (args) => (
    <div className="max-w-2xl">
      <SettingsSection
        {...args}
        icon={
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Current password
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              New password
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </SettingsSection>
    </div>
  ),
};

export const WithBadge: Story = {
  args: {
    title: 'AI Suggestions',
    description: 'Configure AI-powered features for your workspace.',
    children: null as unknown as React.ReactNode,
  },
  render: (args) => (
    <div className="max-w-2xl">
      <SettingsSection
        {...args}
        badge={
          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Beta
          </span>
        }
      >
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="rounded" />
            <span className="text-sm text-text">Enable AI auto-complete</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="rounded" />
            <span className="text-sm text-text">Smart categorization</span>
          </label>
        </div>
      </SettingsSection>
    </div>
  ),
};

export const Collapsible: Story = {
  args: {
    title: 'Advanced Settings',
    description: 'These settings are for power users.',
    collapsible: true,
    defaultExpanded: false,
    children: null as unknown as React.ReactNode,
  },
  render: (args) => (
    <div className="max-w-2xl">
      <SettingsSection {...args}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              API Rate Limit
            </label>
            <input
              type="number"
              defaultValue={1000}
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Cache TTL (seconds)
            </label>
            <input
              type="number"
              defaultValue={3600}
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </SettingsSection>
    </div>
  ),
};

export const Stacked: Story = {
  args: {
    title: '',
    children: null as unknown as React.ReactNode,
  },
  render: () => (
    <div className="max-w-2xl space-y-6">
      <SettingsSection
        title="Profile"
        description="Your public profile information."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Name</label>
            <input
              type="text"
              defaultValue="Jane Doe"
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Notifications"
        description="How you receive updates."
        actions={
          <>
            <button
              type="button"
              className="text-text-secondary text-sm hover:text-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              className="bg-primary text-surface rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Save
            </button>
          </>
        }
      >
        <label className="flex items-center gap-3">
          <input type="checkbox" defaultChecked className="rounded" />
          <span className="text-sm text-text">Email notifications</span>
        </label>
      </SettingsSection>

      <SettingsSection
        title="Danger Zone"
        description="Irreversible actions."
        danger
        actions={
          <button
            type="button"
            className="bg-danger text-surface rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Delete account
          </button>
        }
      >
        <p className="text-sm text-text-secondary">
          Deleting your account is permanent and cannot be undone.
        </p>
      </SettingsSection>
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: {
    title: '',
    children: null as unknown as React.ReactNode,
  },
  render: () => (
    <div className="p-4 space-y-4">
      <SettingsSection
        title="Profile"
        description="Update your profile information."
        actions={
          <button
            type="button"
            className="bg-primary text-surface rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Name</label>
            <input
              type="text"
              defaultValue="Jane Doe"
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Email</label>
            <input
              type="email"
              defaultValue="jane@example.com"
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Danger Zone" danger>
        <p className="text-sm text-text-secondary">
          Delete your account permanently.
        </p>
      </SettingsSection>
    </div>
  ),
};
