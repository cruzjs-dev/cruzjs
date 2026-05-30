import React, { forwardRef } from 'react';

export type ProgressSize = 'sm' | 'md' | 'lg';
export type ProgressColor = 'primary' | 'success' | 'warning' | 'danger' | 'info';

export type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number;
  max?: number;
  size?: ProgressSize;
  color?: ProgressColor;
  label?: string;
  showValue?: boolean;
  indeterminate?: boolean;
};

const sizeStyles: Record<ProgressSize, { track: string; label: string }> = {
  sm: { track: 'h-1.5 rounded-full', label: 'text-xs' },
  md: { track: 'h-2.5 rounded-full', label: 'text-sm' },
  lg: { track: 'h-4 rounded-full', label: 'text-sm' },
};

const colorStyles: Record<ProgressColor, { bar: string; trackBg: React.CSSProperties }> = {
  primary: {
    bar: 'bg-primary',
    trackBg: { backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface-lighter))' },
  },
  success: {
    bar: 'bg-success',
    trackBg: { backgroundColor: 'color-mix(in srgb, var(--color-success) 10%, var(--color-surface-lighter))' },
  },
  warning: {
    bar: 'bg-warning',
    trackBg: { backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, var(--color-surface-lighter))' },
  },
  danger: {
    bar: 'bg-danger',
    trackBg: { backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, var(--color-surface-lighter))' },
  },
  info: {
    bar: 'bg-info',
    trackBg: { backgroundColor: 'color-mix(in srgb, var(--color-info) 10%, var(--color-surface-lighter))' },
  },
};

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  {
    value = 0,
    max = 100,
    size = 'md',
    color = 'primary',
    label,
    showValue = false,
    indeterminate = false,
    className,
    style,
    ...rest
  },
  ref,
) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const s = sizeStyles[size];
  const c = colorStyles[color];

  return (
    <div ref={ref} className={['w-full', className].filter(Boolean).join(' ')} style={style} {...rest}>
      {(label || showValue) && (
        <div className={['flex items-center justify-between mb-1.5', s.label].join(' ')}>
          {label && <span className="font-medium text-text-secondary">{label}</span>}
          {showValue && (
            <span className="text-text-tertiary tabular-nums">
              {indeterminate ? '...' : `${Math.round(percent)}%`}
            </span>
          )}
        </div>
      )}
      <div
        className={['relative overflow-hidden', s.track].join(' ')}
        style={c.trackBg}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        {indeterminate ? (
          <div
            className={[
              'absolute inset-y-0 rounded-full',
              c.bar,
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
            ].join(' ')}
            style={{
              width: '40%',
              animation: 'progress-indeterminate 1.5s cubic-bezier(0.65, 0, 0.35, 1) infinite',
            }}
          />
        ) : (
          <div
            className={[
              'h-full rounded-full transition-all duration-500',
              c.bar,
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
            ].join(' ')}
            style={{
              width: `${percent}%`,
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        )}
      </div>
      <style>{`
        @keyframes progress-indeterminate {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
});

Progress.displayName = 'Progress';
