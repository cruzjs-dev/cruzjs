import type { Meta, StoryObj } from '@storybook/react';
import { Popover } from './Popover';

const meta = {
  title: 'Overlay/Popover',
  component: Popover,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Floating panel anchored to a trigger. Bottom sheet on mobile.',
      },
    },
  },
  argTypes: {
    placement: { control: 'select', options: ['top', 'bottom', 'left', 'right'] },
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    trigger: (
      <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all">
        Open Popover
      </button>
    ),
    children: (
      <div className="w-56">
        <p className="text-sm font-medium text-text-strong mb-1">Popover Title</p>
        <p className="text-xs text-text-tertiary leading-relaxed">
          This is a floating panel anchored to the trigger element.
        </p>
      </div>
    ),
  },
};

export const Placements: Story = {
  args: {
    trigger: <button>trigger</button>,
    children: <div />,
  },
  render: () => (
    <div className="flex flex-col items-center gap-16 py-16">
      <Popover
        trigger={
          <button className="rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-lighter transition-colors">
            Bottom (default)
          </button>
        }
        placement="bottom"
      >
        <div className="w-48">
          <p className="text-xs text-text-tertiary">Appears below the trigger</p>
        </div>
      </Popover>

      <div className="flex gap-16">
        <Popover
          trigger={
            <button className="rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-lighter transition-colors">
              Left
            </button>
          }
          placement="left"
        >
          <div className="w-40">
            <p className="text-xs text-text-tertiary">Appears to the left</p>
          </div>
        </Popover>

        <Popover
          trigger={
            <button className="rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-lighter transition-colors">
              Right
            </button>
          }
          placement="right"
        >
          <div className="w-40">
            <p className="text-xs text-text-tertiary">Appears to the right</p>
          </div>
        </Popover>
      </div>

      <Popover
        trigger={
          <button className="rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-lighter transition-colors">
            Top
          </button>
        }
        placement="top"
      >
        <div className="w-48">
          <p className="text-xs text-text-tertiary">Appears above the trigger</p>
        </div>
      </Popover>
    </div>
  ),
};

export const RichContent: Story = {
  args: {
    trigger: <button>trigger</button>,
    children: <div />,
  },
  render: () => (
    <Popover
      trigger={
        <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all">
          User Info
        </button>
      }
    >
      <div className="w-64">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">KR</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-strong">Kerry Ritter</p>
            <p className="text-xs text-text-tertiary">kerry@example.com</p>
          </div>
        </div>
        <div className="border-t border-surface-border pt-3 space-y-2">
          <button className="w-full text-left rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-lighter transition-colors">
            Profile
          </button>
          <button className="w-full text-left rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-lighter transition-colors">
            Settings
          </button>
          <button className="w-full text-left rounded-lg px-3 py-1.5 text-sm text-danger hover:bg-danger-subtle transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </Popover>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: {
    trigger: <button>trigger</button>,
    children: <div />,
  },
  render: () => (
    <div className="p-4">
      <Popover
        trigger={
          <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all">
            Open Popover (Mobile)
          </button>
        }
      >
        <div>
          <p className="text-sm font-medium text-text-strong mb-1">Mobile Popover</p>
          <p className="text-xs text-text-tertiary leading-relaxed">
            On mobile, this renders as a bottom sheet instead of a floating panel.
          </p>
        </div>
      </Popover>
    </div>
  ),
};
