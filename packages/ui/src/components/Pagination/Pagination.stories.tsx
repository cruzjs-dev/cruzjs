import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Pagination } from './Pagination';
import type { PaginationSize } from './Pagination';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'UI/Pagination',
  component: Pagination,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Page navigation component with ellipsis truncation, previous/next arrows, and optional first/last buttons. Supports configurable sibling and boundary page counts.',
      },
    },
  },
  argTypes: {
    page: { control: 'number' },
    total: { control: 'number' },
    siblings: { control: 'number' },
    boundaries: { control: 'number' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    showEdges: { control: 'boolean' },
  },
  args: {
    page: 1,
    total: 20,
    siblings: 1,
    boundaries: 1,
    size: 'md',
    showEdges: true,
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const allSizes: PaginationSize[] = ['sm', 'md', 'lg'];

const InteractivePagination: React.FC<{
  total: number;
  initialPage?: number;
  size?: PaginationSize;
  siblings?: number;
  boundaries?: number;
  showEdges?: boolean;
}> = ({ total, initialPage = 1, size, siblings, boundaries, showEdges }) => {
  const [page, setPage] = useState(initialPage);
  return (
    <div className="space-y-2">
      <Pagination
        page={page}
        total={total}
        onChange={setPage}
        size={size}
        siblings={siblings}
        boundaries={boundaries}
        showEdges={showEdges}
      />
      <p className="text-xs text-text-secondary">
        Page {page} of {total}
      </p>
    </div>
  );
};

// ─── Default ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => <InteractivePagination total={20} />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive pagination with 20 pages. Click any page, arrow, or edge button to navigate.',
      },
    },
  },
};

// ─── FewPages ─────────────────────────────────────────────────────────────────

export const FewPages: Story = {
  render: () => <InteractivePagination total={5} />,
  parameters: {
    docs: {
      description: {
        story: 'When the total page count is small, no ellipsis truncation is needed and all pages are shown.',
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
          <p className="text-xs font-medium text-text-secondary mb-2">
            Size: {size}
          </p>
          <InteractivePagination total={10} size={size} />
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Small, medium, and large size variants showing proportional scaling of buttons and text.',
      },
    },
  },
};

// ─── ManyPages ────────────────────────────────────────────────────────────────

export const ManyPages: Story = {
  render: () => <InteractivePagination total={100} initialPage={50} />,
  parameters: {
    docs: {
      description: {
        story: 'Pagination with 100 pages starting at page 50, demonstrating ellipsis truncation on both sides.',
      },
    },
  },
};

// ─── Mobile ───────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="p-4 space-y-6">
      <InteractivePagination total={20} size="sm" />
      <InteractivePagination total={100} initialPage={50} size="sm" showEdges={false} />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Pagination at mobile viewport (375px) using small size. The second example hides edge buttons for a more compact layout.',
      },
    },
  },
};

// ─── CustomSiblings ───────────────────────────────────────────────────────────

export const CustomSiblings: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">siblings=0</p>
        <InteractivePagination total={20} initialPage={10} siblings={0} />
      </div>
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">siblings=1 (default)</p>
        <InteractivePagination total={20} initialPage={10} siblings={1} />
      </div>
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">siblings=2</p>
        <InteractivePagination total={20} initialPage={10} siblings={2} />
      </div>
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">siblings=3</p>
        <InteractivePagination total={20} initialPage={10} siblings={3} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates how the siblings prop controls the number of pages shown on each side of the current page.',
      },
    },
  },
};

// ─── NoEdges ──────────────────────────────────────────────────────────────────

export const NoEdges: Story = {
  render: () => <InteractivePagination total={20} showEdges={false} />,
  parameters: {
    docs: {
      description: {
        story: 'With showEdges=false, the first/last page jump buttons are hidden for a more compact layout.',
      },
    },
  },
};
