import type { Meta, StoryObj } from '@storybook/react';
import { HoverCard } from './HoverCard';

const meta = {
  title: 'Overlay/HoverCard',
  component: HoverCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Floating card that appears on hover (desktop) or tap-to-expand (mobile). Supports open/close delays and placement.',
      },
    },
  },
  argTypes: {
    placement: { control: 'select', options: ['top', 'bottom', 'left', 'right'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    openDelay: { control: 'number' },
    closeDelay: { control: 'number' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    trigger: (
      <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all">
        Hover me
      </button>
    ),
    children: (
      <div>
        <p className="text-sm font-medium text-text-strong mb-1">HoverCard Title</p>
        <p className="text-xs text-text-tertiary leading-relaxed">
          This floating card appears on hover with a configurable delay.
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
      <HoverCard
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
      </HoverCard>

      <div className="flex gap-16">
        <HoverCard
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
        </HoverCard>

        <HoverCard
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
        </HoverCard>
      </div>

      <HoverCard
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
      </HoverCard>
    </div>
  ),
};

export const Sizes: Story = {
  args: {
    trigger: <button>trigger</button>,
    children: <div />,
  },
  render: () => (
    <div className="flex gap-8">
      <HoverCard
        trigger={
          <button className="rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-lighter transition-colors">
            Small
          </button>
        }
        size="sm"
      >
        <p className="text-xs text-text-tertiary">A compact hover card (max-w 240px).</p>
      </HoverCard>

      <HoverCard
        trigger={
          <button className="rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-lighter transition-colors">
            Medium
          </button>
        }
        size="md"
      >
        <p className="text-xs text-text-tertiary">
          Default medium hover card (max-w 320px). Suitable for most use cases.
        </p>
      </HoverCard>

      <HoverCard
        trigger={
          <button className="rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-lighter transition-colors">
            Large
          </button>
        }
        size="lg"
      >
        <p className="text-xs text-text-tertiary">
          A wider hover card (max-w 420px). Use for richer preview content like user profiles or
          link previews.
        </p>
      </HoverCard>
    </div>
  ),
};

export const WithRichContent: Story = {
  args: {
    trigger: <button>trigger</button>,
    children: <div />,
  },
  render: () => (
    <HoverCard
      trigger={
        <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all">
          @kerryritter
        </button>
      }
      size="lg"
    >
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">KR</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-strong">Kerry Ritter</p>
            <p className="text-xs text-text-tertiary">@kerryritter</p>
          </div>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed mb-3">
          Full-stack developer building CruzJS. Passionate about developer experience, Cloudflare,
          and TypeScript.
        </p>
        <div className="flex gap-4 text-xs text-text-tertiary">
          <span>
            <strong className="text-text-secondary">142</strong> following
          </span>
          <span>
            <strong className="text-text-secondary">1.2k</strong> followers
          </span>
        </div>
      </div>
    </HoverCard>
  ),
};

export const Disabled: Story = {
  args: {
    trigger: (
      <button className="rounded-xl bg-surface px-4 py-2 text-sm font-medium text-text-tertiary border border-surface-border opacity-60 cursor-not-allowed">
        Disabled trigger
      </button>
    ),
    children: (
      <div>
        <p className="text-sm text-text-strong">This should never appear</p>
      </div>
    ),
    disabled: true,
  },
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
      <HoverCard
        trigger={
          <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all">
            Tap to expand
          </button>
        }
      >
        <div>
          <p className="text-sm font-medium text-text-strong mb-1">Mobile HoverCard</p>
          <p className="text-xs text-text-tertiary leading-relaxed">
            On mobile, content expands inline below the trigger instead of floating.
          </p>
        </div>
      </HoverCard>
    </div>
  ),
};
