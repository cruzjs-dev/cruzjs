import type { Meta, StoryObj } from '@storybook/react';
import { ProfileCard } from './ProfileCard';

const meta = {
  title: 'Data/ProfileCard',
  component: ProfileCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'User profile card with compact, detailed, and horizontal layout variants.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['compact', 'detailed', 'horizontal'] },
    status: { control: 'select', options: [undefined, 'online', 'offline', 'away', 'busy'] },
  },
} satisfies Meta<typeof ProfileCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const GitHubIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const TwitterIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

export const Compact: Story = {
  args: {
    name: 'Sarah Chen',
    role: 'Product Designer',
    avatarSrc: 'https://i.pravatar.cc/150?u=sarah',
    variant: 'compact',
  },
};

export const Detailed: Story = {
  args: {
    name: 'Alex Rivera',
    role: 'Senior Engineer',
    bio: 'Building delightful developer tools. Open source enthusiast and coffee connoisseur.',
    avatarSrc: 'https://i.pravatar.cc/150?u=alex',
    coverSrc: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=600&h=200&fit=crop',
    variant: 'detailed',
    stats: [
      { label: 'Posts', value: 42 },
      { label: 'Followers', value: '1.2K' },
      { label: 'Following', value: 89 },
    ],
    actions: [
      { label: 'Follow', variant: 'solid' },
      { label: 'Message', variant: 'outline' },
    ],
    socialLinks: [
      { icon: <GitHubIcon />, href: 'https://github.com', label: 'GitHub' },
      { icon: <TwitterIcon />, href: 'https://twitter.com', label: 'Twitter' },
      { icon: <LinkedInIcon />, href: 'https://linkedin.com', label: 'LinkedIn' },
    ],
  },
};

export const Horizontal: Story = {
  args: {
    name: 'Jordan Lee',
    role: 'DevOps Lead',
    avatarSrc: 'https://i.pravatar.cc/150?u=jordan',
    variant: 'horizontal',
    actions: [
      { label: 'View Profile', variant: 'outline' },
    ],
  },
};

export const WithStats: Story = {
  args: {
    name: 'Morgan Blake',
    avatarSrc: 'https://i.pravatar.cc/150?u=morgan',
    variant: 'compact',
    stats: [
      { label: 'Posts', value: 42 },
      { label: 'Followers', value: '1.2K' },
      { label: 'Following', value: 89 },
    ],
  },
};

export const WithActions: Story = {
  args: {
    name: 'Casey Kim',
    role: 'Frontend Engineer',
    avatarSrc: 'https://i.pravatar.cc/150?u=casey',
    variant: 'compact',
    actions: [
      { label: 'Follow', variant: 'solid' },
      { label: 'Message', variant: 'outline' },
    ],
  },
};

export const WithBadge: Story = {
  args: {
    name: 'Taylor Swift',
    role: 'Platform Admin',
    avatarSrc: 'https://i.pravatar.cc/150?u=taylor',
    variant: 'compact',
    badge: (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
        Admin
      </span>
    ),
  },
};

export const WithStatus: Story = {
  args: {
    name: 'Riley Park',
    role: 'Engineering Manager',
    avatarSrc: 'https://i.pravatar.cc/150?u=riley',
    variant: 'compact',
    status: 'online',
  },
};

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <ProfileCard
        name="Alice Johnson"
        role="Designer"
        avatarSrc="https://i.pravatar.cc/150?u=alice"
        status="online"
        stats={[{ label: 'Projects', value: 12 }]}
      />
      <ProfileCard
        name="Bob Smith"
        role="Engineer"
        avatarSrc="https://i.pravatar.cc/150?u=bob"
        status="away"
        stats={[{ label: 'Projects', value: 8 }]}
      />
      <ProfileCard
        name="Charlie Brown"
        role="PM"
        avatarSrc="https://i.pravatar.cc/150?u=charlie"
        status="busy"
        stats={[{ label: 'Projects', value: 15 }]}
      />
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => (
    <div className="p-4 space-y-4">
      <ProfileCard
        name="Dana White"
        role="Mobile Developer"
        avatarSrc="https://i.pravatar.cc/150?u=dana"
        variant="detailed"
        bio="Crafting beautiful mobile experiences."
        stats={[
          { label: 'Apps', value: 5 },
          { label: 'Stars', value: '2.3K' },
        ]}
        actions={[{ label: 'Follow', variant: 'solid' }]}
        status="online"
      />
      <ProfileCard
        name="Eli Fox"
        role="Backend Engineer"
        avatarSrc="https://i.pravatar.cc/150?u=eli"
        variant="horizontal"
        actions={[{ label: 'Connect', variant: 'outline' }]}
      />
    </div>
  ),
};
