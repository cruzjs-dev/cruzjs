import React, { forwardRef } from 'react';

export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerVariant = 'solid' | 'dashed' | 'dotted';
export type DividerColor = 'default' | 'primary' | 'muted';
export type DividerLabelPosition = 'start' | 'center' | 'end';
export type DividerSpacing = 'sm' | 'md' | 'lg';

export type DividerProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: DividerOrientation;
  variant?: DividerVariant;
  label?: React.ReactNode;
  labelPosition?: DividerLabelPosition;
  color?: DividerColor;
  spacing?: DividerSpacing;
};

const colorStyles: Record<DividerColor, string> = {
  default: 'border-surface-border',
  primary: 'border-primary/30',
  muted: 'border-text-muted/20',
};

const labelColorStyles: Record<DividerColor, string> = {
  default: 'text-text-tertiary',
  primary: 'text-primary',
  muted: 'text-text-muted',
};

const horizontalSpacing: Record<DividerSpacing, string> = {
  sm: 'my-2',
  md: 'my-4',
  lg: 'my-6',
};

const verticalSpacing: Record<DividerSpacing, string> = {
  sm: 'mx-2',
  md: 'mx-4',
  lg: 'mx-6',
};

const variantStyles: Record<DividerVariant, string> = {
  solid: 'border-solid',
  dashed: 'border-dashed',
  dotted: 'border-dotted',
};

const labelPositionStyles: Record<DividerLabelPosition, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
};

const lineGrowByPosition: Record<DividerLabelPosition, { before: string; after: string }> = {
  start: { before: 'basis-[10%] shrink-0', after: 'grow' },
  center: { before: 'grow', after: 'grow' },
  end: { before: 'grow', after: 'basis-[10%] shrink-0' },
};

export const Divider = forwardRef<HTMLDivElement, DividerProps>(function Divider(
  {
    orientation = 'horizontal',
    variant = 'solid',
    label,
    labelPosition = 'center',
    color = 'default',
    spacing = 'md',
    className,
    ...rest
  },
  ref,
) {
  const isHorizontal = orientation === 'horizontal';
  const spacingClass = isHorizontal ? horizontalSpacing[spacing] : verticalSpacing[spacing];
  const borderColor = colorStyles[color];
  const borderStyle = variantStyles[variant];

  // Vertical divider
  if (!isHorizontal) {
    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation="vertical"
        className={[
          'h-full self-stretch border-l',
          borderStyle,
          borderColor,
          spacingClass,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
    );
  }

  // Horizontal divider without label
  if (!label) {
    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation="horizontal"
        className={[
          'w-full border-t',
          borderStyle,
          borderColor,
          spacingClass,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
    );
  }

  // Horizontal divider with label
  const lineGrow = lineGrowByPosition[labelPosition];

  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation="horizontal"
      className={[
        'flex items-center w-full',
        spacingClass,
        labelPositionStyles[labelPosition],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <span
        className={[
          'border-t',
          borderStyle,
          borderColor,
          lineGrow.before,
        ].join(' ')}
        aria-hidden="true"
      />
      <span
        className={[
          'shrink-0 px-3 text-xs font-medium uppercase tracking-wider',
          labelColorStyles[color],
        ].join(' ')}
      >
        {label}
      </span>
      <span
        className={[
          'border-t',
          borderStyle,
          borderColor,
          lineGrow.after,
        ].join(' ')}
        aria-hidden="true"
      />
    </div>
  );
});

Divider.displayName = 'Divider';
