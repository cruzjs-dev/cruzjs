import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { RichTextEditor } from './RichTextEditor';

const meta = {
  title: 'Forms/RichTextEditor',
  component: RichTextEditor,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Rich text editor with contentEditable, configurable toolbar, and inline formatting support. Zero external dependencies.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof RichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Content',
    placeholder: 'Start writing...',
  },
};

export const WithContent: Story = {
  render: () => {
    const WithContentDemo = () => {
      const [html, setHtml] = useState(
        '<h2>Welcome</h2><p>This is a <strong>rich text</strong> editor with <em>italic</em> and <u>underline</u> support.</p><blockquote>You can add blockquotes too.</blockquote><ul><li>Bullet point one</li><li>Bullet point two</li></ul><p>And even <code>inline code</code> blocks.</p>',
      );
      return (
        <div className="max-w-2xl space-y-4">
          <RichTextEditor
            label="Article body"
            description="Write your article content with rich formatting"
            value={html}
            onChange={setHtml}
          />
          <details className="text-xs">
            <summary className="cursor-pointer text-text-secondary">Raw HTML output</summary>
            <pre className="mt-2 p-3 bg-surface-lighter rounded-lg overflow-auto text-text-tertiary">
              {html}
            </pre>
          </details>
        </div>
      );
    };
    return <WithContentDemo />;
  },
};

export const CustomToolbar: Story = {
  args: {
    label: 'Notes',
    description: 'Only bold, italic, and lists are available',
    placeholder: 'Take some notes...',
    toolbar: ['bold', 'italic', 'bulletList', 'orderedList'],
  },
};

export const MinimalToolbar: Story = {
  args: {
    label: 'Comment',
    placeholder: 'Write a comment...',
    toolbar: ['bold', 'italic'],
  },
};

export const WithError: Story = {
  args: {
    label: 'Description',
    placeholder: 'Enter a description...',
    error: 'Description is required and must be at least 10 characters',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Archived content',
    defaultValue:
      '<p>This editor is <strong>disabled</strong> and cannot be modified.</p><ul><li>Read-only content</li><li>No toolbar interaction</li></ul>',
    disabled: true,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-6 max-w-2xl">
      <RichTextEditor
        size="sm"
        label="Small"
        placeholder="Small editor..."
      />
      <RichTextEditor
        size="md"
        label="Medium (default)"
        placeholder="Medium editor..."
      />
      <RichTextEditor
        size="lg"
        label="Large"
        placeholder="Large editor..."
      />
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
      <RichTextEditor
        label="Post content"
        placeholder="Write your post..."
        toolbar={['bold', 'italic', 'underline', 'heading', 'bulletList']}
      />
      <RichTextEditor
        label="Reply"
        placeholder="Write a reply..."
        toolbar={['bold', 'italic']}
        size="sm"
        error="Reply cannot be empty"
      />
    </div>
  ),
};
