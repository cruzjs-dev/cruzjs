import { getTRPC } from '@cruzjs/core/trpc/client';

interface ListWidgetProps {
  title: string;
  config: {
    listMetric?: string;
    limit?: number;
    [key: string]: unknown;
  };
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-400',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-400',
  DONE: 'bg-green-500/15 text-green-400',
  FAILED: 'bg-red-500/15 text-red-400',
  BLOCKED: 'bg-orange-500/15 text-orange-400',
  APPROVED: 'bg-green-500/15 text-green-400',
  SKIPPED: 'bg-surface-light text-text-muted',
};

const DEFAULT_BADGE_STYLE = 'bg-surface-light text-text-muted';

/**
 * ListWidget
 *
 * Displays a table-like list of recent executions, failures,
 * pending gates, or overdue work items.
 */
export const ListWidget: React.FC<ListWidgetProps> = ({ title, config }) => {
  const trpc = getTRPC();
  const { data, isLoading } = trpc.dashboard.getWidgetData.useQuery({
    widgetType: 'LIST',
    config: { listMetric: config.listMetric, limit: config.limit },
  });

  const listData = data as { items?: Array<Record<string, unknown>>; listMetric?: string } | undefined;

  return (
    <div className="p-4 bg-surface border border-surface-border rounded-xl shadow-sm h-full overflow-hidden">
      <p className="text-xs text-text-muted font-medium uppercase tracking-wide mb-3">
        {title}
      </p>
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 bg-surface-light animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100%-28px)]">
          {listData?.items && listData.items.length > 0 ? (
            listData.items.map((item, idx) => (
              <div
                key={String(item.id ?? idx)}
                className="flex items-center gap-2 p-2 rounded-sm hover:bg-surface-light transition-colors"
              >
                <span className="text-xs text-text-muted min-w-[20px]">
                  {idx + 1}
                </span>
                <span className="text-sm text-text flex-1 truncate">
                  {String(item.title ?? item.id ?? `Item ${idx + 1}`).slice(0, 40)}
                </span>
                {item.status != null && (
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${
                      STATUS_STYLES[String(item.status)] ?? DEFAULT_BADGE_STYLE
                    }`}
                  >
                    {String(item.status)}
                  </span>
                )}
                {item.priority != null && (
                  <span className="inline-block px-1.5 py-0.5 rounded text-xs border border-surface-border text-text-muted">
                    {String(item.priority)}
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-text-muted text-center py-4">
              No items
            </p>
          )}
        </div>
      )}
    </div>
  );
};
