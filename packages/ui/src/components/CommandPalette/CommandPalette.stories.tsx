import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { CommandPalette, type CommandPaletteItem } from './CommandPalette';

const meta = {
  title: 'Navigation/CommandPalette',
  component: CommandPalette,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A Cmd+K command palette with fuzzy search, keyboard navigation, action groups, and shortcut hints. Desktop: centered modal. Mobile: full-screen overlay.',
      },
    },
  },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Sample data ─────────────────────────────────────────────────────────────

function icon(d: string) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const basicItems: CommandPaletteItem[] = [
  {
    id: 'new-project',
    label: 'Create New Project',
    description: 'Start a new project from scratch',
    icon: icon('M12 4.5v15m7.5-7.5h-15'),
    onSelect: () => alert('Create Project'),
  },
  {
    id: 'open-settings',
    label: 'Open Settings',
    description: 'Configure application preferences',
    icon: icon('M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z'),
    onSelect: () => alert('Open Settings'),
  },
  {
    id: 'search-files',
    label: 'Search Files',
    description: 'Find files across the workspace',
    icon: icon('m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z'),
    onSelect: () => alert('Search Files'),
  },
  {
    id: 'invite-member',
    label: 'Invite Team Member',
    icon: icon('M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z'),
    onSelect: () => alert('Invite Member'),
  },
];

const groupedItems: CommandPaletteItem[] = [
  {
    id: 'new-project',
    label: 'Create New Project',
    description: 'Start a new project from scratch',
    icon: icon('M12 4.5v15m7.5-7.5h-15'),
    group: 'Actions',
    onSelect: () => {},
  },
  {
    id: 'import-data',
    label: 'Import Data',
    description: 'Import from CSV or JSON',
    icon: icon('M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5'),
    group: 'Actions',
    onSelect: () => {},
  },
  {
    id: 'dashboard',
    label: 'Go to Dashboard',
    icon: icon('M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z'),
    group: 'Navigation',
    onSelect: () => {},
  },
  {
    id: 'settings',
    label: 'Go to Settings',
    icon: icon('M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z'),
    group: 'Navigation',
    onSelect: () => {},
  },
  {
    id: 'delete-project',
    label: 'Delete Project',
    description: 'Permanently remove this project',
    icon: icon('m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0'),
    group: 'Danger',
    disabled: true,
    onSelect: () => {},
  },
];

const shortcutItems: CommandPaletteItem[] = [
  {
    id: 'new-file',
    label: 'New File',
    description: 'Create a new file',
    shortcut: ['⌘', 'N'],
    icon: icon('M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z'),
    onSelect: () => {},
  },
  {
    id: 'save',
    label: 'Save',
    description: 'Save the current document',
    shortcut: ['⌘', 'S'],
    icon: icon('M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3'),
    onSelect: () => {},
  },
  {
    id: 'find',
    label: 'Find and Replace',
    description: 'Search and replace text',
    shortcut: ['⌘', 'H'],
    icon: icon('m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z'),
    onSelect: () => {},
  },
  {
    id: 'command-palette',
    label: 'Command Palette',
    description: 'Open this dialog',
    shortcut: ['⌘', 'K'],
    icon: icon('M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z'),
    onSelect: () => {},
  },
  {
    id: 'toggle-sidebar',
    label: 'Toggle Sidebar',
    shortcut: ['⌘', 'B'],
    icon: icon('M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12'),
    onSelect: () => {},
  },
];

// ── Stories ──────────────────────────────────────────────────────────────────

function PaletteDemo({
  items,
  placeholder,
  emptyMessage,
  footer,
}: {
  items: CommandPaletteItem[];
  placeholder?: string;
  emptyMessage?: string;
  footer?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
      >
        Open Command Palette
      </button>
      <p className="mt-3 text-sm text-text-tertiary">
        Or press <kbd className="inline-flex items-center justify-center min-w-[20px] px-1 py-0.5 text-[10px] font-mono font-medium leading-none text-text-secondary bg-surface-lighter ring-1 ring-surface-border/50 shadow-[0_1px_0_1px_rgba(0,0,0,0.05)] rounded-md">Cmd</kbd>
        {' + '}
        <kbd className="inline-flex items-center justify-center min-w-[20px] px-1 py-0.5 text-[10px] font-mono font-medium leading-none text-text-secondary bg-surface-lighter ring-1 ring-surface-border/50 shadow-[0_1px_0_1px_rgba(0,0,0,0.05)] rounded-md">K</kbd>
      </p>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        items={items}
        placeholder={placeholder}
        emptyMessage={emptyMessage}
        footer={footer}
      />
    </>
  );
}

export const Default: Story = {
  args: {
    open: false,
    onOpenChange: () => {},
    items: [],
  },
  render: () => <PaletteDemo items={basicItems} />,
};

export const WithGroups: Story = {
  args: {
    open: false,
    onOpenChange: () => {},
    items: [],
  },
  render: () => <PaletteDemo items={groupedItems} />,
};

export const WithShortcuts: Story = {
  args: {
    open: false,
    onOpenChange: () => {},
    items: [],
  },
  render: () => (
    <PaletteDemo
      items={shortcutItems}
      footer={
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center min-w-[16px] px-1 py-0.5 text-[10px] font-mono font-medium leading-none text-text-secondary bg-surface-lighter ring-1 ring-surface-border/50 rounded-md">&uarr;</kbd>
            <kbd className="inline-flex items-center justify-center min-w-[16px] px-1 py-0.5 text-[10px] font-mono font-medium leading-none text-text-secondary bg-surface-lighter ring-1 ring-surface-border/50 rounded-md">&darr;</kbd>
            <span className="text-text-muted ml-0.5">Navigate</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center min-w-[16px] px-1 py-0.5 text-[10px] font-mono font-medium leading-none text-text-secondary bg-surface-lighter ring-1 ring-surface-border/50 rounded-md">&crarr;</kbd>
            <span className="text-text-muted ml-0.5">Select</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center min-w-[16px] px-1 py-0.5 text-[10px] font-mono font-medium leading-none text-text-secondary bg-surface-lighter ring-1 ring-surface-border/50 rounded-md">Esc</kbd>
            <span className="text-text-muted ml-0.5">Close</span>
          </span>
        </div>
      }
    />
  ),
};

export const Empty: Story = {
  args: {
    open: false,
    onOpenChange: () => {},
    items: [],
  },
  render: () => (
    <PaletteDemo
      items={[]}
      emptyMessage="No commands available. Try installing some plugins."
    />
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: {
    open: false,
    onOpenChange: () => {},
    items: [],
  },
  render: () => (
    <div className="p-4">
      <PaletteDemo items={groupedItems} />
    </div>
  ),
};
