import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { FeedView } from './FeedView';
import type { FeedItem } from './FeedView';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Data/FeedView',
  component: FeedView,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Activity/comment stream with upvote, reply, and threaded comments. Zero domain coupling — suitable for social feeds, activity logs, and comment threads.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['feed', 'compact'] },
    showReplyInput: { control: 'boolean' },
    maxDepth: { control: { type: 'number', min: 0, max: 10 } },
  },
  args: {
    variant: 'feed',
    showReplyInput: true,
    maxDepth: 3,
  },
} satisfies Meta<typeof FeedView>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'primary' }) => (
  <span
    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
    style={{
      backgroundColor: `color-mix(in srgb, var(--color-${color}) 12%, var(--color-surface))`,
      color: `var(--color-${color})`,
    }}
  >
    {children}
  </span>
);

const defaultItems: FeedItem[] = [
  {
    id: '1',
    author: { name: 'Sarah Chen', avatarSrc: 'https://i.pravatar.cc/150?u=sarah' },
    content: 'Just deployed v2.4.0 to production. All green across the board!',
    timestamp: '2 hours ago',
    upvotes: 12,
    upvoted: false,
    metadata: <Badge color="success">Shipped</Badge>,
  },
  {
    id: '2',
    author: { name: 'Marcus Johnson' },
    content: 'Has anyone looked into the latency spike we saw this morning? Dashboard was showing P99 > 500ms for about 20 minutes.',
    timestamp: '4 hours ago',
    upvotes: 3,
    upvoted: false,
  },
  {
    id: '3',
    author: { name: 'Priya Patel', avatarSrc: 'https://i.pravatar.cc/150?u=priya' },
    content: (
      <div>
        <p>Updated the design system tokens for dark mode. Changes include:</p>
        <ul className="list-disc ml-4 mt-1 space-y-0.5">
          <li>Surface colors adjusted for better contrast</li>
          <li>Text-muted lightened by 10%</li>
          <li>Border opacity reduced</li>
        </ul>
      </div>
    ),
    timestamp: '6 hours ago',
    upvotes: 8,
    upvoted: true,
  },
  {
    id: '4',
    author: { name: 'Alex Rivera' },
    content: 'Reminder: standup is moved to 10:30 tomorrow due to the all-hands.',
    timestamp: '1 day ago',
    upvotes: 0,
    upvoted: false,
    metadata: <Badge color="info">Announcement</Badge>,
  },
];

// ─── Stories ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    items: defaultItems,
  },
};

export const WithReplies: Story = {
  args: {
    items: [
      {
        id: '1',
        author: { name: 'Sarah Chen', avatarSrc: 'https://i.pravatar.cc/150?u=sarah' },
        content: 'Should we migrate to the new API version this sprint?',
        timestamp: '3 hours ago',
        upvotes: 5,
        replies: [
          {
            id: '1-1',
            author: { name: 'Marcus Johnson' },
            content: 'I think we should wait until the docs are finalized. Last time we migrated early it caused a lot of rework.',
            timestamp: '2 hours ago',
            upvotes: 2,
            replies: [
              {
                id: '1-1-1',
                author: { name: 'Sarah Chen', avatarSrc: 'https://i.pravatar.cc/150?u=sarah' },
                content: 'Good point. Let me check with the API team on the timeline.',
                timestamp: '1 hour ago',
                upvotes: 1,
              },
            ],
          },
          {
            id: '1-2',
            author: { name: 'Priya Patel', avatarSrc: 'https://i.pravatar.cc/150?u=priya' },
            content: 'The breaking changes look minimal. I already have a branch with the migration mostly done.',
            timestamp: '1.5 hours ago',
            upvotes: 3,
          },
        ],
      },
      {
        id: '2',
        author: { name: 'Alex Rivera' },
        content: 'New CI pipeline is 40% faster after switching to parallel test execution.',
        timestamp: '5 hours ago',
        upvotes: 15,
        metadata: <Badge color="success">Performance</Badge>,
      },
    ],
  },
};

export const WithUpvotes: Story = {
  args: {
    items: [
      {
        id: '1',
        author: { name: 'Sarah Chen', avatarSrc: 'https://i.pravatar.cc/150?u=sarah' },
        content: 'Proposed: we adopt a 2-week sprint cycle starting next month.',
        timestamp: '1 day ago',
        upvotes: 24,
        upvoted: true,
      },
      {
        id: '2',
        author: { name: 'Marcus Johnson' },
        content: 'Can we revisit the error handling strategy? Current approach is inconsistent across services.',
        timestamp: '2 days ago',
        upvotes: 18,
        upvoted: true,
      },
      {
        id: '3',
        author: { name: 'Priya Patel', avatarSrc: 'https://i.pravatar.cc/150?u=priya' },
        content: 'Added TypeScript strict mode to all packages. 47 type errors fixed.',
        timestamp: '3 days ago',
        upvotes: 31,
        upvoted: false,
      },
      {
        id: '4',
        author: { name: 'Alex Rivera' },
        content: 'Documentation sprint next week: each team owns their service docs.',
        timestamp: '4 days ago',
        upvotes: 7,
        upvoted: false,
      },
    ],
    onUpvote: () => {},
  },
};

export const Interactive: Story = {
  render: function InteractiveStory() {
    const [items, setItems] = useState<FeedItem[]>([
      {
        id: '1',
        author: { name: 'Sarah Chen', avatarSrc: 'https://i.pravatar.cc/150?u=sarah' },
        content: 'Welcome to the team feed! Try upvoting or replying.',
        timestamp: 'Just now',
        upvotes: 0,
        upvoted: false,
        replies: [],
      },
      {
        id: '2',
        author: { name: 'Marcus Johnson' },
        content: 'Excited to see the new feed component in action.',
        timestamp: '5 minutes ago',
        upvotes: 2,
        upvoted: false,
        replies: [],
      },
    ]);

    const handleUpvote = (itemId: string) => {
      setItems((prev) =>
        prev.map((item) =>
          updateItemUpvote(item, itemId),
        ),
      );
    };

    const handleReply = (itemId: string, content: string) => {
      setItems((prev) =>
        prev.map((item) =>
          addReplyToItem(item, itemId, content),
        ),
      );
    };

    return (
      <FeedView
        items={items}
        onUpvote={handleUpvote}
        onReply={handleReply}
      />
    );
  },
};

export const Compact: Story = {
  args: {
    items: defaultItems,
    variant: 'compact',
  },
};

export const Empty: Story = {
  args: {
    items: [],
    emptyMessage: 'No activity yet. Be the first to post!',
  },
};

export const DeepThread: Story = {
  args: {
    maxDepth: 2,
    items: [
      {
        id: '1',
        author: { name: 'Level 0' },
        content: 'Top-level post (depth 0)',
        timestamp: '4 hours ago',
        replies: [
          {
            id: '1-1',
            author: { name: 'Level 1' },
            content: 'First reply (depth 1)',
            timestamp: '3 hours ago',
            replies: [
              {
                id: '1-1-1',
                author: { name: 'Level 2' },
                content: 'Second reply (depth 2 -- max depth reached)',
                timestamp: '2 hours ago',
                replies: [
                  {
                    id: '1-1-1-1',
                    author: { name: 'Level 3' },
                    content: 'Third reply (depth 3 -- should be flattened, no deeper indentation)',
                    timestamp: '1 hour ago',
                    replies: [
                      {
                        id: '1-1-1-1-1',
                        author: { name: 'Level 4' },
                        content: 'Fourth reply (also flattened)',
                        timestamp: '30 minutes ago',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

export const Mobile: Story = {
  args: {
    items: defaultItems,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function updateItemUpvote(item: FeedItem, targetId: string): FeedItem {
  if (item.id === targetId) {
    const wasUpvoted = item.upvoted ?? false;
    return {
      ...item,
      upvoted: !wasUpvoted,
      upvotes: (item.upvotes ?? 0) + (wasUpvoted ? -1 : 1),
    };
  }
  if (item.replies) {
    return {
      ...item,
      replies: item.replies.map((r) => updateItemUpvote(r, targetId)),
    };
  }
  return item;
}

function addReplyToItem(item: FeedItem, targetId: string, content: string): FeedItem {
  if (item.id === targetId) {
    const newReply: FeedItem = {
      id: `${item.id}-reply-${Date.now()}`,
      author: { name: 'You' },
      content,
      timestamp: 'Just now',
      upvotes: 0,
      upvoted: false,
    };
    return {
      ...item,
      replies: [...(item.replies ?? []), newReply],
    };
  }
  if (item.replies) {
    return {
      ...item,
      replies: item.replies.map((r) => addReplyToItem(r, targetId, content)),
    };
  }
  return item;
}
