import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { useState } from 'react';
import type { Webhook } from './WebhookManager';
import { WebhookManager } from './WebhookManager';

const availableEvents = [
  'user.created',
  'user.updated',
  'user.deleted',
  'invoice.paid',
  'invoice.failed',
  'order.completed',
  'order.cancelled',
];

const sampleWebhooks: Webhook[] = [
  {
    id: 'wh-1',
    url: 'https://api.example.com/webhooks/user-events',
    events: ['user.created', 'user.updated', 'user.deleted'],
    active: true,
    createdAt: 'Jan 15, 2026',
    lastTriggered: '2 hours ago',
    recentEvents: [
      {
        id: 'evt-1',
        event: 'user.created',
        status: 'success',
        timestamp: 'May 25, 2026 10:30',
        responseCode: 200,
        duration: 120,
      },
      {
        id: 'evt-2',
        event: 'user.updated',
        status: 'success',
        timestamp: 'May 25, 2026 09:15',
        responseCode: 200,
        duration: 95,
      },
      {
        id: 'evt-3',
        event: 'user.deleted',
        status: 'failed',
        timestamp: 'May 24, 2026 18:45',
        responseCode: 500,
        duration: 3200,
      },
    ],
  },
  {
    id: 'wh-2',
    url: 'https://billing.internal/hooks/payments',
    events: ['invoice.paid', 'invoice.failed'],
    active: true,
    createdAt: 'Mar 10, 2026',
    lastTriggered: '1 day ago',
    recentEvents: [
      {
        id: 'evt-4',
        event: 'invoice.paid',
        status: 'success',
        timestamp: 'May 24, 2026 14:00',
        responseCode: 200,
        duration: 200,
      },
    ],
  },
  {
    id: 'wh-3',
    url: 'https://slack-bot.company.io/notify',
    events: ['order.completed'],
    active: false,
    createdAt: 'Feb 1, 2026',
  },
];

const meta = {
  title: 'Data/WebhookManager',
  component: WebhookManager,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Webhook CRUD interface with list, detail view, event log, and endpoint tester.',
      },
    },
  },
  argTypes: {
    loading: { control: 'boolean' },
    emptyMessage: { control: 'text' },
  },
} satisfies Meta<typeof WebhookManager>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    webhooks: sampleWebhooks,
    availableEvents,
    onAdd: fn(),
    onDelete: fn(),
    onToggle: fn(),
    onTest: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[640px]">
        <Story />
      </div>
    ),
  ],
};

export const Empty: Story = {
  args: {
    webhooks: [],
    availableEvents,
    onAdd: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[640px]">
        <Story />
      </div>
    ),
  ],
};

export const WithAddForm: Story = {
  args: {
    webhooks: sampleWebhooks.slice(0, 1),
    availableEvents,
    onAdd: fn(),
    onDelete: fn(),
    onToggle: fn(),
    onTest: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[640px]">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('button');
    if (button?.textContent?.includes('Add Webhook')) {
      button.click();
    }
  },
};

export const Loading: Story = {
  args: {
    webhooks: [],
    availableEvents,
    loading: true,
  },
  decorators: [
    (Story) => (
      <div className="w-[640px]">
        <Story />
      </div>
    ),
  ],
};

export const Interactive: Story = {
  render: () => {
    const [webhooks, setWebhooks] = useState<Webhook[]>(sampleWebhooks);

    const handleAdd = (url: string, events: string[]) => {
      setWebhooks((prev) => [
        ...prev,
        {
          id: `wh-${Date.now()}`,
          url,
          events,
          active: true,
          createdAt: 'Just now',
        },
      ]);
    };

    const handleDelete = (id: string) => {
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    };

    const handleToggle = (id: string, active: boolean) => {
      setWebhooks((prev) =>
        prev.map((w) => (w.id === id ? { ...w, active } : w)),
      );
    };

    const handleTest = (id: string) => {
      console.log('Testing webhook:', id);
    };

    return (
      <div className="w-[640px]">
        <WebhookManager
          webhooks={webhooks}
          availableEvents={availableEvents}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onToggle={handleToggle}
          onTest={handleTest}
        />
      </div>
    );
  },
};

export const WithEventLog: Story = {
  args: {
    webhooks: [
      {
        ...sampleWebhooks[0],
        recentEvents: [
          {
            id: 'evt-a',
            event: 'user.created',
            status: 'success' as const,
            timestamp: 'May 25, 2026 10:30',
            responseCode: 200,
            duration: 120,
          },
          {
            id: 'evt-b',
            event: 'user.updated',
            status: 'success' as const,
            timestamp: 'May 25, 2026 09:15',
            responseCode: 201,
            duration: 95,
          },
          {
            id: 'evt-c',
            event: 'user.deleted',
            status: 'failed' as const,
            timestamp: 'May 24, 2026 18:45',
            responseCode: 500,
            duration: 3200,
          },
          {
            id: 'evt-d',
            event: 'user.created',
            status: 'pending' as const,
            timestamp: 'May 24, 2026 17:30',
          },
        ],
      },
    ],
    availableEvents,
    onDelete: fn(),
    onToggle: fn(),
    onTest: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[640px]">
        <Story />
      </div>
    ),
  ],
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => (
    <div className="p-4">
      <WebhookManager
        webhooks={sampleWebhooks}
        availableEvents={availableEvents}
        onAdd={fn()}
        onDelete={fn()}
        onToggle={fn()}
        onTest={fn()}
      />
    </div>
  ),
};
