import React, { forwardRef } from 'react';

export type ProgressCircularSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ProgressCircularColor = 'primary' | 'success' | 'warning' | 'danger' | 'info';

export type ProgressCircularProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number;
  max?: number;
  size?: ProgressCircularSize;
  color?: ProgressCircularColor;
  thickness?: number;
  showValue?: boolean;
  indeterminate?: boolean;
  children?: React.ReactNode;
};

const sizeMap: Record<ProgressCircularSize, { container: string; px: number; defaultThickness: number; fontSize: string }> = {
  xs: { container: 'w-6 h-6', px: 24, defaultThickness: 2.5, fontSize: 'text-[8px]' },
  sm: { container: 'w-8 h-8', px: 32, defaultThickness: 3, fontSize: 'text-[10px]' },
  md: { container: 'w-12 h-12', px: 48, defaultThickness: 3.5, fontSize: 'text-xs' },
  lg: { container: 'w-16 h-16', px: 64, defaultThickness: 4, fontSize: 'text-sm' },
  xl: { container: 'w-24 h-24', px: 96, defaultThickness: 5, fontSize: 'text-base' },
};

const colorMap: Record<ProgressCircularColor, { track: string; ring: string }> = {
  primary: {
    track: 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface-lighter))',
    ring: 'var(--color-primary)',
  },
  success: {
    track: 'color-mix(in srgb, var(--color-success) 12%, var(--color-surface-lighter))',
    ring: 'var(--color-success)',
  },
  warning: {
    track: 'color-mix(in srgb, var(--color-warning) 12%, var(--color-surface-lighter))',
    ring: 'var(--color-warning)',
  },
  danger: {
    track: 'color-mix(in srgb, var(--color-danger) 12%, var(--color-surface-lighter))',
    ring: 'var(--color-danger)',
  },
  info: {
    track: 'color-mix(in srgb, var(--color-info) 12%, var(--color-surface-lighter))',
    ring: 'var(--color-info)',
  },
};

export const ProgressCircular = forwardRef<HTMLDivElement, ProgressCircularProps>(function ProgressCircular(
  {
    value = 0,
    max = 100,
    size = 'md',
    color = 'primary',
    thickness,
    showValue = false,
    indeterminate = false,
    children,
    className,
    style,
    ...rest
  },
  ref,
) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const s = sizeMap[size];
  const c = colorMap[color];
  const t = thickness ?? s.defaultThickness;

  const viewBox = 24;
  const radius = (viewBox - t) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percent / 100) * circumference;

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={[
        'relative inline-flex items-center justify-center shrink-0',
        s.container,
        className,
      ].filter(Boolean).join(' ')}
      style={style}
      {...rest}
    >
      <svg
        viewBox={`0 0 ${viewBox} ${viewBox}`}
        fill="none"
        aria-hidden="true"
        className={[
          'absolute inset-0 w-full h-full',
          indeterminate ? 'animate-spin' : '',
        ].filter(Boolean).join(' ')}
        style={indeterminate ? { animationDuration: '1.4s' } : undefined}
      >
        <circle
          cx={viewBox / 2}
          cy={viewBox / 2}
          r={radius}
          stroke={c.track}
          strokeWidth={t}
          fill="none"
        />
        <circle
          cx={viewBox / 2}
          cy={viewBox / 2}
          r={radius}
          stroke={c.ring}
          strokeWidth={t}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={indeterminate ? circumference * 0.75 : dashOffset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            transition: indeterminate ? 'none' : 'stroke-dashoffset 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      </svg>

      {(showValue || children) && (
        <span className={[
          'relative z-10 font-semibold tabular-nums leading-none text-text-secondary',
          s.fontSize,
        ].join(' ')}>
          {children ?? (indeterminate ? '' : `${Math.round(percent)}%`)}
        </span>
      )}
    </div>
  );
});

ProgressCircular.displayName = 'ProgressCircular';
