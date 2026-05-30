import type { Meta, StoryObj } from '@storybook/react';
import { CopyButton } from './CopyButton';
import type { CopyButtonSize, CopyButtonVariant } from './CopyButton';

// --- Meta ---

const meta = {
  title: 'UI/CopyButton',
  component: CopyButton,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Button that copies text to clipboard and shows a confirmation state. Supports solid, outline, and ghost variants with icon swap animation.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['solid', 'outline', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    copiedLabel: { control: 'text' },
    timeout: { control: 'number' },
  },
  args: {
    value: 'Hello, World!',
    label: 'Copy',
    variant: 'outline',
    size: 'md',
  },
} satisfies Meta<typeof CopyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Helpers ---

const allSizes: CopyButtonSize[] = ['sm', 'md', 'lg'];
const allVariants: CopyButtonVariant[] = ['solid', 'outline', 'ghost'];

// --- Default ---

export const Default: Story = {};

// --- With Custom Label ---

export const WithCustomLabel: Story = {
  args: {
    label: 'Copy URL',
    copiedLabel: 'URL Copied!',
    value: 'https://example.com/api/v1/endpoint',
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom label and copied label for contextual copy buttons.',
      },
    },
  },
};

// --- Ghost ---

export const Ghost: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {allVariants.map((variant) => (
        <div key={variant} className="flex items-center gap-3">
          <CopyButton value="copied text" variant={variant} />
          <span className="text-xs text-text-secondary">{variant}</span>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All three variants: solid, outline, and ghost.',
      },
    },
  },
};

// --- Sizes ---

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-3">
      {allSizes.map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <CopyButton value="copied text" size={size} />
          <span className="text-xs text-text-secondary">{size}</span>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Small, medium, and large sizes.',
      },
    },
  },
};

// --- Disabled ---

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled state prevents copying and shows reduced opacity.',
      },
    },
  },
};
