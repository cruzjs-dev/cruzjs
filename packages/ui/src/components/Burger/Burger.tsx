import React, { forwardRef, useCallback } from 'react';

export type BurgerSize = 'sm' | 'md' | 'lg';

export type BurgerProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  opened: boolean;
  onToggle?: (opened: boolean) => void;
  size?: BurgerSize;
  color?: string;
  lineWidth?: number;
};

const sizeConfig: Record<BurgerSize, { button: number; lineLength: number; gap: number }> = {
  sm: { button: 28, lineLength: 16, gap: 3 },
  md: { button: 34, lineLength: 20, gap: 4 },
  lg: { button: 40, lineLength: 24, gap: 5 },
};

export const Burger = forwardRef<HTMLButtonElement, BurgerProps>(function Burger(
  {
    opened,
    onToggle,
    size = 'md',
    color,
    lineWidth = 2,
    className,
    style,
    onClick,
    'aria-label': ariaLabel,
    ...rest
  },
  ref,
) {
  const config = sizeConfig[size];

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      onToggle?.(!opened);
    },
    [onClick, onToggle, opened],
  );

  const halfLine = lineWidth / 2;

  const lineStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    width: config.lineLength,
    height: lineWidth,
    borderRadius: 9999,
    ...(color ? { backgroundColor: color } : {}),
    transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  };

  const topStyle: React.CSSProperties = {
    ...lineStyle,
    top: opened ? `calc(50% - ${halfLine}px)` : `calc(50% - ${config.gap}px - ${halfLine}px)`,
    transform: opened ? `translateX(-50%) rotate(45deg)` : `translateX(-50%) rotate(0deg)`,
  };

  const middleStyle: React.CSSProperties = {
    ...lineStyle,
    top: `calc(50% - ${halfLine}px)`,
    opacity: opened ? 0 : 1,
    transform: opened ? `translateX(-50%) scale(0.3)` : `translateX(-50%) scale(1)`,
  };

  const bottomStyle: React.CSSProperties = {
    ...lineStyle,
    top: opened ? `calc(50% - ${halfLine}px)` : `calc(50% + ${config.gap}px - ${halfLine}px)`,
    transform: opened ? `translateX(-50%) rotate(-45deg)` : `translateX(-50%) rotate(0deg)`,
  };

  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel ?? 'Toggle menu'}
      aria-expanded={opened}
      onClick={handleClick}
      className={[
        'relative inline-flex items-center justify-center',
        'rounded-lg',
        'bg-transparent',
        'hover:bg-surface-lighter',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        'motion-reduce:transition-none',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        width: config.button,
        height: config.button,
        ...style,
      }}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={color ? '' : 'bg-text-secondary'}
        style={topStyle}
      />
      <span
        aria-hidden="true"
        className={color ? '' : 'bg-text-secondary'}
        style={middleStyle}
      />
      <span
        aria-hidden="true"
        className={color ? '' : 'bg-text-secondary'}
        style={bottomStyle}
      />
    </button>
  );
});

Burger.displayName = 'Burger';
