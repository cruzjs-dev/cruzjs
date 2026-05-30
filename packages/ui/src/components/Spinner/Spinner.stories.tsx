import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from './Spinner';

const meta = {
  title: 'Feedback/Spinner',
  component: Spinner,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Loading spinner with tonal track and arc. Multiple sizes and colors.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    color: { control: 'select', options: ['primary', 'current', 'white'] },
    thickness: { control: 'number' },
  },
  args: {
    size: 'md',
    color: 'primary',
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex gap-4 items-center">
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <Spinner size={size} />
          <span className="text-[10px] text-text-muted">{size}</span>
        </div>
      ))}
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div className="flex gap-6 items-center">
      <div className="flex flex-col items-center gap-2">
        <Spinner size="lg" color="primary" />
        <span className="text-xs text-text-tertiary">Primary</span>
      </div>
      <div className="flex flex-col items-center gap-2 text-danger">
        <Spinner size="lg" color="current" />
        <span className="text-xs text-text-tertiary">Current (danger)</span>
      </div>
      <div className="flex flex-col items-center gap-2 text-success">
        <Spinner size="lg" color="current" />
        <span className="text-xs text-text-tertiary">Current (success)</span>
      </div>
      <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-surface">
        <Spinner size="lg" color="white" />
        <span className="text-xs text-dark-text-muted">White</span>
      </div>
    </div>
  ),
};

export const InlineWithText: Story = {
  name: 'With Content',
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Spinner size="sm" />
        <span>Loading data...</span>
      </div>
      <button
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium opacity-80 cursor-not-allowed shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
        disabled
      >
        <Spinner size="sm" color="white" />
        Saving...
      </button>
      <div className="flex items-center justify-center p-8 rounded-2xl border border-surface-border">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-text-tertiary">Loading your dashboard</p>
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
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="xl" />
        <p className="text-sm text-text-tertiary">Loading...</p>
      </div>
    </div>
  ),
};

export const OnDark: Story = {
  parameters: { backgrounds: { default: 'dark' } },
  render: () => (
    <div className="flex gap-4 items-center">
      <Spinner size="lg" color="white" />
      <Spinner size="lg" color="primary" />
    </div>
  ),
};

export const Composition: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <div
        className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-info/20"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-info) 4%, var(--color-surface))' }}
      >
        <Spinner size="sm" />
        <span className="text-sm text-text-secondary">Syncing your changes...</span>
      </div>
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-lighter">
        <span className="text-sm text-text-secondary">Processing payment</span>
        <Spinner size="xs" />
      </div>
    </div>
  ),
};
