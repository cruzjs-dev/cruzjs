import { getTRPC } from '@cruzjs/core/trpc/client';

interface StatWidgetProps {
  title: string;
  config: {
    metric?: string;
    [key: string]: unknown;
  };
}

/**
 * StatWidget
 *
 * Displays a single metric value with label.
 * Fetches data via dashboard.getWidgetData endpoint.
 */
export const StatWidget: React.FC<StatWidgetProps> = ({ title, config }) => {
  const trpc = getTRPC();
  const { data, isLoading } = trpc.dashboard.getWidgetData.useQuery({
    widgetType: 'STAT',
    config: { metric: config.metric },
  });

  const statData = data as { value?: number; label?: string; suffix?: string } | undefined;

  return (
    <div className="p-4 bg-surface border border-surface-border rounded-xl shadow-sm h-full flex flex-col justify-center">
      <p className="text-xs text-text-muted font-medium uppercase tracking-wide">
        {title}
      </p>
      {isLoading ? (
        <div className="h-10 mt-2 bg-surface-light animate-pulse rounded" />
      ) : (
        <p className="text-3xl font-bold text-text-strong mt-1">
          {statData?.value ?? 0}
          {statData?.suffix && (
            <span className="text-lg text-text-muted ml-1">
              {statData.suffix}
            </span>
          )}
        </p>
      )}
      {statData?.label && (
        <p className="text-xs text-text-muted mt-1">
          {statData.label}
        </p>
      )}
    </div>
  );
};
