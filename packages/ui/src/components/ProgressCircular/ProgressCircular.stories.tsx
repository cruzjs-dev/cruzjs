import type { Meta, StoryObj } from '@storybook/react';
import { ProgressCircular } from './ProgressCircular';

const meta = {
  title: 'Feedback/ProgressCircular',
  component: ProgressCircular,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Circular progress ring with tonal track, spring easing, and indeterminate spin.',
      },
    },
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 } },
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    color: { control: 'select', options: ['primary', 'success', 'warning', 'danger', 'info'] },
    showValue: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
  },
  args: {
    value: 65,
    size: 'md',
    color: 'primary',
    showValue: true,
  },
} satisfies Meta<typeof ProgressCircular>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <ProgressCircular value={80} color="primary" showValue />
      <ProgressCircular value={65} color="success" showValue />
      <ProgressCircular value={45} color="warning" showValue />
      <ProgressCircular value={30} color="danger" showValue />
      <ProgressCircular value={55} color="info" showValue />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <div className="flex flex-col items-center gap-2">
        <ProgressCircular value={70} size="xs" />
        <span className="text-xs text-text-tertiary">xs</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ProgressCircular value={70} size="sm" />
        <span className="text-xs text-text-tertiary">sm</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ProgressCircular value={70} size="md" showValue />
        <span className="text-xs text-text-tertiary">md</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ProgressCircular value={70} size="lg" showValue />
        <span className="text-xs text-text-tertiary">lg</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ProgressCircular value={70} size="xl" showValue />
        <span className="text-xs text-text-tertiary">xl</span>
      </div>
    </div>
  ),
};

export const Indeterminate: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <ProgressCircular indeterminate size="sm" />
      <ProgressCircular indeterminate size="md" color="info" />
      <ProgressCircular indeterminate size="lg" color="success" />
    </div>
  ),
};

export const WithCustomContent: Story = {
  name: 'Custom Content',
  render: () => (
    <div className="flex items-center gap-6">
      <ProgressCircular value={73} size="xl" color="primary">
        <span className="text-lg font-bold text-text-strong">73</span>
      </ProgressCircular>
      <ProgressCircular value={100} size="xl" color="success">
        <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </ProgressCircular>
      <ProgressCircular value={25} size="lg" color="warning">
        <span className="text-xs font-bold text-warning-text">1/4</span>
      </ProgressCircular>
    </div>
  ),
};

export const Composition: Story = {
  render: () => (
    <div className="max-w-xs rounded-2xl border border-surface-border bg-surface p-6 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-4">
        <ProgressCircular value={87} size="xl" color="primary">
          <span className="text-lg font-bold text-text-strong">87</span>
        </ProgressCircular>
        <div>
          <h3 className="text-sm font-semibold text-text-strong">Health Score</h3>
          <p className="text-xs text-text-tertiary mt-0.5">System is performing well</p>
        </div>
      </div>
      <div className="mt-4 flex gap-4">
        <div className="flex items-center gap-2">
          <ProgressCircular value={95} size="xs" color="success" />
          <span className="text-xs text-text-secondary">Uptime</span>
        </div>
        <div className="flex items-center gap-2">
          <ProgressCircular value={72} size="xs" color="warning" />
          <span className="text-xs text-text-secondary">Memory</span>
        </div>
        <div className="flex items-center gap-2">
          <ProgressCircular value={45} size="xs" color="info" />
          <span className="text-xs text-text-secondary">CPU</span>
        </div>
      </div>
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => (
    <div className="p-4 flex flex-col items-center gap-6">
      <ProgressCircular value={68} size="xl" color="primary" showValue />
      <div className="flex gap-4">
        <ProgressCircular value={90} size="md" color="success" showValue />
        <ProgressCircular value={45} size="md" color="warning" showValue />
        <ProgressCircular value={20} size="md" color="danger" showValue />
      </div>
      <ProgressCircular indeterminate size="lg" color="info" />
    </div>
  ),
};

export const OnDark: Story = {
  parameters: { backgrounds: { default: 'dark' } },
  render: () => (
    <div className="flex items-center gap-6">
      <ProgressCircular value={65} size="lg" color="primary" showValue />
      <ProgressCircular value={80} size="lg" color="success" showValue />
      <ProgressCircular indeterminate size="lg" color="info" />
    </div>
  ),
};
