import React, { forwardRef } from 'react';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerColor = 'primary' | 'current' | 'white';

export type SpinnerProps = React.HTMLAttributes<HTMLSpanElement> & {
  size?: SpinnerSize;
  color?: SpinnerColor;
  label?: string;
  thickness?: number;
};

const sizeMap: Record<SpinnerSize, { container: string; default_thickness: number }> = {
  xs: { container: 'w-3.5 h-3.5', default_thickness: 2 },
  sm: { container: 'w-4 h-4', default_thickness: 2 },
  md: { container: 'w-6 h-6', default_thickness: 2.5 },
  lg: { container: 'w-8 h-8', default_thickness: 3 },
  xl: { container: 'w-12 h-12', default_thickness: 3 },
};

const colorMap: Record<SpinnerColor, { track: string; arc: string }> = {
  primary: {
    track: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
    arc: 'var(--color-primary)',
  },
  current: {
    track: 'color-mix(in srgb, currentColor 15%, transparent)',
    arc: 'currentColor',
  },
  white: {
    track: 'rgba(255, 255, 255, 0.2)',
    arc: '#ffffff',
  },
};

export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(function Spinner(
  {
    size = 'md',
    color = 'primary',
    label = 'Loading',
    thickness,
    className,
    style,
    ...rest
  },
  ref,
) {
  const s = sizeMap[size];
  const c = colorMap[color];
  const t = thickness ?? s.default_thickness;

  return (
    <span
      ref={ref}
      role="status"
      aria-label={label}
      className={[
        'inline-flex items-center justify-center shrink-0',
        s.container,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      {...rest}
    >
      <svg
        className="animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ width: '100%', height: '100%' }}
      >
        <circle
          cx="12"
          cy="12"
          r={10}
          stroke={c.track}
          strokeWidth={t}
        />
        <path
          d={`M12 2a10 10 0 0 1 10 10`}
          stroke={c.arc}
          strokeWidth={t}
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
});

Spinner.displayName = 'Spinner';
