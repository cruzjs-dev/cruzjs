import React, { forwardRef, useCallback, useState } from 'react';
import { Spinner } from '../Spinner';
import { Switch } from '../Switch';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WebhookEventStatus = 'success' | 'failed' | 'pending';

export type WebhookEvent = {
  id: string;
  event: string;
  status: WebhookEventStatus;
  timestamp: string;
  responseCode?: number;
  duration?: number;
};

export type Webhook = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
  createdAt: string;
  lastTriggered?: string;
  recentEvents?: WebhookEvent[];
};

export type WebhookManagerProps = React.HTMLAttributes<HTMLDivElement> & {
  webhooks: Webhook[];
  availableEvents: string[];
  onAdd?: (url: string, events: string[]) => void;
  onDelete?: (id: string) => void;
  onToggle?: (id: string, active: boolean) => void;
  onTest?: (id: string) => void;
  loading?: boolean;
  emptyMessage?: string;
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

const statusDotColor: Record<WebhookEventStatus, string> = {
  success: 'bg-success',
  failed: 'bg-danger',
  pending: 'bg-warning',
};

function EventLogTable({ events }: { events: WebhookEvent[] }) {
  return (
    <div className="mt-3 border border-surface-border/50 rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-surface-lighter text-text-tertiary">
            <th className="text-left px-3 py-2 font-medium">Status</th>
            <th className="text-left px-3 py-2 font-medium">Event</th>
            <th className="text-left px-3 py-2 font-medium">Response</th>
            <th className="text-left px-3 py-2 font-medium">Duration</th>
            <th className="text-left px-3 py-2 font-medium">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {events.map((evt) => (
            <tr key={evt.id} className="border-t border-surface-border/50">
              <td className="px-3 py-2">
                <span
                  className={[
                    'inline-block w-2 h-2 rounded-full',
                    statusDotColor[evt.status],
                  ].join(' ')}
                  aria-label={evt.status}
                />
              </td>
              <td className="px-3 py-2 font-mono text-text-secondary">{evt.event}</td>
              <td className="px-3 py-2 text-text-muted">
                {evt.responseCode !== undefined ? evt.responseCode : '-'}
              </td>
              <td className="px-3 py-2 text-text-muted">
                {evt.duration !== undefined ? `${evt.duration}ms` : '-'}
              </td>
              <td className="px-3 py-2 text-text-muted">{evt.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddWebhookForm({
  availableEvents,
  onAdd,
  onCancel,
}: {
  availableEvents: string[];
  onAdd: (url: string, events: string[]) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const toggleEvent = useCallback((event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (url.trim() && selectedEvents.length > 0) {
        onAdd(url.trim(), selectedEvents);
        setUrl('');
        setSelectedEvents([]);
      }
    },
    [url, selectedEvents, onAdd],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="px-5 py-4 border-b border-surface-border/50 bg-surface-lighter/50"
      data-testid="add-webhook-form"
    >
      <div className="space-y-3">
        <div>
          <label htmlFor="webhook-url" className="block text-sm font-medium text-text mb-1">
            Endpoint URL
          </label>
          <input
            id="webhook-url"
            type="url"
            placeholder="https://example.com/webhooks"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2 bg-surface rounded-lg border border-surface-border text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono"
            required
          />
        </div>
        <div>
          <span className="block text-sm font-medium text-text mb-2">Events</span>
          <div className="flex flex-wrap gap-2">
            {availableEvents.map((event) => (
              <label
                key={event}
                className={[
                  'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-colors',
                  selectedEvents.includes(event)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-surface-border bg-surface text-text-secondary hover:border-text-muted',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(event)}
                  onChange={() => toggleEvent(event)}
                  className="sr-only"
                  aria-label={event}
                />
                {event}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={!url.trim() || selectedEvents.length === 0}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text rounded-lg hover:bg-surface-lighter transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

function WebhookRow({
  webhook,
  onDelete,
  onToggle,
  onTest,
}: {
  webhook: Webhook;
  onDelete?: (id: string) => void;
  onToggle?: (id: string, active: boolean) => void;
  onTest?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleTest = useCallback(() => {
    if (!onTest) {
      return;
    }
    setTesting(true);
    onTest(webhook.id);
    // Reset testing state after brief delay
    setTimeout(() => setTesting(false), 1500);
  }, [onTest, webhook.id]);

  const hasEvents = webhook.recentEvents && webhook.recentEvents.length > 0;

  return (
    <div className="px-5 py-4 border-b border-surface-border/50 last:border-b-0">
      <div className="flex items-center gap-3">
        {/* URL + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-text truncate">{webhook.url}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {webhook.events.map((event) => (
              <span
                key={event}
                className="bg-surface-lighter text-text-tertiary text-[11px] rounded-md px-1.5 py-0.5 font-mono"
              >
                {event}
              </span>
            ))}
          </div>
          {webhook.lastTriggered && (
            <span className="text-xs text-text-muted mt-1 block">
              Last triggered: {webhook.lastTriggered}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={webhook.active}
            onChange={(checked) => onToggle?.(webhook.id, checked)}
            size="sm"
            aria-label={webhook.active ? 'Deactivate webhook' : 'Activate webhook'}
          />
          <button
            type="button"
            aria-label="Test webhook"
            disabled={testing}
            onClick={handleTest}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-lighter transition-colors disabled:opacity-50"
          >
            {testing ? (
              <Spinner size="xs" color="current" />
            ) : (
              <SendIcon className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            aria-label="Delete webhook"
            onClick={() => onDelete?.(webhook.id)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-danger hover:bg-danger-subtle transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
          {hasEvents && (
            <button
              type="button"
              aria-label={expanded ? 'Collapse event log' : 'Expand event log'}
              onClick={() => setExpanded((prev) => !prev)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-lighter transition-colors"
            >
              <ChevronDownIcon
                className={[
                  'w-4 h-4 transition-transform duration-200',
                  expanded ? 'rotate-180' : '',
                ].join(' ')}
              />
            </button>
          )}
        </div>
      </div>

      {/* Event log */}
      {expanded && hasEvents && <EventLogTable events={webhook.recentEvents!} />}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const WebhookManager = forwardRef<HTMLDivElement, WebhookManagerProps>(
  function WebhookManager(
    {
      webhooks,
      availableEvents,
      onAdd,
      onDelete,
      onToggle,
      onTest,
      loading = false,
      emptyMessage = 'No webhooks configured',
      className,
      ...divProps
    },
    ref,
  ) {
    const [showAddForm, setShowAddForm] = useState(false);

    const handleAdd = useCallback(
      (url: string, events: string[]) => {
        onAdd?.(url, events);
        setShowAddForm(false);
      },
      [onAdd],
    );

    return (
      <div
        ref={ref}
        className={[
          'bg-surface rounded-xl ring-1 ring-surface-border/50 overflow-hidden',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...divProps}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-border/50 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text">Webhooks</h3>
          {onAdd && (
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Add Webhook
            </button>
          )}
        </div>

        {/* Add form */}
        {showAddForm && onAdd && (
          <AddWebhookForm
            availableEvents={availableEvents}
            onAdd={handleAdd}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : webhooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-5">
            <p className="text-sm text-text-muted mb-3">{emptyMessage}</p>
            {onAdd && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
              >
                Add your first webhook
              </button>
            )}
          </div>
        ) : (
          <div>
            {webhooks.map((webhook) => (
              <WebhookRow
                key={webhook.id}
                webhook={webhook}
                onDelete={onDelete}
                onToggle={onToggle}
                onTest={onTest}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);

WebhookManager.displayName = 'WebhookManager';
