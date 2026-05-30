import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Tree } from './Tree';
import type { TreeNode } from './Tree';

const meta = {
  title: 'Data Display/Tree',
  component: Tree,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Hierarchical tree view with expand/collapse, keyboard navigation, and ARIA attributes.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Tree>;

export default meta;
type Story = StoryObj<typeof meta>;

const fileTree: TreeNode[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      {
        id: 'components',
        label: 'components',
        children: [
          { id: 'button', label: 'Button.tsx' },
          { id: 'input', label: 'Input.tsx' },
          { id: 'modal', label: 'Modal.tsx' },
        ],
      },
      {
        id: 'hooks',
        label: 'hooks',
        children: [
          { id: 'use-auth', label: 'useAuth.ts' },
          { id: 'use-theme', label: 'useTheme.ts' },
        ],
      },
      { id: 'index', label: 'index.ts' },
    ],
  },
  {
    id: 'tests',
    label: 'tests',
    children: [
      { id: 'test-button', label: 'Button.test.tsx' },
      { id: 'test-input', label: 'Input.test.tsx' },
    ],
  },
  { id: 'readme', label: 'README.md' },
  { id: 'package', label: 'package.json' },
];

export const Default: Story = {
  args: {
    data: fileTree,
  },
  render: () => {
    const [selectedId, setSelectedId] = useState<string | undefined>();
    return (
      <div className="max-w-xs">
        <Tree data={fileTree} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
    );
  },
};

const FileIcon: React.FC = () => (
  <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const FolderIcon: React.FC = () => (
  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
  </svg>
);

const iconTree: TreeNode[] = [
  {
    id: 'src',
    label: 'src',
    icon: <FolderIcon />,
    children: [
      {
        id: 'components',
        label: 'components',
        icon: <FolderIcon />,
        children: [
          { id: 'button', label: 'Button.tsx', icon: <FileIcon /> },
          { id: 'input', label: 'Input.tsx', icon: <FileIcon /> },
        ],
      },
      { id: 'index', label: 'index.ts', icon: <FileIcon /> },
    ],
  },
  { id: 'readme', label: 'README.md', icon: <FileIcon /> },
];

export const WithIcons: Story = {
  args: {
    data: iconTree,
  },
  render: () => {
    const [selectedId, setSelectedId] = useState<string | undefined>();
    return (
      <div className="max-w-xs">
        <Tree data={iconTree} selectedId={selectedId} onSelect={setSelectedId} defaultExpanded={['src']} />
      </div>
    );
  },
};

const deepTree: TreeNode[] = [
  {
    id: 'level-1',
    label: 'Level 1',
    children: [
      {
        id: 'level-2',
        label: 'Level 2',
        children: [
          {
            id: 'level-3',
            label: 'Level 3',
            children: [
              {
                id: 'level-4',
                label: 'Level 4',
                children: [
                  { id: 'level-5', label: 'Level 5 - Leaf' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export const DeepNesting: Story = {
  args: {
    data: deepTree,
  },
  render: () => (
    <div className="max-w-sm">
      <Tree data={deepTree} defaultExpanded={['level-1', 'level-2', 'level-3', 'level-4']} />
    </div>
  ),
};

export const Controlled: Story = {
  args: {
    data: fileTree,
  },
  render: () => {
    const [selectedId, setSelectedId] = useState<string>('button');
    return (
      <div className="max-w-xs space-y-4">
        <p className="text-sm text-text-secondary">Selected: <span className="font-mono text-text-strong">{selectedId}</span></p>
        <Tree
          data={fileTree}
          selectedId={selectedId}
          onSelect={setSelectedId}
          defaultExpanded={['src', 'components']}
        />
      </div>
    );
  },
};

const disabledTree: TreeNode[] = [
  {
    id: 'active-folder',
    label: 'Active Folder',
    children: [
      { id: 'file-1', label: 'file-1.ts' },
      { id: 'file-2', label: 'file-2.ts', disabled: true },
    ],
  },
  { id: 'locked-folder', label: 'Locked Folder', disabled: true, children: [{ id: 'hidden', label: 'hidden.ts' }] },
];

export const Disabled: Story = {
  args: {
    data: disabledTree,
  },
  render: () => (
    <div className="max-w-xs">
      <Tree data={disabledTree} defaultExpanded={['active-folder']} />
    </div>
  ),
};

export const Sizes: Story = {
  args: {
    data: fileTree,
  },
  render: () => (
    <div className="flex gap-8">
      <div className="max-w-xs">
        <p className="text-xs font-medium text-text-tertiary mb-2">Small</p>
        <Tree data={fileTree} size="sm" defaultExpanded={['src']} />
      </div>
      <div className="max-w-xs">
        <p className="text-xs font-medium text-text-tertiary mb-2">Medium (default)</p>
        <Tree data={fileTree} size="md" defaultExpanded={['src']} />
      </div>
      <div className="max-w-xs">
        <p className="text-xs font-medium text-text-tertiary mb-2">Large</p>
        <Tree data={fileTree} size="lg" defaultExpanded={['src']} />
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
    data: fileTree,
  },
  render: () => {
    const [selectedId, setSelectedId] = useState<string | undefined>();
    return (
      <div className="p-4">
        <Tree data={fileTree} selectedId={selectedId} onSelect={setSelectedId} size="lg" defaultExpanded={['src']} />
      </div>
    );
  },
};
