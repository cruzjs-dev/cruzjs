import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './EmptyState';

// ─── Icons for stories ──────────────────────────────────────────────────────

const InboxIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className ?? 'w-6 h-6'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
  </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className ?? 'w-6 h-6'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
  </svg>
);

const FolderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className ?? 'w-6 h-6'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44z" />
  </svg>
);

// ─── Meta ────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Feedback/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Placeholder UI for empty lists, pages, or search results. Centered layout with optional icon, description, primary action, secondary action, and children slot.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  args: {
    title: 'No items yet',
    description: 'Get started by creating your first item.',
    size: 'md',
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ─────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── WithAction ──────────────────────────────────────────────────────────────

export const WithAction: Story = {
  render: () => (
    <EmptyState
      title="No projects"
      description="Create a project to organize your work."
      action={{ label: 'Create Project', onClick: () => {} }}
    />
  ),
  parameters: {
    docs: {
      description: { story: 'EmptyState with a primary action button (solid variant by default).' },
    },
  },
};

// ─── WithSecondaryAction ─────────────────────────────────────────────────────

export const WithSecondaryAction: Story = {
  render: () => (
    <EmptyState
      title="No results found"
      description="Try adjusting your search or filter criteria."
      icon={<SearchIcon />}
      action={{ label: 'Clear Filters', onClick: () => {}, variant: 'outline' }}
      secondaryAction={{ label: 'Learn More', onClick: () => {} }}
    />
  ),
  parameters: {
    docs: {
      description: { story: 'Both primary (outline variant) and secondary action buttons.' },
    },
  },
};

// ─── WithIcon ────────────────────────────────────────────────────────────────

export const WithIcon: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <EmptyState
        icon={<InboxIcon />}
        title="Your inbox is empty"
        description="Messages from your team will appear here."
      />
      <EmptyState
        icon={<FolderIcon />}
        title="No files uploaded"
        description="Drag and drop files here, or click upload."
        action={{ label: 'Upload File', onClick: () => {} }}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'EmptyState with different icons to set the visual tone.' },
    },
  },
};

// ─── NoDescription ───────────────────────────────────────────────────────────

export const NoDescription: Story = {
  render: () => (
    <EmptyState
      icon={<InboxIcon />}
      title="Nothing here"
    />
  ),
  parameters: {
    docs: {
      description: { story: 'Minimal EmptyState with only icon and title, no description.' },
    },
  },
};

// ─── Sizes ───────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="rounded-xl border border-surface-border bg-surface">
          <EmptyState
            size={size}
            icon={<InboxIcon />}
            title={`Size: ${size}`}
            description={`This is the ${size} size variant.`}
            action={{ label: 'Action', onClick: () => {} }}
          />
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Small, medium, and large sizes with proportional spacing, icon area, and typography.' },
    },
  },
};

// ─── WithChildren ────────────────────────────────────────────────────────────

export const WithChildren: Story = {
  render: () => (
    <EmptyState
      icon={<FolderIcon />}
      title="No documents"
      description="Upload your first document to get started."
    >
      <div className="flex items-center gap-2 text-xs text-text-tertiary mt-1">
        <span>Supported formats:</span>
        <span className="font-mono bg-surface-lighter px-1.5 py-0.5 rounded">.pdf</span>
        <span className="font-mono bg-surface-lighter px-1.5 py-0.5 rounded">.docx</span>
        <span className="font-mono bg-surface-lighter px-1.5 py-0.5 rounded">.txt</span>
      </div>
    </EmptyState>
  ),
  parameters: {
    docs: {
      description: { story: 'EmptyState with custom children rendered below the actions.' },
    },
  },
};

// ─── Mobile ──────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="p-4">
      <EmptyState
        icon={<InboxIcon />}
        title="No notifications"
        description="You're all caught up. New notifications will appear here."
        action={{ label: 'Refresh', onClick: () => {} }}
        secondaryAction={{ label: 'Settings', onClick: () => {} }}
      />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: { story: 'EmptyState rendered at 375px mobile viewport width.' },
    },
  },
};
