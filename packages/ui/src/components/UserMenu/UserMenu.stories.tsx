import type { Meta, StoryObj } from '@storybook/react';
import { UserMenu } from './UserMenu';
import type { UserMenuGroup } from './UserMenu';

const meta = {
  title: 'Navigation/UserMenu',
  component: UserMenu,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Avatar-triggered popover dropdown with user info, navigation links, and logout action. Bottom sheet on mobile.',
      },
    },
  },
  argTypes: {
    align: { control: 'select', options: ['start', 'end'] },
    size: { control: 'select', options: ['sm', 'md'] },
  },
} satisfies Meta<typeof UserMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Icon helpers (inline SVGs for story portability) ---

function SettingsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M13.5 8a5.5 5.5 0 01-.3 1.8l1.3 1-1.5 2.6-1.5-.6a5.5 5.5 0 01-1.5.9L9.5 15h-3l-.5-1.3a5.5 5.5 0 01-1.5-.9l-1.5.6L1.5 10.8l1.3-1A5.5 5.5 0 012.5 8c0-.6.1-1.2.3-1.8L1.5 5.2 3 2.6l1.5.6A5.5 5.5 0 016 2.3L6.5 1h3l.5 1.3c.6.2 1.1.5 1.5.9l1.5-.6L14.5 5.2l-1.3 1c.2.6.3 1.2.3 1.8z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5" r="3" />
      <path d="M2.5 14.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10.5 11.5L14 8l-3.5-3.5M14 8H6" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="5" r="2.5" />
      <circle cx="11" cy="6" r="2" />
      <path d="M1.5 14c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M11 9c2 0 3.5 1.2 3.5 3" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M6 6a2 2 0 013.9.6c0 1.3-2 1.9-2 3.4M8 12.5v.01" />
    </svg>
  );
}

function BillingIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="3" width="13" height="10" rx="1.5" />
      <path d="M1.5 7h13" />
    </svg>
  );
}

const defaultGroups: UserMenuGroup[] = [
  {
    items: [
      { label: 'Settings', href: '/settings' },
      { label: 'Profile', href: '/profile' },
    ],
  },
  {
    items: [
      { label: 'Sign out', destructive: true, onClick: () => alert('Signed out') },
    ],
  },
];

export const Default: Story = {
  args: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    avatarSrc: 'https://i.pravatar.cc/80?img=5',
    groups: defaultGroups,
  },
};

export const WithGroups: Story = {
  args: {
    name: 'Alex Rivera',
    email: 'alex@acme.co',
    avatarSrc: 'https://i.pravatar.cc/80?img=12',
    groups: [
      {
        label: 'Account',
        items: [
          { label: 'Settings', href: '/settings' },
          { label: 'Profile', href: '/profile' },
        ],
      },
      {
        label: 'Team',
        items: [
          { label: 'Members', href: '/team/members' },
          { label: 'Billing', href: '/team/billing' },
        ],
      },
      {
        label: 'Support',
        items: [
          { label: 'Help Center', href: '/help' },
          { label: 'Contact Us', href: '/contact' },
        ],
      },
      {
        items: [
          { label: 'Sign out', destructive: true, onClick: () => alert('Signed out') },
        ],
      },
    ] satisfies UserMenuGroup[],
  },
};

export const NoAvatar: Story = {
  args: {
    name: 'Sam Wilson',
    email: 'sam@example.com',
    avatarFallback: 'SW',
    groups: defaultGroups,
  },
};

export const AlignStart: Story = {
  args: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    avatarSrc: 'https://i.pravatar.cc/80?img=5',
    groups: defaultGroups,
    align: 'start',
  },
};

export const WithFooter: Story = {
  args: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    avatarSrc: 'https://i.pravatar.cc/80?img=5',
    groups: defaultGroups,
    footer: (
      <div className="text-xs text-text-muted">
        App v2.4.1
      </div>
    ),
  },
};

export const WithIcons: Story = {
  args: {
    name: 'Chris Park',
    email: 'chris@acme.co',
    avatarSrc: 'https://i.pravatar.cc/80?img=8',
    groups: [
      {
        items: [
          { label: 'Profile', icon: <UserIcon />, href: '/profile' },
          { label: 'Settings', icon: <SettingsIcon />, href: '/settings' },
          { label: 'Team', icon: <TeamIcon />, href: '/team' },
          { label: 'Billing', icon: <BillingIcon />, href: '/billing' },
        ],
      },
      {
        items: [
          { label: 'Help', icon: <HelpIcon />, href: '/help' },
        ],
      },
      {
        items: [
          { label: 'Sign out', icon: <LogoutIcon />, destructive: true, onClick: () => alert('Signed out') },
        ],
      },
    ] satisfies UserMenuGroup[],
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    avatarSrc: 'https://i.pravatar.cc/80?img=5',
    groups: [
      {
        items: [
          { label: 'Profile', icon: <UserIcon />, href: '/profile' },
          { label: 'Settings', icon: <SettingsIcon />, href: '/settings' },
        ],
      },
      {
        items: [
          { label: 'Sign out', icon: <LogoutIcon />, destructive: true, onClick: () => alert('Signed out') },
        ],
      },
    ] satisfies UserMenuGroup[],
  },
  render: (args) => (
    <div className="p-4 flex justify-end">
      <UserMenu {...args} />
    </div>
  ),
};
