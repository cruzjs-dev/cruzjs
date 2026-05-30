import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SegmentedControl } from './SegmentedControl';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Inputs/SegmentedControl',
  component: SegmentedControl,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'iOS-style segmented control for selecting between a small set of mutually exclusive options. Supports animated sliding indicator, keyboard navigation, and multiple color/size variants.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: ['primary', 'success', 'info'] },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    size: 'md',
    color: 'primary',
    fullWidth: false,
    disabled: false,
  },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Icons ───────────────────────────────────────────────────────────────────

const ListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const GridIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);

const BoardIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
);

// ─── Default ─────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    data: [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
    ],
    defaultValue: 'weekly',
  },
};

// ─── WithIcons ───────────────────────────────────────────────────────────────

export const WithIcons: Story = {
  render: () => (
    <SegmentedControl
      data={[
        { value: 'list', label: 'List', icon: <ListIcon /> },
        { value: 'grid', label: 'Grid', icon: <GridIcon /> },
        { value: 'board', label: 'Board', icon: <BoardIcon /> },
      ]}
      defaultValue="list"
    />
  ),
};

// ─── FullWidth ───────────────────────────────────────────────────────────────

export const FullWidth: Story = {
  render: () => (
    <div className="w-full max-w-md">
      <SegmentedControl
        data={['Overview', 'Analytics', 'Reports']}
        fullWidth
        defaultValue="Overview"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'With `fullWidth`, segments stretch to fill the entire container width.',
      },
    },
  },
};

// ─── Colors ──────────────────────────────────────────────────────────────────

export const Colors: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['primary', 'success', 'info'] as const).map((color) => (
        <div key={color}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            {color}
          </p>
          <SegmentedControl
            data={['Option A', 'Option B', 'Option C']}
            color={color}
            defaultValue="Option B"
          />
        </div>
      ))}
    </div>
  ),
};

// ─── Disabled ────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Entire control disabled
        </p>
        <SegmentedControl
          data={['Daily', 'Weekly', 'Monthly']}
          defaultValue="Weekly"
          disabled
        />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Single segment disabled
        </p>
        <SegmentedControl
          data={[
            { value: 'free', label: 'Free' },
            { value: 'pro', label: 'Pro', disabled: true },
            { value: 'enterprise', label: 'Enterprise' },
          ]}
          defaultValue="free"
        />
      </div>
    </div>
  ),
};

// ─── Sizes ───────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            {size}
          </p>
          <SegmentedControl
            data={['Daily', 'Weekly', 'Monthly']}
            size={size}
            defaultValue="Weekly"
          />
        </div>
      ))}
    </div>
  ),
};

// ─── Controlled ──────────────────────────────────────────────────────────────

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState('weekly');
    return (
      <div className="flex flex-col gap-4">
        <SegmentedControl
          data={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
          value={value}
          onChange={setValue}
        />
        <p className="text-sm text-text-secondary">
          Selected: <strong className="text-text-strong">{value}</strong>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setValue('daily')}
            className="px-3 py-1.5 text-xs rounded-lg bg-surface-lighter text-text-secondary hover:text-text-strong ring-1 ring-surface-border/50"
          >
            Set Daily
          </button>
          <button
            onClick={() => setValue('monthly')}
            className="px-3 py-1.5 text-xs rounded-lg bg-surface-lighter text-text-secondary hover:text-text-strong ring-1 ring-surface-border/50"
          >
            Set Monthly
          </button>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Fully controlled mode: `value` and `onChange` are provided externally. The component does not manage its own state.',
      },
    },
  },
};

// ─── Mobile ──────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="w-full">
      <SegmentedControl
        data={[
          { value: 'list', label: 'List', icon: <ListIcon /> },
          { value: 'grid', label: 'Grid', icon: <GridIcon /> },
          { value: 'board', label: 'Board', icon: <BoardIcon /> },
        ]}
        defaultValue="list"
        fullWidth
        size="sm"
      />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'On mobile, `fullWidth` with `sm` size creates a compact, touch-friendly control.',
      },
    },
  },
};
