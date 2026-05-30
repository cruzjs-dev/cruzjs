import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from './Progress';

const meta = {
  title: 'Feedback/Progress',
  component: Progress,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Linear progress bar with tonal track, spring easing, and indeterminate mode.',
      },
    },
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 } },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: ['primary', 'success', 'warning', 'danger', 'info'] },
    showValue: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
  },
  args: {
    value: 60,
    size: 'md',
    color: 'primary',
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-5 max-w-md">
      <Progress value={80} color="primary" label="Primary" showValue />
      <Progress value={65} color="success" label="Success" showValue />
      <Progress value={45} color="warning" label="Warning" showValue />
      <Progress value={30} color="danger" label="Danger" showValue />
      <Progress value={55} color="info" label="Info" showValue />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-5 max-w-md">
      <div>
        <p className="text-xs text-text-tertiary mb-2">Small</p>
        <Progress value={70} size="sm" />
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-2">Medium</p>
        <Progress value={70} size="md" />
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-2">Large</p>
        <Progress value={70} size="lg" />
      </div>
    </div>
  ),
};

export const WithLabel: Story = {
  name: 'With Content',
  render: () => (
    <div className="flex flex-col gap-5 max-w-md">
      <Progress value={73} label="Storage used" showValue />
      <Progress value={5} max={10} label="Files uploaded" showValue />
      <Progress value={100} color="success" label="Complete" showValue />
    </div>
  ),
};

export const Indeterminate: Story = {
  render: () => (
    <div className="flex flex-col gap-5 max-w-md">
      <Progress indeterminate label="Loading..." />
      <Progress indeterminate color="info" size="sm" />
    </div>
  ),
};

export const Composition: Story = {
  render: () => (
    <div className="max-w-sm rounded-2xl border border-surface-border bg-surface p-5 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-strong">Storage</h3>
        <span className="text-xs text-text-tertiary">7.3 GB of 10 GB</span>
      </div>
      <Progress value={73} color="primary" size="md" />
      <div className="mt-3 flex gap-4 text-xs text-text-tertiary">
        <span>Documents: 3.2 GB</span>
        <span>Media: 4.1 GB</span>
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
    <div className="p-4 space-y-4">
      <Progress value={60} label="Uploading..." showValue size="lg" />
      <Progress indeterminate color="info" size="sm" />
    </div>
  ),
};

export const OnDark: Story = {
  parameters: { backgrounds: { default: 'dark' } },
  render: () => (
    <div className="max-w-md space-y-4">
      <Progress value={65} color="primary" size="md" />
      <Progress value={40} color="success" size="md" />
    </div>
  ),
};
