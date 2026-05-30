import React, { forwardRef } from 'react';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  lines?: number;
  animate?: boolean;
};

const variantRadius: Record<SkeletonVariant, string> = {
  text: 'rounded-md',
  circular: 'rounded-full',
  rectangular: 'rounded-none',
  rounded: 'rounded-xl',
};

const defaultDimensions: Record<SkeletonVariant, { width?: string; height: string }> = {
  text: { width: '100%', height: '0.875rem' },
  circular: { width: '2.5rem', height: '2.5rem' },
  rectangular: { width: '100%', height: '8rem' },
  rounded: { width: '100%', height: '8rem' },
};

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  {
    variant = 'text',
    width,
    height,
    lines,
    animate = true,
    className,
    style,
    ...rest
  },
  ref,
) {
  const defaults = defaultDimensions[variant];
  const w = width ?? defaults.width;
  const h = height ?? defaults.height;

  if (lines && lines > 1 && variant === 'text') {
    return (
      <div ref={ref} className={['flex flex-col gap-2', className].filter(Boolean).join(' ')} {...rest}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={[
              variantRadius.text,
              animate && 'shimmer',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              width: i === lines - 1 ? '75%' : '100%',
              height: typeof h === 'number' ? `${h}px` : h,
              ...(!animate ? { backgroundColor: 'var(--color-surface-lighter)' } : {}),
            }}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={[
        variantRadius[variant],
        animate && 'shimmer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        width: typeof w === 'number' ? `${w}px` : w,
        height: typeof h === 'number' ? `${h}px` : h,
        ...(!animate ? { backgroundColor: 'var(--color-surface-lighter)' } : {}),
        ...style,
      }}
      aria-hidden="true"
      role="presentation"
      {...rest}
    />
  );
});

Skeleton.displayName = 'Skeleton';
