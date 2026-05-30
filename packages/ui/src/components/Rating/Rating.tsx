import React, { forwardRef, useCallback, useState } from 'react';

export type RatingSize = 'sm' | 'md' | 'lg';
export type RatingColor = 'warning' | 'primary' | 'danger';

export type RatingProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> & {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  count?: number;
  size?: RatingSize;
  color?: RatingColor;
  allowHalf?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
};

// ---- Size tokens ----

const sizeStyles: Record<RatingSize, { iconPx: number; gap: string }> = {
  sm: { iconPx: 16, gap: 'gap-0.5' },
  md: { iconPx: 24, gap: 'gap-1' },
  lg: { iconPx: 32, gap: 'gap-1.5' },
};

// ---- Color tokens ----

const filledColorStyles: Record<RatingColor, string> = {
  warning: 'text-warning',
  primary: 'text-primary',
  danger: 'text-danger',
};

const emptyColorStyles: Record<RatingColor, React.CSSProperties> = {
  warning: {
    color: 'color-mix(in srgb, var(--color-warning) 25%, var(--color-text-muted))',
  },
  primary: {
    color: 'color-mix(in srgb, var(--color-primary) 25%, var(--color-text-muted))',
  },
  danger: {
    color: 'color-mix(in srgb, var(--color-danger) 25%, var(--color-text-muted))',
  },
};

// ---- Default star SVG ----

const StarFilledIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const StarOutlineIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

// ---- Helpers ----

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

// ---- Component ----

export const Rating = forwardRef<HTMLDivElement, RatingProps>(function Rating(
  {
    value: controlledValue,
    defaultValue,
    onChange,
    count = 5,
    size = 'md',
    color = 'warning',
    allowHalf = false,
    readOnly = false,
    disabled = false,
    icon,
    className,
    ...rest
  },
  ref,
) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? 0);
  const currentValue = isControlled ? controlledValue : internalValue;

  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? currentValue;

  const isInteractive = !readOnly && !disabled;

  const s = sizeStyles[size];
  const step = allowHalf ? 0.5 : 1;

  const setValue = useCallback(
    (next: number) => {
      const clamped = clamp(next, 0, count);
      if (!isControlled) {
        setInternalValue(clamped);
      }
      onChange?.(clamped);
    },
    [count, isControlled, onChange],
  );

  const handleStarClick = useCallback(
    (starIndex: number, isLeftHalf: boolean) => {
      if (!isInteractive) {
        return;
      }
      const next = allowHalf && isLeftHalf ? starIndex + 0.5 : starIndex + 1;
      setValue(next);
    },
    [isInteractive, allowHalf, setValue],
  );

  const handleStarHover = useCallback(
    (starIndex: number, isLeftHalf: boolean) => {
      if (!isInteractive) {
        return;
      }
      const next = allowHalf && isLeftHalf ? starIndex + 0.5 : starIndex + 1;
      setHoverValue(next);
    },
    [isInteractive, allowHalf],
  );

  const handleMouseLeave = useCallback(() => {
    if (isInteractive) {
      setHoverValue(null);
    }
  }, [isInteractive]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isInteractive) {
        return;
      }

      let next: number | undefined;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          e.preventDefault();
          next = clamp(currentValue + step, 0, count);
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          e.preventDefault();
          next = clamp(currentValue - step, 0, count);
          break;
        case 'Home':
          e.preventDefault();
          next = 0;
          break;
        case 'End':
          e.preventDefault();
          next = count;
          break;
      }

      if (next !== undefined) {
        setValue(next);
      }
    },
    [isInteractive, currentValue, step, count, setValue],
  );

  const renderStar = (index: number) => {
    const filled = displayValue >= index + 1;
    const halfFilled = !filled && allowHalf && displayValue >= index + 0.5;
    const isHovered = hoverValue !== null && (
      (allowHalf && hoverValue === index + 0.5) ||
      hoverValue === index + 1
    );

    const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
      if (!isInteractive) {
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const isLeft = e.clientX - rect.left < rect.width / 2;
      handleStarClick(index, isLeft);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLSpanElement>) => {
      if (!isInteractive) {
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const isLeft = e.clientX - rect.left < rect.width / 2;
      handleStarHover(index, isLeft);
    };

    const scaleStyle: React.CSSProperties = isHovered && isInteractive
      ? {
          transform: 'scale(1.2)',
          transitionProperty: 'transform',
          transitionDuration: '300ms',
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        }
      : {
          transform: 'scale(1)',
          transitionProperty: 'transform',
          transitionDuration: '200ms',
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        };

    if (icon) {
      // Custom icon: wrap in a container that controls fill via clip
      return (
        <span
          key={index}
          data-testid={`rating-star-${index}`}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          className={[
            'relative inline-flex items-center justify-center',
            isInteractive ? 'cursor-pointer' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            width: s.iconPx,
            height: s.iconPx,
            ...scaleStyle,
          }}
        >
          {/* Empty layer */}
          <span
            className="absolute inset-0 flex items-center justify-center"
            style={emptyColorStyles[color]}
          >
            {icon}
          </span>
          {/* Filled layer with clip */}
          {(filled || halfFilled) && (
            <span
              className={[
                'absolute inset-0 flex items-center justify-center overflow-hidden',
                filledColorStyles[color],
              ].join(' ')}
              style={{
                clipPath: halfFilled
                  ? 'inset(0 50% 0 0)'
                  : undefined,
              }}
            >
              {icon}
            </span>
          )}
        </span>
      );
    }

    // Default star icons
    return (
      <span
        key={index}
        data-testid={`rating-star-${index}`}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        className={[
          'relative inline-flex items-center justify-center',
          isInteractive ? 'cursor-pointer' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          width: s.iconPx,
          height: s.iconPx,
          ...scaleStyle,
        }}
      >
        {filled ? (
          <span className={filledColorStyles[color]}>
            <StarFilledIcon size={s.iconPx} />
          </span>
        ) : halfFilled ? (
          <>
            {/* Empty star behind */}
            <span
              className="absolute inset-0 flex items-center justify-center"
              style={emptyColorStyles[color]}
            >
              <StarOutlineIcon size={s.iconPx} />
            </span>
            {/* Half filled star clipped */}
            <span
              className={[
                'absolute inset-0 flex items-center justify-center overflow-hidden',
                filledColorStyles[color],
              ].join(' ')}
              style={{ clipPath: 'inset(0 50% 0 0)' }}
            >
              <StarFilledIcon size={s.iconPx} />
            </span>
          </>
        ) : (
          <span style={emptyColorStyles[color]}>
            <StarOutlineIcon size={s.iconPx} />
          </span>
        )}
      </span>
    );
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-valuenow={currentValue}
      aria-valuemin={0}
      aria-valuemax={count}
      aria-label="Rating"
      aria-readonly={readOnly || undefined}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onMouseLeave={handleMouseLeave}
      className={[
        'inline-flex items-center',
        s.gap,
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        readOnly ? 'cursor-default' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {Array.from({ length: count }, (_, i) => renderStar(i))}
    </div>
  );
});

Rating.displayName = 'Rating';
