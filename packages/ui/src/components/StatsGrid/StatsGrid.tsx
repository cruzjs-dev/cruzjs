import React, { forwardRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type StatItem = {
  label: string;
  value: string | number;
  previousValue?: number;
  delta?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  description?: string;
  href?: string;
};

export type StatsGridVariant = 'default' | 'compact' | 'bordered';

export type StatsGridProps = React.HTMLAttributes<HTMLDivElement> & {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
  variant?: StatsGridVariant;
  renderLink?: (props: {
    href: string;
    children: React.ReactNode;
    className: string;
  }) => React.ReactNode;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeDelta(stat: StatItem): { delta: number; trend: 'up' | 'down' | 'neutral' } | null {
  if (stat.delta != null && stat.trend) {
    return { delta: stat.delta, trend: stat.trend };
  }

  if (stat.delta != null) {
    const trend = stat.delta > 0 ? 'up' : stat.delta < 0 ? 'down' : 'neutral';
    return { delta: Math.abs(stat.delta), trend };
  }

  if (stat.trend && stat.previousValue != null) {
    const currentNum = typeof stat.value === 'number' ? stat.value : parseFloat(String(stat.value));
    if (isNaN(currentNum) || stat.previousValue === 0) {
      return { delta: 0, trend: stat.trend };
    }
    const pct = Math.abs(((currentNum - stat.previousValue) / stat.previousValue) * 100);
    return { delta: Math.round(pct * 10) / 10, trend: stat.trend };
  }

  if (stat.previousValue != null) {
    const currentNum = typeof stat.value === 'number' ? stat.value : parseFloat(String(stat.value));
    if (isNaN(currentNum)) return null;
    if (stat.previousValue === 0) {
      return { delta: 0, trend: 'neutral' };
    }
    const pct = ((currentNum - stat.previousValue) / stat.previousValue) * 100;
    const trend: 'up' | 'down' | 'neutral' = pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral';
    return { delta: Math.round(Math.abs(pct) * 10) / 10, trend };
  }

  if (stat.trend) {
    return { delta: 0, trend: stat.trend };
  }

  return null;
}

function defaultColumns(count: number): 2 | 3 | 4 {
  if (count <= 2) return 2;
  if (count === 3) return 3;
  return 4;
}

// ─── Variant styles ─────────────────────────────────────────────────────────

const variantCardStyles: Record<StatsGridVariant, string> = {
  default:
    'bg-surface rounded-xl p-5 ring-1 ring-surface-border/50 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)]',
  compact: 'bg-surface-lighter rounded-lg p-4',
  bordered: 'bg-surface border border-surface-border rounded-xl p-5',
};

// ─── Column class map ───────────────────────────────────────────────────────

const columnClasses: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const iconContainerStyle: React.CSSProperties = {
  backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))',
};

const TrendIndicator: React.FC<{ delta: number; trend: 'up' | 'down' | 'neutral' }> = ({
  delta,
  trend,
}) => {
  if (trend === 'neutral') {
    return (
      <span className="text-text-tertiary text-xs font-medium inline-flex items-center gap-0.5">
        <svg
          className="w-3 h-3"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" d="M2 6h8" />
        </svg>
        {delta > 0 && <span>{delta}%</span>}
      </span>
    );
  }

  const isUp = trend === 'up';

  return (
    <span
      className={[
        'text-xs font-medium inline-flex items-center gap-0.5',
        isUp ? 'text-success' : 'text-danger',
      ].join(' ')}
      data-testid={`trend-${trend}`}
    >
      <svg
        className="w-3 h-3"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        {isUp ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V3m0 0L3 6m3-3l3 3" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v6m0 0l3-3m-3 3L3 6" />
        )}
      </svg>
      <span>{delta}%</span>
    </span>
  );
};

// ─── StatCard ───────────────────────────────────────────────────────────────

type StatCardProps = {
  stat: StatItem;
  variant: StatsGridVariant;
  renderLink?: StatsGridProps['renderLink'];
};

const StatCard: React.FC<StatCardProps> = ({ stat, variant, renderLink }) => {
  const computed = computeDelta(stat);
  const isClickable = !!stat.href;

  const cardClassName = [
    variantCardStyles[variant],
    isClickable
      ? 'hover:ring-primary/30 hover:-translate-y-px transition-all duration-150 cursor-pointer'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
            {stat.label}
          </p>
          <p className="text-2xl font-bold text-text tracking-tight mt-1">{stat.value}</p>
        </div>
        {stat.icon && (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ml-3"
            style={iconContainerStyle}
          >
            {stat.icon}
          </div>
        )}
      </div>
      {(computed || stat.description) && (
        <div className="flex items-center gap-2 mt-2">
          {computed && <TrendIndicator delta={computed.delta} trend={computed.trend} />}
          {stat.description && (
            <span className="text-xs text-text-tertiary">{stat.description}</span>
          )}
        </div>
      )}
    </>
  );

  if (isClickable && stat.href) {
    if (renderLink) {
      return <>{renderLink({ href: stat.href, children: content, className: cardClassName })}</>;
    }
    return (
      <a href={stat.href} className={cardClassName}>
        {content}
      </a>
    );
  }

  return <div className={cardClassName}>{content}</div>;
};

// ─── StatsGrid ──────────────────────────────────────────────────────────────

export const StatsGrid = forwardRef<HTMLDivElement, StatsGridProps>(function StatsGrid(
  { stats, columns, variant = 'default', renderLink, className, ...rest },
  ref,
) {
  const cols = columns ?? defaultColumns(stats.length);

  return (
    <div
      ref={ref}
      className={['grid gap-4', columnClasses[cols], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {stats.map((stat, index) => (
        <StatCard key={`${stat.label}-${index}`} stat={stat} variant={variant} renderLink={renderLink} />
      ))}
    </div>
  );
});

StatsGrid.displayName = 'StatsGrid';
