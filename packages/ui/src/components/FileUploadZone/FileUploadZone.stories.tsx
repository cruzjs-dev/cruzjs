import type { Meta, StoryObj } from '@storybook/react';
import { FileUploadZone } from './FileUploadZone';

const meta = {
  title: 'Forms/FileUploadZone',
  component: FileUploadZone,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Drag-and-drop file upload area with click-to-browse fallback. Supports file type filtering, size limits, and multiple file selection.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    accept: { control: 'text' },
    multiple: { control: 'boolean' },
    maxFiles: { control: 'number' },
    maxSize: { control: 'number' },
    disabled: { control: 'boolean' },
    error: { control: 'text' },
  },
} satisfies Meta<typeof FileUploadZone>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Upload file',
    description: 'Drag and drop or click to browse',
  },
};

export const ImageOnly: Story = {
  args: {
    label: 'Upload image',
    description: 'Only image files are accepted',
    accept: 'image/*',
  },
};

export const MultipleFiles: Story = {
  args: {
    label: 'Upload documents',
    description: 'Select multiple files at once',
    multiple: true,
    maxFiles: 5,
    accept: '.pdf,.doc,.docx,.txt',
  },
};

export const WithMaxSize: Story = {
  args: {
    label: 'Upload attachment',
    description: 'Maximum file size is 5MB',
    maxSize: 5 * 1024 * 1024,
    multiple: true,
  },
};

export const WithError: Story = {
  args: {
    label: 'Required upload',
    error: 'Please upload at least one file',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Upload disabled',
    description: 'This upload zone is currently disabled',
    disabled: true,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-6 max-w-lg">
      <FileUploadZone size="sm" label="Small" />
      <FileUploadZone size="md" label="Medium (default)" />
      <FileUploadZone size="lg" label="Large" />
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
      <FileUploadZone
        label="Photo"
        description="Upload a photo from your device"
        accept="image/*"
      />
      <FileUploadZone
        label="Document"
        description="PDF or Word files"
        accept=".pdf,.doc,.docx"
        multiple
        maxFiles={3}
      />
    </div>
  ),
};
