import type { Meta, StoryObj } from '@storybook/react';
import { TeamRoster, type TeamMember } from './TeamRoster';

const meta = {
  title: 'Data/TeamRoster',
  component: TeamRoster,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Team member list with role badges, invite button, and member actions.',
      },
    },
  },
  argTypes: {
    searchable: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
} satisfies Meta<typeof TeamRoster>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleMembers: TeamMember[] = [
  { id: '1', name: 'Sarah Chen', email: 'sarah@acme.com', avatarSrc: 'https://i.pravatar.cc/150?u=sarah', role: 'Owner', status: 'active' },
  { id: '2', name: 'Alex Rivera', email: 'alex@acme.com', avatarSrc: 'https://i.pravatar.cc/150?u=alex', role: 'Admin', status: 'active' },
  { id: '3', name: 'Jordan Lee', email: 'jordan@acme.com', avatarSrc: 'https://i.pravatar.cc/150?u=jordan', role: 'Member', status: 'active' },
  { id: '4', name: 'Morgan Blake', email: 'morgan@acme.com', avatarSrc: 'https://i.pravatar.cc/150?u=morgan', role: 'Member', status: 'active' },
  { id: '5', name: 'Casey Kim', email: 'casey@acme.com', avatarSrc: 'https://i.pravatar.cc/150?u=casey', role: 'Member', status: 'active' },
];

const pendingMembers: TeamMember[] = [
  ...sampleMembers.slice(0, 3),
  { id: '6', name: 'Riley Park', email: 'riley@acme.com', role: 'Member', status: 'pending' },
  { id: '7', name: 'Dana White', email: 'dana@acme.com', role: 'Member', status: 'pending' },
  { id: '8', name: 'Eli Fox', email: 'eli@acme.com', role: 'Member', status: 'inactive' },
];

const roles = ['Owner', 'Admin', 'Member', 'Viewer'];

export const Default: Story = {
  args: {
    members: sampleMembers,
  },
  decorators: [(Story) => <div className="w-[480px]"><Story /></div>],
};

export const WithRoleChange: Story = {
  args: {
    members: sampleMembers,
    roles,
    onRoleChange: (memberId, role) => console.log(`Changed ${memberId} to ${role}`),
    onRemove: (memberId) => console.log(`Remove ${memberId}`),
    currentUserId: '1',
  },
  decorators: [(Story) => <div className="w-[480px]"><Story /></div>],
};

export const WithPending: Story = {
  args: {
    members: pendingMembers,
    onRemove: (memberId) => console.log(`Remove ${memberId}`),
  },
  decorators: [(Story) => <div className="w-[480px]"><Story /></div>],
};

export const WithSearch: Story = {
  args: {
    members: sampleMembers,
    searchable: true,
  },
  decorators: [(Story) => <div className="w-[480px]"><Story /></div>],
};

export const Invite: Story = {
  args: {
    members: sampleMembers,
    onInvite: () => console.log('Invite clicked'),
  },
  decorators: [(Story) => <div className="w-[480px]"><Story /></div>],
};

export const Loading: Story = {
  args: {
    members: [],
    loading: true,
  },
  decorators: [(Story) => <div className="w-[480px]"><Story /></div>],
};

export const Empty: Story = {
  args: {
    members: [],
    emptyMessage: 'No team members yet. Invite someone to get started!',
    onInvite: () => console.log('Invite clicked'),
  },
  decorators: [(Story) => <div className="w-[480px]"><Story /></div>],
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => (
    <div className="p-4">
      <TeamRoster
        members={pendingMembers}
        onInvite={() => console.log('Invite clicked')}
        onRemove={(id) => console.log(`Remove ${id}`)}
        currentUserId="1"
        searchable
      />
    </div>
  ),
};
