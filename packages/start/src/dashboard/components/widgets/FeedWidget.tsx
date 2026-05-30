import { getTRPC } from '@cruzjs/core/trpc/client';

interface FeedWidgetProps {
  title: string;
  config: {
    limit?: number;
    [key: string]: unknown;
  };
}

const EVENT_TYPE_STYLES: Record<string, string> = {
  EXECUTION_STARTED: 'bg-blue-500/15 text-blue-400',
  EXECUTION_COMPLETED: 'bg-green-500/15 text-green-400',
  EXECUTION_FAILED: 'bg-red-500/15 text-red-400',
  STAGE_STARTED: 'bg-blue-500/15 text-blue-400',
  STAGE_COMPLETED: 'bg-green-500/15 text-green-400',
  STAGE_FAILED: 'bg-red-500/15 text-red-400',
  GATE_ACTIVATED: 'bg-yellow-500/15 text-yellow-400',
  GATE_ACTION_TAKEN: 'bg-purple-500/15 text-purple-400',
  EMERGENCY_STOP: 'bg-red-500/15 text-red-400',
};

const DEFAULT_BADGE_STYLE = 'bg-surface-light text-text-muted';

/**
 * FeedWidget
 *
 * Compact activity/stream feed showing recent events
 * from the agent stream events table.
 */
export const FeedWidget: React.FC<FeedWidgetProps> = ({ title, config }) => {
  const trpc = getTRPC();
  const { data, isLoading } = trpc.dashboard.getWidgetData.useQuery({
    widgetType: 'FEED',
    config: { limit: config.limit },
  });

  const feedData = data as { items?: Array<{
    id: string;
    eventType: string;
    summary: string;
    agentName?: string | null;
    createdAt: string;
  }> } | undefined;

  const formatTime = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return date.toLocaleDateString();
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="p-4 bg-surface border border-surface-border rounded-xl shadow-sm h-full overflow-hidden">
      <p className="text-xs text-text-muted font-medium uppercase tracking-wide mb-3">
        {title}
      </p>
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-surface-light animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col overflow-y-auto max-h-[calc(100%-28px)]">
          {feedData?.items && feedData.items.length > 0 ? (
            feedData.items.map((event, idx) => (
              <div
                key={event.id}
                className={`py-2 px-1 ${
                  idx < feedData.items!.length - 1 ? 'border-b border-surface-border' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                      EVENT_TYPE_STYLES[event.eventType] ?? DEFAULT_BADGE_STYLE
                    }`}
                  >
                    {event.eventType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-text-muted">
                    {formatTime(event.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-text mt-0.5 truncate">
                  {event.summary}
                </p>
                {event.agentName && (
                  <p className="text-xs text-text-muted">
                    {event.agentName}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-text-muted text-center py-4">
              No recent events
            </p>
          )}
        </div>
      )}
    </div>
  );
};
