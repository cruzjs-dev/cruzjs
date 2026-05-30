import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { NumberInput } from './NumberInput';

const meta = {
  title: 'Forms/NumberInput',
  component: NumberInput,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Number input with increment/decrement controls, min/max clamping, and keyboard support.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof NumberInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Quantity',
    defaultValue: 1,
    min: 0,
    max: 99,
  },
};

export const Controlled: Story = {
  render: function ControlledRender() {
    const [value, setValue] = useState<number | undefined>(5);
    return (
      <div className="max-w-xs">
        <NumberInput label="Count" value={value} onChange={setValue} min={0} max={20} />
        <p className="mt-2 text-xs text-text-tertiary">Value: {value ?? 'undefined'}</p>
      </div>
    );
  },
};

export const WithPrecision: Story = {
  args: {
    label: 'Price',
    defaultValue: 9.99,
    step: 0.01,
    precision: 2,
    min: 0,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 max-w-xs">
      <NumberInput size="sm" label="Small" defaultValue={1} />
      <NumberInput size="md" label="Medium" defaultValue={5} />
      <NumberInput size="lg" label="Large" defaultValue={10} />
    </div>
  ),
};

export const NoControls: Story = {
  args: {
    label: 'Age',
    defaultValue: 25,
    showControls: false,
    placeholder: 'Enter age',
  },
};

export const WithError: Story = {
  args: {
    label: 'Quantity',
    defaultValue: -1,
    min: 0,
    error: 'Value must be positive',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Quantity',
    defaultValue: 3,
    disabled: true,
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => (
    <div className="p-4 space-y-4">
      <NumberInput label="Adults" defaultValue={2} min={1} max={10} />
      <NumberInput label="Children" defaultValue={0} min={0} max={10} />
      <NumberInput label="Rooms" defaultValue={1} min={1} max={5} />
    </div>
  ),
};
