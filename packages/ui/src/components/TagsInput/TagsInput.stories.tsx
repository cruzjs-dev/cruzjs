import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { TagsInput } from './TagsInput';
import type { TagsInputSize } from './TagsInput';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'UI/TagsInput',
  component: TagsInput,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Text input that creates tags/pills from typed text. Supports Enter and configurable character separators, duplicate rejection, max tag limits, and controlled/uncontrolled modes.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    maxTags: { control: 'number' },
    allowDuplicates: { control: 'boolean' },
    label: { control: 'text' },
    description: { control: 'text' },
    error: { control: 'text' },
    placeholder: { control: 'text' },
  },
  args: {
    size: 'md',
    placeholder: 'Type and press Enter...',
  },
} satisfies Meta<typeof TagsInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const allSizes: TagsInputSize[] = ['sm', 'md', 'lg'];

// ─── Default ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    label: 'Tags',
    description: 'Press Enter or type a comma to add a tag',
  },
};

// ─── WithDefaults ─────────────────────────────────────────────────────────────

export const WithDefaults: Story = {
  args: {
    label: 'Technologies',
    defaultValue: ['React', 'TypeScript', 'Tailwind CSS', 'Cloudflare'],
    placeholder: 'Add more...',
  },
  parameters: {
    docs: {
      description: {
        story: 'Pre-populated with default tags. Tags can be removed by clicking the X button or pressing Backspace.',
      },
    },
  },
};

// ─── MaxTags ──────────────────────────────────────────────────────────────────

export const MaxTags: Story = {
  render: () => {
    const [tags, setTags] = useState(['React', 'Vue']);
    return (
      <div className="space-y-2">
        <TagsInput
          label="Frameworks (max 3)"
          description="You can add up to 3 tags"
          value={tags}
          onChange={setTags}
          maxTags={3}
          placeholder="Add framework..."
        />
        <p className="text-xs text-text-tertiary">
          {tags.length}/3 tags used
        </p>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Input stops accepting new tags once the maxTags limit is reached. The input becomes disabled at the limit.',
      },
    },
  },
};

// ─── CustomSeparator ──────────────────────────────────────────────────────────

export const CustomSeparator: Story = {
  args: {
    label: 'Email addresses',
    description: 'Separate with semicolons or press Enter',
    separator: [';', 'Enter'],
    placeholder: 'user@example.com',
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom separator configured to semicolons instead of the default comma. Enter still works.',
      },
    },
  },
};

// ─── WithError ────────────────────────────────────────────────────────────────

export const WithError: Story = {
  args: {
    label: 'Categories',
    defaultValue: ['invalid-tag'],
    error: 'One or more tags are invalid. Please remove them and try again.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state with a red border and error message displayed below the input.',
      },
    },
  },
};

// ─── Disabled ─────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  args: {
    label: 'Skills',
    defaultValue: ['React', 'TypeScript', 'Node.js'],
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled state prevents adding or removing tags. Remove buttons are hidden and the input is not interactive.',
      },
    },
  },
};

// ─── Sizes ────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {allSizes.map((size) => (
        <TagsInput
          key={size}
          label={`Size: ${size}`}
          size={size}
          defaultValue={['React', 'Vue', 'Angular']}
          placeholder="Add more..."
        />
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Small, medium, and large sizes showing proportional scaling of the container, tags, and input text.',
      },
    },
  },
};

// ─── Mobile ───────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      <TagsInput
        label="Tags"
        defaultValue={['React', 'TypeScript', 'Tailwind', 'Vite', 'Cloudflare']}
        placeholder="Add tag..."
        size="md"
      />
      <TagsInput
        label="With error"
        defaultValue={['broken']}
        error="Invalid tag format"
        size="md"
      />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'TagsInput rendered at 375px mobile viewport width. Tags wrap naturally within the container.',
      },
    },
  },
};
