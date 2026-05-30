import { useState, useEffect } from 'react';
import { getTRPC } from '@cruzjs/core/trpc/client';

interface ChartWidgetProps {
  title: string;
  config: {
    chartType?: string;
    metricType?: string;
    periodDays?: number;
    [key: string]: unknown;
  };
}

/**
 * ChartWidget
 *
 * Renders a Recharts chart (Line/Bar/Area/Pie) with data from analytics.
 * Uses isClient guard for SSR safety (same pattern as Tiptap).
 */
export const ChartWidget: React.FC<ChartWidgetProps> = ({ title, config }) => {
  const trpc = getTRPC();
  const [isClient, setIsClient] = useState(false);
  const [RechartsModule, setRechartsModule] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    import('recharts').then((mod) => {
      setRechartsModule(mod);
    });
  }, []);

  const { data, isLoading } = trpc.dashboard.getWidgetData.useQuery({
    widgetType: 'CHART',
    config: {
      chartType: config.chartType as 'LINE' | 'BAR' | 'AREA' | 'PIE' | undefined,
      metricType: config.metricType,
      periodDays: config.periodDays,
    },
  });

  const chartData = data as { data?: Array<{ date?: string; [key: string]: unknown }>; metricType?: string } | undefined;

  if (isLoading || !isClient || !RechartsModule) {
    return (
      <div className="p-4 bg-surface border border-surface-border rounded-xl shadow-sm h-full">
        <p className="text-xs text-text-muted font-medium uppercase tracking-wide mb-2">
          {title}
        </p>
        <div className="h-4/5 bg-surface-light animate-pulse rounded" />
      </div>
    );
  }

  const { ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid } = RechartsModule;

  const trendData = chartData?.data ?? [];
  const chartType = config.chartType ?? 'LINE';
  const COLORS = [
    'var(--color-primary)',
    'var(--color-primary-light)',
    'var(--color-accent)',
    'var(--color-info)',
  ];

  const renderChart = () => {
    const commonProps = {
      data: trendData,
      margin: { top: 5, right: 5, left: 0, bottom: 5 },
    };

    switch (chartType) {
      case 'BAR':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
            <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', borderRadius: '6px' }} />
            <Bar dataKey="data" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case 'AREA':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
            <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', borderRadius: '6px' }} />
            <Area type="monotone" dataKey="data" stroke="var(--color-primary)" fill="var(--color-primary-light)" />
          </AreaChart>
        );
      case 'PIE':
        return (
          <PieChart>
            <Pie
              data={trendData}
              dataKey="data"
              nameKey="date"
              cx="50%"
              cy="50%"
              outerRadius="80%"
              label
            >
              {trendData.map((_: unknown, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', borderRadius: '6px' }} />
          </PieChart>
        );
      default: // LINE
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
            <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', borderRadius: '6px' }} />
            <Line type="monotone" dataKey="data" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
          </LineChart>
        );
    }
  };

  return (
    <div className="p-4 bg-surface border border-surface-border rounded-xl shadow-sm h-full">
      <p className="text-xs text-text-muted font-medium uppercase tracking-wide mb-2">
        {title}
      </p>
      <div className="h-[calc(100%-24px)]">
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-text-muted">
              No data available
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
