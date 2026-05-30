import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ActionBar } from './ActionBar';

// --- Meta --------------------------------------------------------------------

const meta = {
  title: 'UI/ActionBar',
  component: ActionBar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Floating toolbar that appears when rows or items are selected. Fixed to the bottom center of the viewport, showing selection count and action buttons.',
      },
    },
  },
  argTypes: {
    count: { control: 'number' },
    open: { control: 'boolean' },
    countLabel: { control: false },
    onClose: { action: 'onClose' },
  },
  args: {
    count: 3,
  },
} satisfies Meta<typeof ActionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Helpers -----------------------------------------------------------------

const ActionButton: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
}> = ({ children, variant = 'default' }) => (
  <button
    type="button"
    className={[
      'text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150',
      variant === 'destructive'
        ? 'text-danger hover:bg-danger/10'
        : 'text-dark-text-muted hover:text-dark-text hover:bg-white/10',
    ].join(' ')}
  >
    {children}
  </button>
);

// --- Default -----------------------------------------------------------------

export const Default: Story = {
  render: (args) => (
    <div className="h-[300px] bg-surface p-6">
      <p className="text-text-secondary text-sm">The ActionBar is fixed to the bottom of the viewport.</p>
      <ActionBar {...args} onClose={args.onClose}>
        <ActionButton>Edit</ActionButton>
        <ActionButton>Move</ActionButton>
        <ActionButton variant="destructive">Delete</ActionButton>
      </ActionBar>
    </div>
  ),
  args: {
    count: 3,
  },
};

// --- SingleItem --------------------------------------------------------------

export const SingleItem: Story = {
  render: (args) => (
    <div className="h-[300px] bg-surface p-6">
      <p className="text-text-secondary text-sm">Single item selected.</p>
      <ActionBar {...args} onClose={args.onClose}>
        <ActionButton>Edit</ActionButton>
        <ActionButton>Duplicate</ActionButton>
      </ActionBar>
    </div>
  ),
  args: {
    count: 1,
  },
};

// --- ManyItems ---------------------------------------------------------------

export const ManyItems: Story = {
  render: (args) => (
    <div className="h-[300px] bg-surface p-6">
      <p className="text-text-secondary text-sm">Many items selected.</p>
      <ActionBar {...args} onClose={args.onClose}>
        <ActionButton>Export</ActionButton>
        <ActionButton>Archive</ActionButton>
        <ActionButton variant="destructive">Delete All</ActionButton>
      </ActionBar>
    </div>
  ),
  args: {
    count: 42,
  },
};

// --- Hidden ------------------------------------------------------------------

export const Hidden: Story = {
  render: (args) => (
    <div className="h-[300px] bg-surface p-6">
      <p className="text-text-secondary text-sm">Count is 0 -- the bar is hidden (slide down + fade out).</p>
      <ActionBar {...args}>
        <ActionButton>Edit</ActionButton>
      </ActionBar>
    </div>
  ),
  args: {
    count: 0,
  },
};

// --- CustomLabel -------------------------------------------------------------

export const CustomLabel: Story = {
  render: (args) => (
    <div className="h-[300px] bg-surface p-6">
      <p className="text-text-secondary text-sm">Custom label function.</p>
      <ActionBar {...args} onClose={args.onClose}>
        <ActionButton>Move</ActionButton>
        <ActionButton>Tag</ActionButton>
      </ActionBar>
    </div>
  ),
  args: {
    count: 3,
    countLabel: (n: number) => `${n} items selected`,
  },
};

// --- WithDestructive ---------------------------------------------------------

export const WithDestructive: Story = {
  render: (args) => (
    <div className="h-[300px] bg-surface p-6">
      <p className="text-text-secondary text-sm">Includes a destructive (red) delete button.</p>
      <ActionBar {...args} onClose={args.onClose}>
        <ActionButton>Edit</ActionButton>
        <ActionButton>Archive</ActionButton>
        <ActionButton variant="destructive">Delete</ActionButton>
      </ActionBar>
    </div>
  ),
  args: {
    count: 5,
  },
};

// --- InContext ----------------------------------------------------------------

export const InContext: Story = {
  render: () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      id: `item-${i + 1}`,
      label: `Item ${i + 1}`,
    }));

    const [selected, setSelected] = useState<Set<string>>(new Set());

    const toggle = (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    };

    return (
      <div className="min-h-[500px] bg-surface p-6">
        <h2 className="text-lg font-semibold text-text mb-4">Select items below</h2>
        <div className="space-y-2 max-w-md">
          {items.map((item) => (
            <label
              key={item.id}
              className={[
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                selected.has(item.id)
                  ? 'bg-primary/5 border-primary/30'
                  : 'bg-surface border-surface-border hover:bg-surface-lighter',
              ].join(' ')}
            >
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggle(item.id)}
                className="rounded border-surface-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-text">{item.label}</span>
            </label>
          ))}
        </div>

        <ActionBar
          count={selected.size}
          onClose={() => setSelected(new Set())}
        >
          <ActionButton>Edit</ActionButton>
          <ActionButton>Move</ActionButton>
          <ActionButton variant="destructive">Delete</ActionButton>
        </ActionBar>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interactive example: select checkboxes to see the ActionBar appear. Click the X to deselect all.',
      },
    },
  },
};

// --- Mobile ------------------------------------------------------------------

export const Mobile: Story = {
  render: (args) => (
    <div className="h-[500px] bg-surface p-4">
      <p className="text-text-secondary text-sm">On mobile, the bar stretches to fill the viewport width with side margins.</p>
      <ActionBar {...args} onClose={args.onClose}>
        <ActionButton>Edit</ActionButton>
        <ActionButton variant="destructive">Delete</ActionButton>
      </ActionBar>
    </div>
  ),
  args: {
    count: 3,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    docs: {
      description: {
        story: 'Mobile viewport: the bar goes full-width with side padding.',
      },
    },
  },
};
