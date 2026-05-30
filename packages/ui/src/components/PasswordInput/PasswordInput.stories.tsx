import type { Meta, StoryObj } from '@storybook/react';
import { PasswordInput } from './PasswordInput';

const meta = {
  title: 'Forms/PasswordInput',
  component: PasswordInput,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Password input with show/hide toggle, label, description, and error support.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof PasswordInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Password',
    placeholder: 'Enter password...',
  },
};

export const WithError: Story = {
  args: {
    label: 'Password',
    placeholder: 'Enter password...',
    error: 'Password must be at least 8 characters',
    defaultValue: 'short',
  },
};

export const WithDescription: Story = {
  args: {
    label: 'New Password',
    description: 'Must contain at least 8 characters, one uppercase, and one number',
    placeholder: 'Create a strong password',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 max-w-sm">
      <PasswordInput size="sm" label="Small" placeholder="Small password" />
      <PasswordInput size="md" label="Medium" placeholder="Medium password" />
      <PasswordInput size="lg" label="Large" placeholder="Large password" />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    label: 'Password',
    placeholder: 'Cannot edit',
    disabled: true,
    defaultValue: 'secretpassword',
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => (
    <div className="p-4 space-y-4">
      <PasswordInput label="Current Password" placeholder="Enter current password" />
      <PasswordInput label="New Password" placeholder="Enter new password" description="Min 8 characters" />
      <PasswordInput label="Confirm Password" placeholder="Confirm new password" error="Passwords do not match" />
    </div>
  ),
};
