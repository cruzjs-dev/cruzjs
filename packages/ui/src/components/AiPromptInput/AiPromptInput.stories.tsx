import type { Meta, StoryObj } from '@storybook/react';
import { AiPromptInput } from './AiPromptInput';

const meta = {
  title: 'Input/AiPromptInput',
  component: AiPromptInput,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Chat-style AI prompt input with auto-expanding textarea, send button, attach, and streaming display.',
      },
    },
  },
  argTypes: {
    maxRows: { control: { type: 'number', min: 1, max: 20 } },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof AiPromptInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Ask anything...',
  },
};

export const WithAttach: Story = {
  args: {
    placeholder: 'Type a message...',
    onAttach: () => alert('Attach clicked'),
  },
};

export const Loading: Story = {
  args: {
    placeholder: 'Waiting for response...',
    loading: true,
    value: 'What is the meaning of life?',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Input is disabled',
    disabled: true,
  },
};

export const WithActions: Story = {
  args: {
    placeholder: 'Ask anything...',
    onAttach: () => alert('Attach clicked'),
    actions: (
      <button
        type="button"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text hover:bg-surface-lighter transition-colors duration-150"
        aria-label="Voice input"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path d="M19 10v2a7 7 0 01-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>
    ),
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => (
    <div className="p-4">
      <AiPromptInput
        placeholder="Ask anything..."
        onAttach={() => alert('Attach clicked')}
      />
    </div>
  ),
};
