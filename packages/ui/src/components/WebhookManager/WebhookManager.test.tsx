import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Webhook } from './WebhookManager';
import { WebhookManager } from './WebhookManager';

const availableEvents = ['user.created', 'user.deleted', 'invoice.paid', 'order.completed'];

const sampleWebhooks: Webhook[] = [
  {
    id: 'wh-1',
    url: 'https://example.com/hooks/1',
    events: ['user.created', 'user.deleted'],
    active: true,
    createdAt: 'Jan 1, 2026',
    lastTriggered: '2 hours ago',
    recentEvents: [
      {
        id: 'evt-1',
        event: 'user.created',
        status: 'success',
        timestamp: 'Jan 10, 2026 12:00',
        responseCode: 200,
        duration: 120,
      },
      {
        id: 'evt-2',
        event: 'user.deleted',
        status: 'failed',
        timestamp: 'Jan 10, 2026 12:05',
        responseCode: 500,
        duration: 3500,
      },
    ],
  },
  {
    id: 'wh-2',
    url: 'https://example.com/hooks/2',
    events: ['invoice.paid'],
    active: false,
    createdAt: 'Feb 15, 2026',
  },
];

describe('WebhookManager', () => {
  it('renders webhook URLs', () => {
    render(<WebhookManager webhooks={sampleWebhooks} availableEvents={availableEvents} />);
    expect(screen.getByText('https://example.com/hooks/1')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/hooks/2')).toBeInTheDocument();
  });

  it('renders event badges', () => {
    render(<WebhookManager webhooks={sampleWebhooks} availableEvents={availableEvents} />);
    expect(screen.getByText('user.created')).toBeInTheDocument();
    expect(screen.getByText('user.deleted')).toBeInTheDocument();
    expect(screen.getByText('invoice.paid')).toBeInTheDocument();
  });

  it('renders active/inactive toggles', () => {
    render(<WebhookManager webhooks={sampleWebhooks} availableEvents={availableEvents} />);
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(2);
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');
    expect(switches[1]).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onToggle when switch clicked', () => {
    const handleToggle = vi.fn();
    render(
      <WebhookManager
        webhooks={sampleWebhooks}
        availableEvents={availableEvents}
        onToggle={handleToggle}
      />,
    );
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    expect(handleToggle).toHaveBeenCalledWith('wh-1', false);
  });

  it('calls onDelete when delete clicked', () => {
    const handleDelete = vi.fn();
    render(
      <WebhookManager
        webhooks={sampleWebhooks}
        availableEvents={availableEvents}
        onDelete={handleDelete}
      />,
    );
    const deleteButtons = screen.getAllByLabelText('Delete webhook');
    fireEvent.click(deleteButtons[0]);
    expect(handleDelete).toHaveBeenCalledWith('wh-1');
  });

  it('calls onTest when test clicked', () => {
    const handleTest = vi.fn();
    render(
      <WebhookManager
        webhooks={sampleWebhooks}
        availableEvents={availableEvents}
        onTest={handleTest}
      />,
    );
    const testButtons = screen.getAllByLabelText('Test webhook');
    fireEvent.click(testButtons[0]);
    expect(handleTest).toHaveBeenCalledWith('wh-1');
  });

  it('shows add form and calls onAdd', () => {
    const handleAdd = vi.fn();
    render(
      <WebhookManager
        webhooks={sampleWebhooks}
        availableEvents={availableEvents}
        onAdd={handleAdd}
      />,
    );

    // Open form
    fireEvent.click(screen.getByText('Add Webhook'));
    const form = screen.getByTestId('add-webhook-form');
    expect(form).toBeInTheDocument();

    // Fill URL
    const urlInput = screen.getByPlaceholderText('https://example.com/webhooks');
    fireEvent.change(urlInput, { target: { value: 'https://test.com/hook' } });

    // Select an event
    const eventCheckbox = screen.getByLabelText('user.created');
    fireEvent.click(eventCheckbox);

    // Submit
    fireEvent.click(screen.getByText('Create'));
    expect(handleAdd).toHaveBeenCalledWith('https://test.com/hook', ['user.created']);
  });

  it('shows loading state', () => {
    render(
      <WebhookManager
        webhooks={[]}
        availableEvents={availableEvents}
        loading={true}
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows empty message', () => {
    render(
      <WebhookManager
        webhooks={[]}
        availableEvents={availableEvents}
        emptyMessage="No webhooks yet"
      />,
    );
    expect(screen.getByText('No webhooks yet')).toBeInTheDocument();
  });

  it('renders event log entries', () => {
    render(<WebhookManager webhooks={sampleWebhooks} availableEvents={availableEvents} />);

    // Expand the event log for the first webhook
    const expandButton = screen.getByLabelText('Expand event log');
    fireEvent.click(expandButton);

    // Check event log content
    expect(screen.getByText('Jan 10, 2026 12:00')).toBeInTheDocument();
    expect(screen.getByText('Jan 10, 2026 12:05')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('120ms')).toBeInTheDocument();
    expect(screen.getByText('3500ms')).toBeInTheDocument();
  });
});
