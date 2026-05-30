import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { NotificationTray } from './NotificationTray';
import type { NotificationTrayItem } from './NotificationTray';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const defaultItems: NotificationTrayItem[] = [
  {
    id: '1',
    title: 'Build completed',
    message: 'Production deploy #247 finished in 2m 34s.',
    timestamp: '2 min ago',
    read: true,
  },
  {
    id: '2',
    title: 'New team member',
    message: 'Alice was added to the Engineering team.',
    timestamp: '15 min ago',
    read: true,
  },
  {
    id: '3',
    title: 'API rate limit warning',
    message: 'You have used 85% of your monthly API quota.',
    timestamp: '1 hour ago',
    read: true,
  },
];

const unreadItems: NotificationTrayItem[] = [
  {
    id: '1',
    title: 'Deployment failed',
    message: 'Build step 3/5 exited with code 1. Check logs for details.',
    timestamp: 'Just now',
    read: false,
  },
  {
    id: '2',
    title: 'Invitation accepted',
    message: 'Bob joined your organization "Acme Corp".',
    timestamp: '5 min ago',
    read: false,
  },
  {
    id: '3',
    title: 'Billing update',
    message: 'Your monthly invoice of $49.00 has been processed.',
    timestamp: '30 min ago',
    read: true,
  },
  {
    id: '4',
    title: 'Security alert',
    message: 'New sign-in from Chrome on macOS in San Francisco, CA.',
    timestamp: '2 hours ago',
    read: false,
  },
];

const manyItems: NotificationTrayItem[] = Array.from({ length: 20 }, (_, i) => ({
  id: String(i + 1),
  title: `Notification #${i + 1}`,
  message: i % 3 === 0
    ? `This is a longer notification message to test layout handling for notification #${i + 1}.`
    : i % 3 === 1
      ? `Short message #${i + 1}.`
      : undefined,
  timestamp: i === 0 ? 'Just now' : i < 5 ? `${i * 5} min ago` : `${i} hours ago`,
  read: i >= 3,
}));

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Feedback/NotificationTray',
  component: NotificationTray,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A bell icon trigger with a dropdown panel showing notification items. Supports unread badges, mark-all-read, item click callbacks, empty state, and responsive mobile bottom sheet.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    unreadCount: { control: 'number' },
    emptyMessage: { control: 'text' },
  },
  args: {
    size: 'md',
  },
} satisfies Meta<typeof NotificationTray>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    items: defaultItems,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default notification tray with all read items. No unread badge is shown.',
      },
    },
  },
};

// ─── WithUnread ─────────────────────────────────────────────────────────────

function WithUnreadDemo() {
  const [items, setItems] = useState(unreadItems);

  const handleMarkAllRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const handleItemClick = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  };

  return (
    <NotificationTray
      items={items}
      onMarkAllRead={handleMarkAllRead}
      onItemClick={handleItemClick}
    />
  );
}

export const WithUnread: Story = {
  render: () => <WithUnreadDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Shows unread badge with count. Unread items are highlighted. Clicking an item marks it as read. "Mark all read" clears the badge.',
      },
    },
  },
};

// ─── Empty ──────────────────────────────────────────────────────────────────

export const Empty: Story = {
  args: {
    items: [],
    emptyMessage: 'All caught up!',
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state with a custom message when there are no notifications.',
      },
    },
  },
};

// ─── ManyItems ──────────────────────────────────────────────────────────────

export const ManyItems: Story = {
  args: {
    items: manyItems,
    onMarkAllRead: () => {},
    onItemClick: (id: string) => console.log('Clicked item:', id),
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates scroll behavior with 20 notification items. The panel has a max-height of 400px with overflow scrolling.',
      },
    },
  },
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  args: {
    items: unreadItems,
    onMarkAllRead: () => {},
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'On mobile viewports, the notification panel renders as a bottom sheet with a drag handle indicator, backdrop overlay, and safe-area padding.',
      },
    },
  },
};
