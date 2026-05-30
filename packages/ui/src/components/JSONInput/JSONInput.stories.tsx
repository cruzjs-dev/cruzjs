import type { Meta, StoryObj } from '@storybook/react';
import { JSONInput } from './JSONInput';

const meta = {
  title: 'Forms/JSONInput',
  component: JSONInput,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'JSON editor textarea with validation, auto-formatting on blur, and line numbers.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof JSONInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Configuration',
    description: 'Enter valid JSON configuration',
  },
};

export const WithDefaultValue: Story = {
  args: {
    label: 'API Response',
    defaultValue: JSON.stringify(
      {
        status: 'success',
        data: {
          users: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
          ],
        },
      },
      null,
      2,
    ),
  },
};

export const Invalid: Story = {
  args: {
    label: 'Broken JSON',
    defaultValue: '{"key": value, missing: "quotes"}',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Read-only Config',
    disabled: true,
    defaultValue: JSON.stringify({ readonly: true, version: '1.0.0' }, null, 2),
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 max-w-lg">
      <JSONInput size="sm" label="Small" defaultValue='{"size": "sm"}' />
      <JSONInput size="md" label="Medium" defaultValue='{"size": "md"}' />
      <JSONInput size="lg" label="Large" defaultValue='{"size": "lg"}' />
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
      <JSONInput
        label="Mobile Config"
        maxHeight="200px"
        defaultValue={JSON.stringify({ mobile: true, responsive: true }, null, 2)}
      />
    </div>
  ),
};
