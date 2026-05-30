import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Textarea } from './Textarea';

const meta = {
  title: 'Forms/Textarea',
  component: Textarea,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Multi-line text input with label, description, error, auto-resize, and character count.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter your message...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Description',
    description: 'Provide a detailed description of the issue',
    placeholder: 'Describe what happened...',
  },
};

export const WithError: Story = {
  args: {
    label: 'Bio',
    placeholder: 'Tell us about yourself',
    error: 'Bio is required',
    defaultValue: '',
  },
};

export const AutoResize: Story = {
  render: () => {
    const AutoResizeDemo = () => {
      const [value, setValue] = useState('Type here and watch it grow...');
      return (
        <div className="max-w-md">
          <Textarea
            label="Auto-resize textarea"
            description="This textarea grows as you type"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoResize
          />
        </div>
      );
    };
    return <AutoResizeDemo />;
  },
};

export const WithCharCount: Story = {
  render: () => {
    const CharCountDemo = () => {
      const [value, setValue] = useState('');
      return (
        <div className="space-y-4 max-w-md">
          <Textarea
            label="With max length"
            placeholder="Limited to 200 characters"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={200}
          />
          <Textarea
            label="Count without limit"
            placeholder="Shows count without enforcing limit"
            showCount
            defaultValue="Some text here"
          />
        </div>
      );
    };
    return <CharCountDemo />;
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <Textarea size="sm" label="Small" placeholder="Small textarea" />
      <Textarea size="md" label="Medium" placeholder="Medium textarea" />
      <Textarea size="lg" label="Large" placeholder="Large textarea" />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    label: 'Disabled',
    placeholder: 'Cannot edit',
    disabled: true,
    defaultValue: 'This field is read-only',
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => (
    <div className="p-4 space-y-4">
      <Textarea label="Feedback" placeholder="Share your thoughts..." />
      <Textarea
        label="Details"
        placeholder="Add more details..."
        error="This field is required"
      />
      <Textarea
        label="Notes"
        placeholder="Additional notes..."
        maxLength={500}
        autoResize
      />
    </div>
  ),
};
