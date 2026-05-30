import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from './Skeleton';

const meta = {
  title: 'Feedback/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Placeholder loading skeleton with shimmer animation. Text, circular, rectangular, and rounded variants.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['text', 'circular', 'rectangular', 'rounded'] },
    animate: { control: 'boolean' },
    lines: { control: 'number' },
  },
  args: {
    variant: 'text',
    animate: true,
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-6 max-w-md">
      <div>
        <p className="text-xs text-text-tertiary mb-2">Text</p>
        <Skeleton variant="text" />
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-2">Multi-line text</p>
        <Skeleton variant="text" lines={3} />
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-2">Circular</p>
        <Skeleton variant="circular" />
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-2">Rounded</p>
        <Skeleton variant="rounded" height={120} />
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-2">Rectangular</p>
        <Skeleton variant="rectangular" height={120} />
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-md">
      <Skeleton variant="text" height={8} />
      <Skeleton variant="text" height={12} />
      <Skeleton variant="text" height={16} />
      <Skeleton variant="text" height={24} />
      <div className="flex gap-3">
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="circular" width={40} height={40} />
        <Skeleton variant="circular" width={48} height={48} />
        <Skeleton variant="circular" width={64} height={64} />
      </div>
    </div>
  ),
};

export const CardSkeleton: Story = {
  name: 'With Content',
  render: () => (
    <div className="max-w-sm rounded-2xl border border-surface-border bg-surface p-5 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)]">
      <Skeleton variant="rounded" height={160} />
      <div className="mt-4 flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <Skeleton variant="text" width="60%" height={14} />
          <div className="mt-1.5">
            <Skeleton variant="text" width="40%" height={12} />
          </div>
        </div>
      </div>
      <div className="mt-4">
        <Skeleton variant="text" lines={2} />
      </div>
    </div>
  ),
};

export const ListSkeleton: Story = {
  name: 'Composition',
  render: () => (
    <div className="max-w-md space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface">
          <Skeleton variant="circular" width={36} height={36} />
          <div className="flex-1">
            <Skeleton variant="text" width="50%" height={13} />
            <div className="mt-1.5">
              <Skeleton variant="text" width="80%" height={11} />
            </div>
          </div>
          <Skeleton variant="rounded" width={60} height={28} />
        </div>
      ))}
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
      <Skeleton variant="rounded" height={180} />
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={44} height={44} />
        <div className="flex-1">
          <Skeleton variant="text" width="55%" />
          <div className="mt-1.5">
            <Skeleton variant="text" width="35%" height={12} />
          </div>
        </div>
      </div>
      <Skeleton lines={3} />
    </div>
  ),
};

export const OnDark: Story = {
  parameters: { backgrounds: { default: 'dark' } },
  render: () => (
    <div className="max-w-sm space-y-3">
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" lines={2} />
      <Skeleton variant="circular" width={48} height={48} />
    </div>
  ),
};

export const NoAnimation: Story = {
  render: () => (
    <div className="max-w-md space-y-3">
      <p className="text-xs text-text-tertiary mb-2">prefers-reduced-motion or animate=false</p>
      <Skeleton animate={false} />
      <Skeleton animate={false} variant="circular" />
      <Skeleton animate={false} variant="rounded" height={80} />
    </div>
  ),
};
