import React, { forwardRef } from 'react';

export type BadgeVariant = 'solid' | 'outline' | 'subtle';
export type BadgeColor = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md' | 'lg';

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  color?: BadgeColor;
  size?: BadgeSize;
  dot?: boolean;
  count?: number;
  maxCount?: number;
};

const solidStyles: Record<BadgeColor, string> = {
  primary: 'bg-primary text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
  success: 'bg-success text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
  warning: 'bg-warning text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
  danger: 'bg-danger text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
  info: 'bg-info text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
  neutral: 'bg-surface-lighter text-text-secondary ring-1 ring-surface-border/50',
};

const outlineStyles: Record<BadgeColor, string> = {
  primary: 'ring-1 ring-primary/30 text-primary',
  success: 'ring-1 ring-success/30 text-success-text',
  warning: 'ring-1 ring-warning/30 text-warning-text',
  danger: 'ring-1 ring-danger/30 text-danger-text',
  info: 'ring-1 ring-info/30 text-info',
  neutral: 'ring-1 ring-surface-border text-text-secondary',
};

const subtleStyles: Record<BadgeColor, string> = {
  primary: 'text-primary',
  success: 'text-success-text',
  warning: 'text-warning-text',
  danger: 'text-danger-text',
  info: 'text-info',
  neutral: 'text-text-secondary',
};

const subtleBg: Record<BadgeColor, React.CSSProperties> = {
  primary: { backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))' },
  success: { backgroundColor: 'color-mix(in srgb, var(--color-success) 8%, var(--color-surface))' },
  warning: { backgroundColor: 'color-mix(in srgb, var(--color-warning) 8%, var(--color-surface))' },
  danger: { backgroundColor: 'color-mix(in srgb, var(--color-danger) 8%, var(--color-surface))' },
  info: { backgroundColor: 'color-mix(in srgb, var(--color-info) 8%, var(--color-surface))' },
  neutral: { backgroundColor: 'color-mix(in srgb, var(--color-text-muted) 8%, var(--color-surface))' },
};

const outlineBg: Record<BadgeColor, React.CSSProperties> = {
  primary: { backgroundColor: 'color-mix(in srgb, var(--color-primary) 4%, var(--color-surface))' },
  success: { backgroundColor: 'color-mix(in srgb, var(--color-success) 4%, var(--color-surface))' },
  warning: { backgroundColor: 'color-mix(in srgb, var(--color-warning) 4%, var(--color-surface))' },
  danger: { backgroundColor: 'color-mix(in srgb, var(--color-danger) 4%, var(--color-surface))' },
  info: { backgroundColor: 'color-mix(in srgb, var(--color-info) 4%, var(--color-surface))' },
  neutral: {},
};

const variantMap: Record<BadgeVariant, Record<BadgeColor, string>> = {
  solid: solidStyles,
  outline: outlineStyles,
  subtle: subtleStyles,
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-px text-[10px] gap-1',
  md: 'px-2.5 py-0.5 text-xs gap-1.5',
  lg: 'px-3 py-1 text-sm gap-1.5',
};

const dotSizeStyles: Record<BadgeSize, string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

const dotColorStyles: Record<BadgeColor, string> = {
  primary: 'bg-primary shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-primary)_20%,transparent)]',
  success: 'bg-success shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-success)_20%,transparent)]',
  warning: 'bg-warning shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-warning)_20%,transparent)]',
  danger: 'bg-danger shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-danger)_20%,transparent)]',
  info: 'bg-info shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-info)_20%,transparent)]',
  neutral: 'bg-text-muted shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-text-muted)_20%,transparent)]',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  {
    variant = 'subtle',
    color = 'primary',
    size = 'md',
    dot = false,
    count,
    maxCount = 99,
    children,
    className,
    style,
    onClick,
    ...rest
  },
  ref,
) {
  const displayContent = (() => {
    if (dot) return null;
    if (count !== undefined) {
      return count > maxCount ? `${maxCount}+` : String(count);
    }
    return children;
  })();

  if (dot) {
    return (
      <span
        ref={ref}
        className={[
          'inline-block rounded-full shrink-0',
          dotSizeStyles[size],
          dotColorStyles[color],
          onClick && 'cursor-pointer',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={style}
        onClick={onClick}
        {...rest}
      />
    );
  }

  const bgOverride = variant === 'subtle'
    ? subtleBg[color]
    : variant === 'outline'
      ? outlineBg[color]
      : undefined;

  const mergedStyle = bgOverride
    ? { ...bgOverride, ...style }
    : style;

  return (
    <span
      ref={ref}
      className={[
        'inline-flex items-center justify-center rounded-full font-semibold tracking-wide whitespace-nowrap leading-none',
        sizeStyles[size],
        variantMap[variant][color],
        onClick && 'cursor-pointer transition-transform duration-150 active:scale-95',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={mergedStyle}
      onClick={onClick}
      {...rest}
    >
      {displayContent}
    </span>
  );
});

Badge.displayName = 'Badge';
