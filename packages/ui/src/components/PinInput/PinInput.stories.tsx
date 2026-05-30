import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { PinInput } from './PinInput';

const meta = {
  title: 'Forms/PinInput',
  component: PinInput,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'OTP/verification code input with individual cells for each digit or character. Supports auto-advance, paste, masking, and full keyboard navigation.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    type: { control: 'select', options: ['number', 'alphanumeric'] },
    length: { control: { type: 'number', min: 2, max: 10 } },
    mask: { control: 'boolean' },
    disabled: { control: 'boolean' },
    autoFocus: { control: 'boolean' },
  },
} satisfies Meta<typeof PinInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Verification Code',
    description: 'Enter the 6-digit code sent to your email',
  },
};

export const Masked: Story = {
  args: {
    label: 'Security PIN',
    description: 'Enter your 6-digit security PIN',
    mask: true,
  },
};

export const Alphanumeric: Story = {
  args: {
    label: 'License Key',
    description: 'Enter your alphanumeric activation code',
    type: 'alphanumeric',
    placeholder: '-',
  },
};

export const CustomLength: Story = {
  args: {
    label: '4-Digit PIN',
    description: 'Enter your 4-digit PIN',
    length: 4,
  },
};

export const WithError: Story = {
  args: {
    label: 'Verification Code',
    error: 'The code you entered is incorrect. Please try again.',
    defaultValue: '123456',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Verification Code',
    disabled: true,
    defaultValue: '123456',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-6">
      <PinInput size="sm" label="Small" length={4} />
      <PinInput size="md" label="Medium" length={4} />
      <PinInput size="lg" label="Large" length={4} />
    </div>
  ),
};

export const Controlled: Story = {
  render: function ControlledStory() {
    const [value, setValue] = useState('');
    const [completed, setCompleted] = useState(false);

    return (
      <div className="space-y-4">
        <PinInput
          label="Controlled Input"
          description="Type or paste a code"
          value={value}
          onChange={setValue}
          onComplete={() => setCompleted(true)}
          length={6}
        />
        <div className="text-sm text-text-secondary space-y-1">
          <p>
            Current value: <code className="px-1.5 py-0.5 bg-surface-lighter rounded text-xs font-mono">{value || '(empty)'}</code>
          </p>
          <p>
            Length: {value.length} / 6
          </p>
          {completed && (
            <p className="text-success font-medium">Code complete!</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setValue(''); setCompleted(false); }}
          className="px-3 py-1.5 text-sm rounded-lg bg-surface-lighter text-text-secondary hover:bg-surface-lighter/80 transition-colors"
        >
          Reset
        </button>
      </div>
    );
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => (
    <div className="p-4 space-y-6">
      <PinInput
        label="SMS Code"
        description="We sent a code to +1 (555) 123-4567"
        length={6}
        autoFocus
      />
      <PinInput
        label="Backup Code"
        description="Enter one of your backup codes"
        type="alphanumeric"
        length={8}
        placeholder="-"
        size="sm"
      />
    </div>
  ),
};
