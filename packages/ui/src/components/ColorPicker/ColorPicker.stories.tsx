import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ColorPicker } from './ColorPicker';

const meta = {
  title: 'Inputs/ColorPicker',
  component: ColorPicker,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Color picker with saturation/brightness canvas, hue slider, text input, and optional preset swatches. Desktop floating panel, mobile bottom sheet.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    format: { control: 'select', options: ['hex', 'rgb'] },
    disabled: { control: 'boolean' },
  },
  args: {
    defaultValue: '#3b82f6',
    size: 'md',
    format: 'hex',
  },
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Brand Color',
    description: 'Choose your primary brand color',
    defaultValue: '#3b82f6',
  },
};

export const WithSwatches: Story = {
  args: {
    label: 'Theme Color',
    defaultValue: '#ef4444',
    swatches: [
      '#ef4444', '#f97316', '#eab308', '#22c55e',
      '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
      '#1e293b', '#64748b', '#94a3b8', '#f1f5f9',
    ],
  },
};

export const Controlled: Story = {
  render: () => {
    const [color, setColor] = useState('#8b5cf6');
    return (
      <div className="space-y-4 max-w-sm">
        <ColorPicker
          label="Controlled Color"
          value={color}
          onChange={setColor}
          swatches={['#ef4444', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']}
        />
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg border border-surface-border"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm text-text-secondary font-mono">{color}</span>
        </div>
        <button
          type="button"
          className="px-3 py-1.5 text-sm rounded-lg bg-surface-lighter border border-surface-border text-text-secondary hover:bg-surface-border transition-colors"
          onClick={() => setColor('#000000')}
        >
          Reset to black
        </button>
      </div>
    );
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <ColorPicker size="sm" label="Small" defaultValue="#ef4444" />
      <ColorPicker size="md" label="Medium" defaultValue="#22c55e" />
      <ColorPicker size="lg" label="Large" defaultValue="#3b82f6" />
    </div>
  ),
};

export const WithError: Story = {
  args: {
    label: 'Background',
    defaultValue: '#ffffff',
    error: 'Color contrast is too low for accessibility',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Locked Color',
    defaultValue: '#64748b',
    disabled: true,
    description: 'This color is managed by your organization admin',
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => (
    <div className="p-4 space-y-6">
      <ColorPicker
        label="Theme Color"
        defaultValue="#3b82f6"
        swatches={[
          '#ef4444', '#f97316', '#eab308', '#22c55e',
          '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
        ]}
      />
      <ColorPicker
        label="Accent Color"
        defaultValue="#ec4899"
        format="rgb"
        description="Used for highlights and CTAs"
      />
    </div>
  ),
};
