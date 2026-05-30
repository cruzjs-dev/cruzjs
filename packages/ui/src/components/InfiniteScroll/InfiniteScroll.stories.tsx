import React, { useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { InfiniteScroll } from './InfiniteScroll';
import { Spinner } from '../Spinner';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Data Display/InfiniteScroll',
  component: InfiniteScroll,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Triggers loading more content when scrolling near the bottom. Uses IntersectionObserver on a sentinel element for efficient scroll detection with configurable threshold.',
      },
    },
  },
  argTypes: {
    hasMore: { control: 'boolean' },
    loading: { control: 'boolean' },
    threshold: { control: 'number' },
  },
  args: {
    hasMore: true,
    loading: false,
    threshold: 200,
  },
} satisfies Meta<typeof InfiniteScroll>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Item = { id: number; title: string };

function generateItems(start: number, count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({
    id: start + i,
    title: `Item ${start + i}`,
  }));
}

const ItemRow: React.FC<{ item: Item }> = ({ item }) => (
  <div className="px-4 py-3 border-b border-surface-border last:border-b-0">
    <p className="text-sm text-text-primary font-medium">{item.title}</p>
    <p className="text-xs text-text-secondary mt-0.5">
      Row content for item #{item.id}
    </p>
  </div>
);

const SimulatedInfiniteList: React.FC<{
  totalItems?: number;
  pageSize?: number;
  threshold?: number;
  loader?: React.ReactNode;
  endMessage?: React.ReactNode;
}> = ({
  totalItems = 60,
  pageSize = 15,
  threshold,
  loader,
  endMessage,
}) => {
  const [items, setItems] = useState<Item[]>(() => generateItems(1, pageSize));
  const [loading, setLoading] = useState(false);

  const hasMore = items.length < totalItems;

  const loadMore = useCallback(() => {
    setLoading(true);
    // Simulate async data fetch
    setTimeout(() => {
      setItems((prev) => [
        ...prev,
        ...generateItems(prev.length + 1, Math.min(pageSize, totalItems - prev.length)),
      ]);
      setLoading(false);
    }, 800);
  }, [pageSize, totalItems]);

  return (
    <div className="max-h-[400px] overflow-y-auto rounded-2xl border border-surface-border bg-surface">
      <InfiniteScroll
        onLoadMore={loadMore}
        hasMore={hasMore}
        loading={loading}
        threshold={threshold}
        loader={loader}
        endMessage={endMessage}
      >
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </InfiniteScroll>
    </div>
  );
};

// ─── Default ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => <SimulatedInfiniteList />,
  parameters: {
    docs: {
      description: {
        story:
          'Interactive infinite scroll with simulated async loading. Scroll to the bottom of the container to load more items. Loads 15 items at a time up to 60 total.',
      },
    },
  },
};

// ─── WithEndMessage ───────────────────────────────────────────────────────────

export const WithEndMessage: Story = {
  render: () => (
    <SimulatedInfiniteList
      totalItems={30}
      pageSize={15}
      endMessage={
        <div className="flex justify-center py-6">
          <p className="text-sm text-text-secondary">
            You have reached the end of the list.
          </p>
        </div>
      }
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Shows a custom end message when all items have been loaded. Scroll to load all 30 items and see the message.',
      },
    },
  },
};

// ─── CustomLoader ─────────────────────────────────────────────────────────────

export const CustomLoader: Story = {
  render: () => (
    <SimulatedInfiniteList
      loader={
        <div className="flex items-center justify-center gap-2 py-4">
          <Spinner size="sm" />
          <span className="text-sm text-text-secondary">Fetching more items...</span>
        </div>
      }
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Uses a custom loader element with a spinner and text label instead of the default centered spinner.',
      },
    },
  },
};

// ─── Mobile ───────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="p-4">
      <SimulatedInfiniteList
        totalItems={40}
        pageSize={10}
        endMessage={
          <div className="flex justify-center py-4">
            <p className="text-xs text-text-secondary">No more items</p>
          </div>
        }
      />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          'Infinite scroll at mobile viewport (375px). Loads 10 items at a time up to 40 total with a compact end message.',
      },
    },
  },
};
