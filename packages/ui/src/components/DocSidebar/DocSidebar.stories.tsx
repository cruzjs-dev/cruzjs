import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { DocSidebar } from './DocSidebar';
import type { DocSidebarSection } from './DocSidebar';

const meta = {
  title: 'Documentation/DocSidebar',
  component: DocSidebar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A sidebar for documentation sites with nested sections, collapsible groups, search filtering, and active item highlighting.',
      },
    },
  },
  argTypes: {
    showSearch: { control: 'boolean' },
    activeId: { control: 'text' },
    searchPlaceholder: { control: 'text' },
  },
} satisfies Meta<typeof DocSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultSections: DocSidebarSection[] = [
  {
    title: 'Getting Started',
    items: [
      { id: 'intro', label: 'Introduction', href: '/docs/intro' },
      { id: 'install', label: 'Installation', href: '/docs/install' },
      { id: 'quickstart', label: 'Quick Start', href: '/docs/quickstart' },
    ],
  },
  {
    title: 'Core Concepts',
    items: [
      { id: 'routing', label: 'Routing', href: '/docs/routing' },
      { id: 'data-loading', label: 'Data Loading', href: '/docs/data-loading' },
      {
        id: 'auth',
        label: 'Authentication',
        children: [
          { id: 'auth-overview', label: 'Overview', href: '/docs/auth/overview' },
          { id: 'auth-email', label: 'Email/Password', href: '/docs/auth/email' },
          { id: 'auth-oauth', label: 'OAuth Providers', href: '/docs/auth/oauth' },
          { id: 'auth-magic', label: 'Magic Links', href: '/docs/auth/magic' },
        ],
      },
      {
        id: 'database',
        label: 'Database',
        children: [
          { id: 'db-schema', label: 'Schema', href: '/docs/db/schema' },
          { id: 'db-migrations', label: 'Migrations', href: '/docs/db/migrations' },
          { id: 'db-queries', label: 'Queries', href: '/docs/db/queries' },
        ],
      },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { id: 'components', label: 'Components', href: '/docs/api/components' },
      { id: 'hooks', label: 'Hooks', href: '/docs/api/hooks' },
      { id: 'utilities', label: 'Utilities', href: '/docs/api/utilities' },
    ],
  },
];

export const Default: Story = {
  args: {
    sections: defaultSections,
  },
  render: (args) => (
    <div className="w-64 h-[600px] border border-surface-border rounded-lg overflow-hidden">
      <DocSidebar {...args} />
    </div>
  ),
};

export const WithSearch: Story = {
  args: {
    sections: defaultSections,
    showSearch: true,
    searchPlaceholder: 'Search docs...',
  },
  render: (args) => (
    <div className="w-64 h-[600px] border border-surface-border rounded-lg overflow-hidden">
      <DocSidebar {...args} />
    </div>
  ),
};

const deepSections: DocSidebarSection[] = [
  {
    title: 'Components',
    items: [
      {
        id: 'layout',
        label: 'Layout',
        children: [
          {
            id: 'container',
            label: 'Container',
            children: [
              { id: 'container-basic', label: 'Basic Usage', href: '/docs/container/basic' },
              { id: 'container-responsive', label: 'Responsive', href: '/docs/container/responsive' },
              { id: 'container-fluid', label: 'Fluid', href: '/docs/container/fluid' },
            ],
          },
          {
            id: 'grid',
            label: 'Grid',
            children: [
              { id: 'grid-basic', label: 'Basic Grid', href: '/docs/grid/basic' },
              { id: 'grid-cols', label: 'Columns', href: '/docs/grid/cols' },
            ],
          },
          { id: 'stack', label: 'Stack', href: '/docs/stack' },
        ],
      },
      {
        id: 'forms',
        label: 'Forms',
        children: [
          { id: 'input', label: 'Input', href: '/docs/input' },
          { id: 'select', label: 'Select', href: '/docs/select' },
          { id: 'checkbox', label: 'Checkbox', href: '/docs/checkbox' },
        ],
      },
    ],
  },
];

export const DeepNesting: Story = {
  args: {
    sections: deepSections,
  },
  render: (args) => (
    <div className="w-72 h-[600px] border border-surface-border rounded-lg overflow-hidden">
      <DocSidebar {...args} />
    </div>
  ),
};

const badgeSections: DocSidebarSection[] = [
  {
    title: 'Components',
    items: [
      {
        id: 'button',
        label: 'Button',
        href: '/docs/button',
        badge: (
          <span className="text-[10px] font-medium bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">
            Stable
          </span>
        ),
      },
      {
        id: 'modal',
        label: 'Modal',
        href: '/docs/modal',
        badge: (
          <span className="text-[10px] font-medium bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">
            Stable
          </span>
        ),
      },
      {
        id: 'data-table',
        label: 'DataTable',
        href: '/docs/data-table',
        badge: (
          <span className="text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">
            Beta
          </span>
        ),
      },
      {
        id: 'chart',
        label: 'Chart',
        href: '/docs/chart',
        badge: (
          <span className="text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">
            New
          </span>
        ),
      },
      {
        id: 'deprecated',
        label: 'LegacyTable',
        href: '/docs/legacy-table',
        badge: (
          <span className="text-[10px] font-medium bg-red-100 text-red-700 rounded-full px-1.5 py-0.5">
            Deprecated
          </span>
        ),
      },
    ],
  },
];

export const WithBadges: Story = {
  args: {
    sections: badgeSections,
  },
  render: (args) => (
    <div className="w-64 h-[400px] border border-surface-border rounded-lg overflow-hidden">
      <DocSidebar {...args} />
    </div>
  ),
};

export const ActiveItem: Story = {
  args: {
    sections: defaultSections,
    activeId: 'auth-email',
  },
  render: (args) => (
    <div className="w-64 h-[600px] border border-surface-border rounded-lg overflow-hidden">
      <DocSidebar {...args} />
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: {
    sections: defaultSections,
    showSearch: true,
    activeId: 'routing',
  },
  render: (args) => (
    <div className="w-full h-screen">
      <DocSidebar {...args} className="w-full h-full" />
    </div>
  ),
};
