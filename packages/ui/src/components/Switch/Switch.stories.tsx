import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Switch } from './Switch';

const meta = {
  title: 'Forms/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'iOS-style toggle switch with pill track and circular thumb. Supports controlled and uncontrolled modes, labels, descriptions, multiple sizes, and color variants.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: ['primary', 'success', 'danger'] },
    disabled: { control: 'boolean' },
    checked: { control: 'boolean' },
    label: { control: 'text' },
    description: { control: 'text' },
  },
  args: {
    size: 'md',
    color: 'primary',
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function DefaultSwitch(args) {
    const [checked, setChecked] = useState(false);
    return <Switch {...args} checked={checked} onChange={setChecked} />;
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Enable notifications',
  },
  render: function WithLabelSwitch(args) {
    const [checked, setChecked] = useState(false);
    return <Switch {...args} checked={checked} onChange={setChecked} />;
  },
};

export const WithDescription: Story = {
  args: {
    label: 'Email notifications',
    description: 'Receive email alerts when someone mentions you or replies to your posts.',
  },
  render: function WithDescriptionSwitch(args) {
    const [checked, setChecked] = useState(true);
    return <Switch {...args} checked={checked} onChange={setChecked} />;
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex items-center gap-3">
          <Switch size={size} label={`Size: ${size}`} defaultChecked />
        </div>
      ))}
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['primary', 'success', 'danger'] as const).map((color) => (
        <div key={color} className="flex items-center gap-3">
          <Switch color={color} label={`Color: ${color}`} defaultChecked />
        </div>
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <Switch disabled label="Disabled (off)" />
      <Switch disabled defaultChecked label="Disabled (on)" />
    </div>
  ),
};

export const Controlled: Story = {
  render: function ControlledSwitch() {
    const [checked, setChecked] = useState(false);
    return (
      <div className="flex flex-col gap-4">
        <Switch
          checked={checked}
          onChange={setChecked}
          label="Controlled toggle"
          description={`Current state: ${checked ? 'ON' : 'OFF'}`}
        />
        <button
          type="button"
          className="self-start px-3 py-1.5 text-sm rounded-lg bg-primary text-white hover:opacity-90"
          onClick={() => setChecked((v) => !v)}
        >
          Toggle externally
        </button>
      </div>
    );
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'padded',
  },
  render: function MobileSwitch() {
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [autoSave, setAutoSave] = useState(true);

    return (
      <div className="flex flex-col gap-5 p-4">
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">Settings</h3>
        <div className="flex flex-col gap-4 divide-y divide-surface-border">
          <Switch
            checked={notifications}
            onChange={setNotifications}
            label="Push notifications"
            description="Get notified about important updates"
          />
          <div className="pt-4">
            <Switch
              checked={darkMode}
              onChange={setDarkMode}
              label="Dark mode"
              description="Use dark color scheme"
            />
          </div>
          <div className="pt-4">
            <Switch
              checked={autoSave}
              onChange={setAutoSave}
              label="Auto-save"
              description="Automatically save changes as you type"
            />
          </div>
        </div>
      </div>
    );
  },
};
