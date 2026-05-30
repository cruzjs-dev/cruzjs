import type { Meta, StoryObj } from '@storybook/react';
import { Breadcrumbs } from './Breadcrumbs';
import type { BreadcrumbItem, BreadcrumbsSize } from './Breadcrumbs';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'UI/Breadcrumbs',
  component: Breadcrumbs,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Accessible breadcrumb navigation component. Supports collapsible middle items, custom separators, icons, and three sizes.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    maxItems: { control: 'number' },
  },
  args: {
    size: 'md',
  },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HomeIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
    <path
      fillRule="evenodd"
      d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z"
      clipRule="evenodd"
    />
  </svg>
);

const FolderIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
  </svg>
);

const DocIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
    <path
      fillRule="evenodd"
      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
      clipRule="evenodd"
    />
  </svg>
);

const ChevronRight = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-text-muted">
    <path
      fillRule="evenodd"
      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
      clipRule="evenodd"
    />
  </svg>
);

const defaultItems: BreadcrumbItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Electronics', href: '/products/electronics' },
  { label: 'Laptops' },
];

const allSizes: BreadcrumbsSize[] = ['sm', 'md', 'lg'];

// ─── Default ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    items: defaultItems,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default breadcrumb navigation with link items and a current page indicator.',
      },
    },
  },
};

// ─── WithIcons ────────────────────────────────────────────────────────────────

export const WithIcons: Story = {
  args: {
    items: [
      { label: 'Home', href: '/', icon: <HomeIcon /> },
      { label: 'Documents', href: '/docs', icon: <FolderIcon /> },
      { label: 'Report.pdf', icon: <DocIcon /> },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Breadcrumbs with icons rendered alongside each label. Icons are decorative and hidden from assistive technology.',
      },
    },
  },
};

// ─── Collapsed ────────────────────────────────────────────────────────────────

export const Collapsed: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/products' },
      { label: 'Electronics', href: '/products/electronics' },
      { label: 'Computers', href: '/products/electronics/computers' },
      { label: 'Laptops', href: '/products/electronics/computers/laptops' },
      { label: 'MacBook Pro' },
    ],
    maxItems: 3,
  },
  parameters: {
    docs: {
      description: {
        story:
          'When items exceed maxItems, middle items are collapsed behind an ellipsis button. Clicking the ellipsis expands to show all items. Here: 6 items with maxItems=3 shows first item, ellipsis, and last 2 items.',
      },
    },
  },
};

// ─── CustomSeparator ──────────────────────────────────────────────────────────

export const CustomSeparator: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">Chevron separator</p>
        <Breadcrumbs items={defaultItems} separator={<ChevronRight />} />
      </div>
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">Arrow separator</p>
        <Breadcrumbs items={defaultItems} separator=">" />
      </div>
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">Dot separator</p>
        <Breadcrumbs items={defaultItems} separator={<span className="text-text-muted">&bull;</span>} />
      </div>
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">Pipe separator</p>
        <Breadcrumbs items={defaultItems} separator="|" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The separator between breadcrumb items can be customized with any string or JSX element. Default is "/".',
      },
    },
  },
};

// ─── Sizes ────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {allSizes.map((size) => (
        <div key={size}>
          <p className="text-xs font-medium text-text-secondary mb-2">Size: {size}</p>
          <Breadcrumbs items={defaultItems} size={size} />
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Three sizes (sm, md, lg) controlling text size, spacing, and icon dimensions.',
      },
    },
  },
};
