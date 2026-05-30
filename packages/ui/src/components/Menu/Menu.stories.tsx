import type { Meta, StoryObj } from '@storybook/react';
import { Menu } from './Menu';
import type { MenuItem, MenuGroup } from './Menu';

const meta = {
  title: 'Overlay/Menu',
  component: Menu,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Dropdown action menu with keyboard navigation. Bottom sheet on mobile.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    align: { control: 'select', options: ['start', 'end'] },
  },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultItems: MenuItem[] = [
  { label: 'Edit' },
  { label: 'Duplicate' },
  { label: 'Archive' },
  { label: 'Delete', destructive: true },
];

export const Default: Story = {
  args: {
    trigger: (
      <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all">
        Actions
      </button>
    ),
    items: defaultItems,
  },
};

// --- Icon helper (inline SVGs for story portability) ---

function EditIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M3.5 11H3a1.5 1.5 0 01-1.5-1.5V3A1.5 1.5 0 013 1.5h6.5A1.5 1.5 0 0111 3v.5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M5.5 4V2.5a1 1 0 011-1h3a1 1 0 011 1V4M6.5 7v4M9.5 7v4M3.5 4l.5 9a1.5 1.5 0 001.5 1.5h5A1.5 1.5 0 0012 13l.5-9" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="14" height="4" rx="1" />
      <path d="M2 6v7a1 1 0 001 1h10a1 1 0 001-1V6M6.5 9h3" />
    </svg>
  );
}

export const WithIcons: Story = {
  args: {
    trigger: (
      <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all">
        More Actions
      </button>
    ),
    items: [
      { label: 'Edit', icon: <EditIcon /> },
      { label: 'Duplicate', icon: <CopyIcon /> },
      { label: 'Archive', icon: <ArchiveIcon /> },
      { label: 'Delete', icon: <TrashIcon />, destructive: true },
    ],
  },
};

export const WithGroups: Story = {
  args: {
    trigger: (
      <button className="rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-lighter transition-colors">
        Options
      </button>
    ),
    groups: [
      {
        label: 'Edit',
        items: [
          { label: 'Cut', icon: <EditIcon />, shortcut: '⌘X' },
          { label: 'Copy', icon: <CopyIcon />, shortcut: '⌘C' },
        ],
      },
      {
        label: 'Organize',
        items: [
          { label: 'Archive', icon: <ArchiveIcon /> },
          { label: 'Move to Folder' },
        ],
      },
      {
        items: [
          { label: 'Delete', icon: <TrashIcon />, destructive: true, shortcut: '⌘⌫' },
        ],
      },
    ] satisfies MenuGroup[],
  },
};

export const Destructive: Story = {
  args: {
    trigger: (
      <button className="rounded-xl bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90 active:scale-[0.98] transition-all">
        Danger Zone
      </button>
    ),
    items: [
      { label: 'Remove from team', destructive: true },
      { label: 'Revoke access', destructive: true },
      { label: 'Delete permanently', icon: <TrashIcon />, destructive: true },
    ],
  },
};

export const WithShortcuts: Story = {
  args: {
    trigger: (
      <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all">
        File
      </button>
    ),
    items: [
      { label: 'New File', shortcut: '⌘N' },
      { label: 'Open', shortcut: '⌘O' },
      { label: 'Save', shortcut: '⌘S' },
      { label: 'Save As...', shortcut: '⇧⌘S' },
      { label: 'Export', shortcut: '⌘E' },
    ],
  },
};

export const Disabled: Story = {
  args: {
    trigger: (
      <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all">
        Actions
      </button>
    ),
    items: [
      { label: 'Edit', icon: <EditIcon /> },
      { label: 'Duplicate', icon: <CopyIcon />, disabled: true },
      { label: 'Archive', icon: <ArchiveIcon />, disabled: true },
      { label: 'Delete', icon: <TrashIcon />, destructive: true },
    ],
  },
};

export const Sizes: Story = {
  args: {
    trigger: <button>trigger</button>,
    items: defaultItems,
  },
  render: () => (
    <div className="flex items-start gap-8">
      <div className="text-center">
        <p className="text-xs text-text-tertiary mb-2">Small</p>
        <Menu
          trigger={
            <button className="rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-lighter transition-colors">
              sm
            </button>
          }
          items={defaultItems}
          size="sm"
        />
      </div>
      <div className="text-center">
        <p className="text-xs text-text-tertiary mb-2">Medium (default)</p>
        <Menu
          trigger={
            <button className="rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-lighter transition-colors">
              md
            </button>
          }
          items={defaultItems}
          size="md"
        />
      </div>
      <div className="text-center">
        <p className="text-xs text-text-tertiary mb-2">Large</p>
        <Menu
          trigger={
            <button className="rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-base font-medium text-text-secondary hover:bg-surface-lighter transition-colors">
              lg
            </button>
          }
          items={defaultItems}
          size="lg"
        />
      </div>
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: {
    trigger: <button>trigger</button>,
    items: defaultItems,
  },
  render: () => (
    <div className="p-4">
      <Menu
        trigger={
          <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all">
            Open Menu (Mobile)
          </button>
        }
        items={[
          { label: 'Edit', icon: <EditIcon /> },
          { label: 'Duplicate', icon: <CopyIcon /> },
          { label: 'Archive', icon: <ArchiveIcon /> },
          { label: 'Delete', icon: <TrashIcon />, destructive: true },
        ]}
      />
    </div>
  ),
};
