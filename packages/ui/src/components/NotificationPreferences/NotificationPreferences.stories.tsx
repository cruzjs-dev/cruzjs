import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { NotificationPreferences } from './NotificationPreferences';
import type { NotificationCategory } from './NotificationPreferences';

const defaultChannels = [
  { id: 'email', label: 'Email' },
  { id: 'push', label: 'Push' },
  { id: 'in-app', label: 'In-App' },
];

const defaultCategories: NotificationCategory[] = [
  {
    id: 'activity',
    title: 'Activity',
    description: 'Notifications about activity on your content',
    items: [
      {
        id: 'comments',
        label: 'Comments',
        description: 'When someone comments on your post',
        channels: { email: true, push: false, 'in-app': true },
      },
      {
        id: 'mentions',
        label: 'Mentions',
        description: 'When someone mentions you',
        channels: { email: true, push: true, 'in-app': true },
      },
      {
        id: 'replies',
        label: 'Replies',
        description: 'When someone replies to your comment',
        channels: { email: false, push: true, 'in-app': true },
      },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing',
    description: 'Promotional and informational emails',
    items: [
      {
        id: 'newsletter',
        label: 'Newsletter',
        description: 'Weekly product updates and tips',
        channels: { email: true, push: false, 'in-app': false },
      },
      {
        id: 'product-updates',
        label: 'Product updates',
        description: 'New features and improvements',
        channels: { email: true, push: false, 'in-app': true },
      },
    ],
  },
];

const allEnabledCategories: NotificationCategory[] = defaultCategories.map((cat) => ({
  ...cat,
  items: cat.items.map((item) => ({
    ...item,
    channels: Object.fromEntries(Object.keys(item.channels).map((k) => [k, true])),
  })),
}));

const meta = {
  title: 'Data/NotificationPreferences',
  component: NotificationPreferences,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Per-channel notification toggle grid. Shows notification types in rows and channels (email/push/in-app) in columns. Zero domain coupling.',
      },
    },
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof NotificationPreferences>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    channels: defaultChannels,
    categories: defaultCategories,
  },
};

export const AllEnabled: Story = {
  args: {
    channels: defaultChannels,
    categories: allEnabledCategories,
  },
};

export const AllDisabled: Story = {
  args: {
    channels: defaultChannels,
    categories: defaultCategories,
    disabled: true,
  },
};

export const Interactive: Story = {
  render: function InteractiveStory() {
    const [categories, setCategories] = useState<NotificationCategory[]>(defaultCategories);

    const handleChange = (itemId: string, channelId: string, enabled: boolean) => {
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((item) =>
            item.id === itemId
              ? { ...item, channels: { ...item.channels, [channelId]: enabled } }
              : item,
          ),
        })),
      );
    };

    return (
      <NotificationPreferences
        channels={defaultChannels}
        categories={categories}
        onChange={handleChange}
      />
    );
  },
};

export const SingleChannel: Story = {
  args: {
    channels: [{ id: 'email', label: 'Email' }],
    categories: [
      {
        id: 'activity',
        title: 'Activity',
        items: [
          {
            id: 'comments',
            label: 'Comments',
            description: 'When someone comments on your post',
            channels: { email: true },
          },
          {
            id: 'mentions',
            label: 'Mentions',
            channels: { email: false },
          },
        ],
      },
    ],
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  args: {
    channels: defaultChannels,
    categories: defaultCategories,
  },
};
