import type { Meta, StoryObj } from '@storybook/react';
import { MaskInput } from './MaskInput';

const meta = {
  title: 'Forms/MaskInput',
  component: MaskInput,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Masked text input for structured data like phone numbers, credit cards, and dates.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof MaskInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Phone Number',
    mask: '(999) 999-9999',
    description: 'US phone number format',
  },
};

export const CreditCard: Story = {
  args: {
    label: 'Card Number',
    mask: '9999 9999 9999 9999',
    description: '16-digit card number',
  },
};

export const Date: Story = {
  args: {
    label: 'Date of Birth',
    mask: '99/99/9999',
    description: 'MM/DD/YYYY',
  },
};

export const Custom: Story = {
  args: {
    label: 'Product Code',
    mask: 'aaa-9999',
    description: '3 letters followed by 4 digits',
  },
};

export const WithError: Story = {
  args: {
    label: 'Phone Number',
    mask: '(999) 999-9999',
    error: 'Please enter a complete phone number',
    defaultValue: '(555) 123',
  },
};

export const Disabled: Story = {
  args: {
    label: 'SSN',
    mask: '999-99-9999',
    disabled: true,
    defaultValue: '123-45-6789',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 max-w-sm">
      <MaskInput size="sm" label="Small" mask="(999) 999-9999" />
      <MaskInput size="md" label="Medium" mask="(999) 999-9999" />
      <MaskInput size="lg" label="Large" mask="(999) 999-9999" />
    </div>
  ),
};
