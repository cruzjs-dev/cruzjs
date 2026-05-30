import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Radio, RadioGroup } from './RadioGroup';

const meta = {
  title: 'Forms/RadioGroup',
  component: RadioGroup,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Radio button group with spring-animated dot, label/description support.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: ['primary', 'success', 'danger'] },
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
  },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: 'default', children: null as unknown as React.ReactNode },
  render: function DefaultRender() {
    const [value, setValue] = useState('email');
    return (
      <RadioGroup name="contact" value={value} onChange={setValue} label="Preferred contact method">
        <Radio value="email" label="Email" />
        <Radio value="phone" label="Phone" />
        <Radio value="sms" label="SMS" />
      </RadioGroup>
    );
  },
};

export const WithDescriptions: Story = {
  args: { name: 'desc', children: null as unknown as React.ReactNode },
  render: function DescRender() {
    const [value, setValue] = useState('starter');
    return (
      <RadioGroup name="plan" value={value} onChange={setValue} label="Select a plan">
        <Radio value="starter" label="Starter" description="Best for personal projects" />
        <Radio value="pro" label="Pro" description="For growing teams" />
        <Radio value="enterprise" label="Enterprise" description="Custom solutions for large organizations" />
      </RadioGroup>
    );
  },
};

export const Horizontal: Story = {
  args: { name: 'horiz', children: null as unknown as React.ReactNode },
  render: function HorizRender() {
    const [value, setValue] = useState('light');
    return (
      <RadioGroup name="theme" value={value} onChange={setValue} label="Theme" orientation="horizontal">
        <Radio value="light" label="Light" />
        <Radio value="dark" label="Dark" />
        <Radio value="system" label="System" />
      </RadioGroup>
    );
  },
};

export const Sizes: Story = {
  args: { name: 'sizes', children: null as unknown as React.ReactNode },
  render: () => (
    <div className="space-y-6">
      {(['sm', 'md', 'lg'] as const).map((s) => (
        <RadioGroup key={s} name={`size-${s}`} defaultValue="a" label={`Size: ${s}`} size={s}>
          <Radio value="a" label="Option A" />
          <Radio value="b" label="Option B" />
        </RadioGroup>
      ))}
    </div>
  ),
};

export const Colors: Story = {
  args: { name: 'colors', children: null as unknown as React.ReactNode },
  render: () => (
    <div className="space-y-6">
      {(['primary', 'success', 'danger'] as const).map((c) => (
        <RadioGroup key={c} name={`color-${c}`} defaultValue="a" label={`Color: ${c}`} color={c}>
          <Radio value="a" label="Selected" />
          <Radio value="b" label="Not selected" />
        </RadioGroup>
      ))}
    </div>
  ),
};

export const WithError: Story = {
  args: { name: 'error', children: null as unknown as React.ReactNode },
  render: () => (
    <RadioGroup name="required" label="Choose one" error="This field is required">
      <Radio value="a" label="Option A" />
      <Radio value="b" label="Option B" />
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  args: { name: 'disabled', children: null as unknown as React.ReactNode },
  render: () => (
    <RadioGroup name="disabled" defaultValue="a" label="Disabled group" disabled>
      <Radio value="a" label="Option A" />
      <Radio value="b" label="Option B" />
    </RadioGroup>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: { name: 'mobile', children: null as unknown as React.ReactNode },
  render: function MobileRender() {
    const [value, setValue] = useState('standard');
    return (
      <div className="p-4">
        <RadioGroup name="shipping" value={value} onChange={setValue} label="Shipping method">
          <Radio value="standard" label="Standard" description="5-7 business days" />
          <Radio value="express" label="Express" description="2-3 business days" />
          <Radio value="overnight" label="Overnight" description="Next business day" />
        </RadioGroup>
      </div>
    );
  },
};
