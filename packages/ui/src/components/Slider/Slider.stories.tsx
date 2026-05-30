import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Slider } from './Slider';

const meta = {
  title: 'Inputs/Slider',
  component: Slider,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Range slider with pointer-driven interaction, keyboard support, and customizable track/thumb styling.',
      },
    },
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 } },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: ['primary', 'success', 'info'] },
    showValue: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    defaultValue: 50,
    size: 'md',
    color: 'primary',
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [val, setVal] = useState(args.defaultValue ?? 50);
    return <Slider {...args} value={val} onChange={setVal} />;
  },
};

export const WithLabel: Story = {
  render: () => {
    const [val, setVal] = useState(60);
    return <Slider value={val} onChange={setVal} label="Volume" />;
  },
};

export const ShowValue: Story = {
  render: () => {
    const [val, setVal] = useState(42);
    return <Slider value={val} onChange={setVal} label="Brightness" showValue />;
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6 max-w-md">
      <div>
        <p className="text-xs text-text-tertiary mb-2">Small</p>
        <Slider defaultValue={40} size="sm" />
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-2">Medium</p>
        <Slider defaultValue={60} size="md" />
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-2">Large</p>
        <Slider defaultValue={80} size="lg" />
      </div>
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div className="flex flex-col gap-6 max-w-md">
      <Slider defaultValue={60} color="primary" label="Primary" showValue />
      <Slider defaultValue={45} color="success" label="Success" showValue />
      <Slider defaultValue={75} color="info" label="Info" showValue />
    </div>
  ),
};

export const Steps: Story = {
  render: () => {
    const [val, setVal] = useState(25);
    return (
      <div className="max-w-md">
        <Slider value={val} onChange={setVal} step={25} label="Step: 25" showValue />
      </div>
    );
  },
};

export const Range: Story = {
  name: 'Custom Range (min/max)',
  render: () => {
    const [val, setVal] = useState(2020);
    return (
      <div className="max-w-md">
        <Slider value={val} onChange={setVal} min={1900} max={2100} step={10} label="Year" showValue />
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-6 max-w-md">
      <Slider defaultValue={30} disabled label="Disabled" showValue />
      <Slider defaultValue={70} disabled color="success" label="Disabled (success)" showValue />
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => {
    const [val, setVal] = useState(50);
    return (
      <div className="p-4 space-y-6">
        <Slider value={val} onChange={setVal} label="Volume" showValue size="lg" />
        <Slider defaultValue={25} color="info" label="Quality" showValue />
      </div>
    );
  },
};
