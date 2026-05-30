import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  Notification,
  NotificationProvider,
  useNotifications,
} from './Notification';
import type { NotificationVariant, NotificationPosition } from './Notification';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Feedback/Notification',
  component: Notification,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Toast-style notification system with a provider + imperative API. Supports info, success, warning, and error variants with auto-dismiss, hover pause, progress bar, and action buttons.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['info', 'success', 'warning', 'error'] },
    title: { control: 'text' },
    message: { control: 'text' },
    closable: { control: 'boolean' },
    duration: { control: 'number' },
  },
  args: {
    variant: 'info',
    title: 'Notification',
    message: 'This is an informational notification.',
    closable: true,
  },
} satisfies Meta<typeof Notification>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ───────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── Variants ──────────────────────────────────────────────────────────────

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['info', 'success', 'warning', 'error'] as const).map((variant) => (
        <Notification
          key={variant}
          variant={variant}
          title={`${variant.charAt(0).toUpperCase()}${variant.slice(1)}`}
          message={`This is a ${variant} notification with a title and description.`}
        />
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All four variants side by side: info, success, warning, error. Each has a tonal background and matching icon.',
      },
    },
  },
};

// ─── WithAction ────────────────────────────────────────────────────────────

export const WithAction: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Notification
        variant="error"
        title="Deployment failed"
        message="Build step 3/5 exited with code 1."
        action={{ label: 'View logs', onClick: () => alert('Opening logs...') }}
      />
      <Notification
        variant="success"
        title="File uploaded"
        message="report-2026.pdf was uploaded successfully."
        action={{ label: 'Undo', onClick: () => alert('Undoing...') }}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Notifications with an action button that can trigger callbacks.',
      },
    },
  },
};

// ─── Persistent ────────────────────────────────────────────────────────────

export const Persistent: Story = {
  render: () => (
    <Notification
      variant="warning"
      title="Session expiring"
      message="Your session will expire in 5 minutes. Save your work."
      closable={true}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'A notification with duration=0 never auto-dismisses. The user must click the close button.',
      },
    },
  },
};

// ─── Positions ─────────────────────────────────────────────────────────────

function PositionDemo() {
  const [position, setPosition] = useState<NotificationPosition>('top-right');
  const positions: NotificationPosition[] = [
    'top-right',
    'top-left',
    'top-center',
    'bottom-right',
    'bottom-left',
    'bottom-center',
  ];

  return (
    <NotificationProvider position={position}>
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-sm text-text-secondary">
          Current position: <strong className="text-text-strong">{position}</strong>
        </p>
        <div className="flex flex-wrap gap-2">
          {positions.map((pos) => (
            <button
              key={pos}
              onClick={() => setPosition(pos)}
              className={[
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150',
                pos === position
                  ? 'bg-primary text-white'
                  : 'bg-surface-lighter text-text-secondary hover:text-text',
              ].join(' ')}
            >
              {pos}
            </button>
          ))}
        </div>
        <ShowButton />
      </div>
    </NotificationProvider>
  );
}

function ShowButton() {
  const { show } = useNotifications();
  const variants: NotificationVariant[] = ['info', 'success', 'warning', 'error'];

  return (
    <button
      onClick={() => {
        const variant = variants[Math.floor(Math.random() * variants.length)];
        show({
          title: `${variant.charAt(0).toUpperCase()}${variant.slice(1)} notification`,
          message: 'This toast appeared at the selected position.',
          variant,
          duration: 5000,
        });
      }}
      className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors duration-150"
    >
      Show notification
    </button>
  );
}

export const Positions: Story = {
  render: () => <PositionDemo />,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Interactive demo for all six notification positions. Click the buttons to change the anchor point, then trigger a toast.',
      },
    },
  },
};

// ─── Stacked ───────────────────────────────────────────────────────────────

function StackedDemo() {
  return (
    <NotificationProvider position="top-right" maxVisible={5}>
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-sm text-text-secondary">
          Notifications stack vertically. Max visible: 5. Extras are queued.
        </p>
        <StackedButtons />
      </div>
    </NotificationProvider>
  );
}

function StackedButtons() {
  const { show, closeAll } = useNotifications();
  const variants: NotificationVariant[] = ['info', 'success', 'warning', 'error'];

  return (
    <div className="flex gap-2">
      <button
        onClick={() => {
          for (let i = 0; i < 7; i++) {
            const variant = variants[i % variants.length];
            show({
              title: `Notification ${i + 1}`,
              message: `This is stacked notification #${i + 1}.`,
              variant,
              duration: 8000,
            });
          }
        }}
        className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors duration-150"
      >
        Show 7 notifications
      </button>
      <button
        onClick={() => closeAll()}
        className="px-4 py-2 bg-surface-lighter text-text-secondary text-sm font-medium rounded-lg hover:text-text transition-colors duration-150"
      >
        Clear all
      </button>
    </div>
  );
}

export const Stacked: Story = {
  render: () => <StackedDemo />,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Demonstrates notification stacking. Shows 7 notifications but only 5 are visible at once (the rest are queued). Click "Clear all" to dismiss everything.',
      },
    },
  },
};
