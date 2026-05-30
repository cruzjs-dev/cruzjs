import React, { forwardRef } from 'react';
import { Spinner } from '../Spinner';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TimeRange = {
  value: string;
  label: string;
};

export type ChartContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  subtitle?: string;
  legend?: React.ReactNode;
  actions?: React.ReactNode;
  timeRanges?: TimeRange[];
  activeTimeRange?: string;
  onTimeRangeChange?: (value: string) => void;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  height?: number | string;
  children: React.ReactNode;
};

// ─── Default empty icon ────────────────────────────────────────────────────

const DefaultEmptyIcon: React.FC = () => (
  <svg
    className="w-10 h-10 text-text-muted"
    viewBox="0 0 40 40"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden="true"
  >
    <rect x="6" y="22" width="6" height="12" rx="1" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="17" y="14" width="6" height="20" rx="1" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="28" y="8" width="6" height="26" rx="1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Time range selector ───────────────────────────────────────────────────

type TimeRangeSelectorProps = {
  ranges: TimeRange[];
  active?: string;
  onChange?: (value: string) => void;
};

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ ranges, active, onChange }) => (
  <div className="flex gap-1" role="group" aria-label="Time range">
    {ranges.map((range) => {
      const isActive = range.value === active;
      return (
        <button
          key={range.value}
          type="button"
          onClick={() => onChange?.(range.value)}
          className={
            isActive
              ? 'bg-primary text-surface text-xs rounded-full px-2.5 py-1 font-medium'
              : 'text-text-muted text-xs hover:text-text-secondary hover:bg-surface-lighter rounded-full px-2.5 py-1'
          }
          aria-pressed={isActive}
        >
          {range.label}
        </button>
      );
    })}
  </div>
);

// ─── ChartContainer ────────────────────────────────────────────────────────

export const ChartContainer = forwardRef<HTMLDivElement, ChartContainerProps>(
  function ChartContainer(
    {
      title,
      subtitle,
      legend,
      actions,
      timeRanges,
      activeTimeRange,
      onTimeRangeChange,
      loading = false,
      empty = false,
      emptyMessage = 'No data available',
      emptyIcon,
      height = 300,
      children,
      className,
      ...rest
    },
    ref,
  ) {
    const chartHeight = typeof height === 'number' ? `${height}px` : height;

    return (
      <div
        ref={ref}
        className={[
          'bg-surface rounded-xl ring-1 ring-surface-border/50 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-sm text-text">{title}</h3>
            {subtitle && (
              <p className="text-xs text-text-tertiary mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {timeRanges && timeRanges.length > 0 && (
              <TimeRangeSelector
                ranges={timeRanges}
                active={activeTimeRange}
                onChange={onTimeRangeChange}
              />
            )}
            {actions && <div className="flex items-center gap-1">{actions}</div>}
          </div>
        </div>

        {/* Legend slot */}
        {legend && <div className="px-5 pb-2">{legend}</div>}

        {/* Chart area */}
        <div className="px-5 pb-5" style={{ height: chartHeight }}>
          {loading ? (
            <div className="flex items-center justify-center w-full h-full">
              <Spinner size="lg" />
            </div>
          ) : empty ? (
            <div className="flex flex-col items-center justify-center w-full h-full gap-2">
              {emptyIcon ?? <DefaultEmptyIcon />}
              <p className="text-text-muted text-sm">{emptyMessage}</p>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    );
  },
);

ChartContainer.displayName = 'ChartContainer';
