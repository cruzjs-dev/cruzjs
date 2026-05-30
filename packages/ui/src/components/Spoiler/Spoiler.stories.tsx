import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Spoiler } from './Spoiler';

const LONG_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit
in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat
non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium
tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros
bibendum elit, nec luctus magna felis sollicitudin mauris.`;

const SHORT_TEXT = 'This is a short paragraph that fits within the max height.';

const meta = {
  title: 'UI/Spoiler',
  component: Spoiler,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Truncates long content with an animated "Show more" / "Show less" toggle. Content fades out with a gradient when collapsed.',
      },
    },
  },
  argTypes: {
    maxHeight: { control: 'number' },
    transitionDuration: { control: 'number' },
    defaultExpanded: { control: 'boolean' },
  },
} satisfies Meta<typeof Spoiler>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    maxHeight: 80,
    children: LONG_TEXT,
  },
  render: (args) => (
    <div className="max-w-lg">
      <Spoiler {...args} />
    </div>
  ),
};

export const Expanded: Story = {
  args: {
    maxHeight: 80,
    defaultExpanded: true,
    children: LONG_TEXT,
  },
  render: (args) => (
    <div className="max-w-lg">
      <Spoiler {...args} />
    </div>
  ),
};

export const NoOverflow: Story = {
  args: {
    maxHeight: 200,
    children: SHORT_TEXT,
  },
  render: (args) => (
    <div className="max-w-lg">
      <Spoiler {...args} />
    </div>
  ),
};

export const CustomLabels: Story = {
  args: {
    maxHeight: 80,
    showLabel: 'Read more',
    hideLabel: 'Read less',
    children: LONG_TEXT,
  },
  render: (args) => (
    <div className="max-w-lg">
      <Spoiler {...args} />
    </div>
  ),
};

function ControlledExample() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-white hover:opacity-90 transition-opacity"
        >
          {expanded ? 'Collapse externally' : 'Expand externally'}
        </button>
        <span className="text-sm text-text-tertiary">
          State: {expanded ? 'expanded' : 'collapsed'}
        </span>
      </div>
      <Spoiler maxHeight={80} expanded={expanded} onExpandedChange={setExpanded}>
        {LONG_TEXT}
      </Spoiler>
    </div>
  );
}

export const Controlled: Story = {
  args: {
    maxHeight: 80,
    children: null as unknown as React.ReactNode,
  },
  render: () => <ControlledExample />,
};

export const InContext: Story = {
  args: {
    maxHeight: 80,
    children: null as unknown as React.ReactNode,
  },
  render: () => (
    <div className="max-w-md rounded-2xl border border-surface-border bg-surface p-6 space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-text-strong">Product Description</h3>
        <p className="text-xs text-text-tertiary">Updated 2 days ago</p>
      </div>
      <Spoiler maxHeight={60} showLabel="Show full description" hideLabel="Hide description">
        <p className="text-sm text-text-secondary leading-relaxed">
          {LONG_TEXT}
        </p>
      </Spoiler>
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: {
    maxHeight: 80,
    children: null as unknown as React.ReactNode,
  },
  render: () => (
    <div className="p-4 space-y-4">
      <div className="rounded-2xl border border-surface-border bg-surface p-4 space-y-3">
        <h4 className="text-base font-semibold text-text-strong">About this item</h4>
        <Spoiler maxHeight={60}>
          <p className="text-sm text-text-secondary leading-relaxed">
            {LONG_TEXT}
          </p>
        </Spoiler>
      </div>
      <div className="rounded-2xl border border-surface-border bg-surface p-4 space-y-3">
        <h4 className="text-base font-semibold text-text-strong">Short note</h4>
        <Spoiler maxHeight={100}>
          <p className="text-sm text-text-secondary leading-relaxed">
            {SHORT_TEXT}
          </p>
        </Spoiler>
      </div>
    </div>
  ),
};
