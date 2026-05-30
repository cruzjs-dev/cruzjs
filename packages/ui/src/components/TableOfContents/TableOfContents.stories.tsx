import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { TableOfContents } from './TableOfContents';
import type { TocItem } from './TableOfContents';

const meta = {
  title: 'Navigation/TableOfContents',
  component: TableOfContents,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Navigation sidebar showing document headings with active section tracking and smooth scrolling.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof TableOfContents>;

export default meta;
type Story = StoryObj<typeof meta>;

const docItems: TocItem[] = [
  { id: 'overview', label: 'Overview', level: 1 },
  { id: 'getting-started', label: 'Getting Started', level: 2 },
  { id: 'installation', label: 'Installation', level: 3 },
  { id: 'configuration', label: 'Configuration', level: 3 },
  { id: 'architecture', label: 'Architecture', level: 2 },
  { id: 'api', label: 'API Reference', level: 1 },
  { id: 'hooks', label: 'Hooks', level: 2 },
  { id: 'components', label: 'Components', level: 2 },
  { id: 'utilities', label: 'Utilities', level: 2 },
  { id: 'changelog', label: 'Changelog', level: 1 },
];

export const Default: Story = {
  args: {
    items: docItems,
  },
  render: () => (
    <div className="max-w-xs">
      <TableOfContents items={docItems} />
    </div>
  ),
};

export const WithActive: Story = {
  args: {
    items: docItems,
  },
  render: () => {
    const [activeId, setActiveId] = useState('architecture');
    return (
      <div className="max-w-xs">
        <TableOfContents items={docItems} activeId={activeId} onItemClick={setActiveId} />
      </div>
    );
  },
};

const deepItems: TocItem[] = [
  {
    id: 'h1',
    label: 'Top Level Heading',
    level: 1,
    children: [
      {
        id: 'h2',
        label: 'Second Level',
        level: 2,
        children: [
          {
            id: 'h3',
            label: 'Third Level',
            level: 3,
            children: [
              {
                id: 'h4',
                label: 'Fourth Level',
                level: 4,
                children: [
                  { id: 'h5', label: 'Fifth Level', level: 5 },
                  { id: 'h6', label: 'Sixth Level', level: 6 },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { id: 'another-h1', label: 'Another Top Level', level: 1 },
];

export const DeepNesting: Story = {
  args: {
    items: deepItems,
  },
  render: () => (
    <div className="max-w-xs">
      <TableOfContents items={deepItems} activeId="h4" />
    </div>
  ),
};

export const Sizes: Story = {
  args: {
    items: docItems,
  },
  render: () => (
    <div className="flex gap-8">
      <div className="max-w-xs">
        <p className="text-xs font-medium text-text-tertiary mb-2">Small</p>
        <TableOfContents items={docItems.slice(0, 5)} size="sm" activeId="getting-started" />
      </div>
      <div className="max-w-xs">
        <p className="text-xs font-medium text-text-tertiary mb-2">Medium (default)</p>
        <TableOfContents items={docItems.slice(0, 5)} size="md" activeId="getting-started" />
      </div>
      <div className="max-w-xs">
        <p className="text-xs font-medium text-text-tertiary mb-2">Large</p>
        <TableOfContents items={docItems.slice(0, 5)} size="lg" activeId="getting-started" />
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
    items: docItems,
  },
  render: () => {
    const [activeId, setActiveId] = useState('api');
    return (
      <div className="p-4">
        <TableOfContents items={docItems} activeId={activeId} onItemClick={setActiveId} size="lg" />
      </div>
    );
  },
};
