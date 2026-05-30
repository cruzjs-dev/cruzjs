import type { Meta, StoryObj } from '@storybook/react';
import { Avatar, AvatarGroup } from './Avatar';
import { Badge } from '../Badge';

const meta = {
  title: 'UI/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'User avatar with image, initials fallback, status indicator, and group stacking.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    status: { control: 'select', options: [undefined, 'online', 'offline', 'away', 'busy'] },
    square: { control: 'boolean' },
  },
  args: {
    name: 'Kerry Ritter',
    size: 'md',
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex gap-4 items-center">
      <div className="flex flex-col items-center gap-1.5">
        <Avatar src="https://i.pravatar.cc/150?u=1" name="Photo" />
        <span className="text-xs text-text-tertiary">Image</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <Avatar name="Kerry Ritter" />
        <span className="text-xs text-text-tertiary">Initials</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <Avatar />
        <span className="text-xs text-text-tertiary">Fallback</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <Avatar name="Design Team" square />
        <span className="text-xs text-text-tertiary">Square</span>
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex gap-3 items-end">
      {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((size) => (
        <div key={size} className="flex flex-col items-center gap-1.5">
          <Avatar name="Kerry Ritter" size={size} />
          <span className="text-[10px] text-text-muted">{size}</span>
        </div>
      ))}
    </div>
  ),
};

export const WithStatus: Story = {
  render: () => (
    <div className="flex gap-4 items-center">
      {(['online', 'away', 'busy', 'offline'] as const).map((status) => (
        <div key={status} className="flex flex-col items-center gap-1.5">
          <Avatar name="Kerry Ritter" size="lg" status={status} />
          <span className="text-xs text-text-tertiary capitalize">{status}</span>
        </div>
      ))}
    </div>
  ),
};

export const StatusSizes: Story = {
  render: () => (
    <div className="flex gap-3 items-end">
      {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((size) => (
        <Avatar key={size} name="User" size={size} status="online" />
      ))}
    </div>
  ),
};

export const ColorPalette: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap">
      {['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy'].map((name) => (
        <Avatar key={name} name={name} size="lg" />
      ))}
    </div>
  ),
};

export const Group: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-text-tertiary mb-2">All visible</p>
        <AvatarGroup size="md">
          <Avatar name="Alice" />
          <Avatar name="Bob" />
          <Avatar name="Charlie" />
        </AvatarGroup>
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-2">With overflow (max=3)</p>
        <AvatarGroup max={3} size="md">
          <Avatar name="Alice" />
          <Avatar name="Bob" />
          <Avatar name="Charlie" />
          <Avatar name="Dave" />
          <Avatar name="Eve" />
          <Avatar name="Frank" />
        </AvatarGroup>
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-2">Large group</p>
        <AvatarGroup max={3} size="lg">
          <Avatar src="https://i.pravatar.cc/150?u=1" name="User 1" />
          <Avatar src="https://i.pravatar.cc/150?u=2" name="User 2" />
          <Avatar src="https://i.pravatar.cc/150?u=3" name="User 3" />
          <Avatar name="User 4" />
          <Avatar name="User 5" />
        </AvatarGroup>
      </div>
    </div>
  ),
};

export const WithBadge: Story = {
  name: 'Composition',
  render: () => (
    <div className="flex gap-6 items-start">
      <div className="flex items-center gap-3">
        <Avatar src="https://i.pravatar.cc/150?u=10" name="Kerry Ritter" size="lg" status="online" />
        <div>
          <p className="text-sm font-semibold text-text-strong">Kerry Ritter</p>
          <p className="text-xs text-text-tertiary">Engineering Lead</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Avatar name="Acme Corp" size="lg" square />
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-text-strong">Acme Corp</p>
            <Badge variant="subtle" color="success" size="sm">Pro</Badge>
          </div>
          <p className="text-xs text-text-tertiary">Organization</p>
        </div>
      </div>
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'padded',
  },
  render: () => (
    <div className="p-4 space-y-6">
      <div>
        <p className="text-xs text-text-tertiary mb-3">Team members</p>
        <div className="space-y-3">
          {['Alice Johnson', 'Bob Smith', 'Charlie Brown'].map((name, i) => (
            <div key={name} className="flex items-center gap-3">
              <Avatar name={name} size="md" status={(['online', 'away', 'offline'] as const)[i]} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-strong truncate">{name}</p>
                <p className="text-xs text-text-tertiary">Member</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};

export const OnDark: Story = {
  parameters: { backgrounds: { default: 'dark' } },
  render: () => (
    <div className="flex gap-3 items-center">
      <Avatar name="Dark Mode" size="lg" status="online" />
      <Avatar src="https://i.pravatar.cc/150?u=5" name="Photo" size="lg" />
      <Avatar size="lg" />
    </div>
  ),
};
