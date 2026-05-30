import type { Meta, StoryObj } from '@storybook/react';
import { StatusDot } from './StatusDot';
import type { StatusDotStatus, StatusDotSize } from './StatusDot';

// --- Meta ---

const meta = {
  title: 'UI/StatusDot',
  component: StatusDot,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Small colored dot indicating user or service status (online, offline, busy, away, none). Supports optional pulse animation and text label.',
      },
    },
  },
  argTypes: {
    status: { control: 'select', options: ['online', 'offline', 'busy', 'away', 'none'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    pulse: { control: 'boolean' },
    label: { control: 'text' },
  },
  args: {
    status: 'online',
    size: 'md',
    pulse: false,
  },
} satisfies Meta<typeof StatusDot>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Helpers ---

const allStatuses: StatusDotStatus[] = ['online', 'offline', 'busy', 'away', 'none'];
const allSizes: StatusDotSize[] = ['sm', 'md', 'lg'];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// --- Default ---

export const Default: Story = {};

// --- All Statuses ---

export const AllStatuses: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      {allStatuses.map((status) => (
        <div key={status} className="flex items-center gap-2">
          <StatusDot status={status} />
          <span className="text-xs text-text-secondary">{capitalize(status)}</span>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All five status variants showing their distinct colors.',
      },
    },
  },
};

// --- With Label ---

export const WithLabel: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {allStatuses.map((status) => (
        <StatusDot key={status} status={status} label={capitalize(status)} />
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Status dots with text labels displayed alongside the dot.',
      },
    },
  },
};

// --- Pulsing ---

export const Pulsing: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <StatusDot status="online" pulse />
        <span className="text-xs text-text-secondary">Pulsing (online)</span>
      </div>
      <div className="flex items-center gap-2">
        <StatusDot status="busy" pulse />
        <span className="text-xs text-text-secondary">No pulse (busy - pulse only works on online)</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Pulse animation is only active when status is "online" and pulse is true.',
      },
    },
  },
};

// --- Sizes ---

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      {allSizes.map((size) => (
        <div key={size} className="flex items-center gap-2">
          <StatusDot status="online" size={size} />
          <span className="text-xs text-text-secondary">{size}</span>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Small, medium, and large dot sizes.',
      },
    },
  },
};
