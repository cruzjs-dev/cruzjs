import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SegmentedControlSize = 'sm' | 'md' | 'lg';
export type SegmentedControlColor = 'primary' | 'success' | 'info';

export type SegmentedControlItem = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
};

export type SegmentedControlProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> & {
  /** Array of items or string shorthand (e.g. `['A', 'B', 'C']`). */
  data: SegmentedControlItem[] | string[];
  /** Controlled value. */
  value?: string;
  /** Initial value (uncontrolled). */
  defaultValue?: string;
  /** Called when the selected value changes. */
  onChange?: (value: string) => void;
  /** Size variant. */
  size?: SegmentedControlSize;
  /** Stretch segments to fill container width. */
  fullWidth?: boolean;
  /** Active indicator color. */
  color?: SegmentedControlColor;
  /** Disable all segments. */
  disabled?: boolean;
};

// ─── Internal Utilities ───────────────────────────────────────────────────────

/** Normalise `string[]` shorthand → `SegmentedControlItem[]`. */
function normalizeItems(data: SegmentedControlItem[] | string[]): SegmentedControlItem[] {
  if (data.length === 0) {
    return [];
  }
  if (typeof data[0] === 'string') {
    return (data as string[]).map((s) => ({ value: s, label: s }));
  }
  return data as SegmentedControlItem[];
}

// SSR-safe layout effect
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// ─── Style Maps ──────────────────────────────────────────────────────────────

const sizeContainerStyles: Record<SegmentedControlSize, string> = {
  sm: 'p-0.5 rounded-lg',
  md: 'p-1 rounded-xl',
  lg: 'p-1.5 rounded-xl',
};

const sizeSegmentStyles: Record<SegmentedControlSize, string> = {
  sm: 'px-2.5 py-1 text-xs gap-1.5 min-h-[28px] rounded-md',
  md: 'px-3.5 py-1.5 text-sm gap-2 min-h-[34px] rounded-lg',
  lg: 'px-4.5 py-2 text-base gap-2.5 min-h-[40px] rounded-lg',
};

const sizeIndicatorRadius: Record<SegmentedControlSize, string> = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-lg',
};

const colorIndicatorStyles: Record<SegmentedControlColor, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  info: 'bg-info',
};

// ─── Component ───────────────────────────────────────────────────────────────

export const SegmentedControl = forwardRef<HTMLDivElement, SegmentedControlProps>(
  function SegmentedControl(
    {
      data,
      value: controlledValue,
      defaultValue,
      onChange,
      size = 'md',
      fullWidth = false,
      color = 'primary',
      disabled = false,
      className,
      ...rest
    },
    ref,
  ) {
    const items = normalizeItems(data);
    const baseId = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const indicatorRef = useRef<HTMLDivElement>(null);

    // ── Controllable state ──────────────────────────────────────────────────
    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState(
      () => defaultValue ?? items[0]?.value ?? '',
    );
    const activeValue = isControlled ? controlledValue : internalValue;

    const setValue = useCallback(
      (next: string) => {
        if (!isControlled) {
          setInternalValue(next);
        }
        onChange?.(next);
      },
      [isControlled, onChange],
    );

    // ── Indicator positioning ───────────────────────────────────────────────
    const updateIndicator = useCallback(() => {
      const container = containerRef.current;
      const indicator = indicatorRef.current;
      if (!container || !indicator) {
        return;
      }

      const escapedValue = CSS.escape(activeValue);
      const activeSegment = container.querySelector<HTMLButtonElement>(
        `[data-segment-value="${escapedValue}"]`,
      );
      if (!activeSegment) {
        return;
      }

      indicator.style.left = `${activeSegment.offsetLeft}px`;
      indicator.style.top = `${activeSegment.offsetTop}px`;
      indicator.style.width = `${activeSegment.offsetWidth}px`;
      indicator.style.height = `${activeSegment.offsetHeight}px`;
    }, [activeValue]);

    // Synchronous position update before paint
    useIsomorphicLayoutEffect(() => {
      updateIndicator();
    }, [updateIndicator]);

    // Reposition on resize
    useEffect(() => {
      const container = containerRef.current;
      if (!container || typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(updateIndicator);
      observer.observe(container);
      return () => observer.disconnect();
    }, [updateIndicator]);

    // ── Keyboard navigation ────────────────────────────────────────────────
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLButtonElement>) => {
        const container = containerRef.current;
        if (!container) {
          return;
        }

        const enabledSegments = Array.from(
          container.querySelectorAll<HTMLButtonElement>(
            '[role="radio"]:not([aria-disabled="true"])',
          ),
        );
        const idx = enabledSegments.indexOf(e.currentTarget);

        const activate = (segment: HTMLButtonElement | undefined) => {
          if (!segment) {
            return;
          }
          segment.focus();
          const val = segment.dataset.segmentValue;
          if (val !== undefined) {
            setValue(val);
          }
        };

        switch (e.key) {
          case 'ArrowRight':
            e.preventDefault();
            activate(enabledSegments[(idx + 1) % enabledSegments.length]);
            break;
          case 'ArrowLeft':
            e.preventDefault();
            activate(enabledSegments[(idx - 1 + enabledSegments.length) % enabledSegments.length]);
            break;
          case 'Home':
            e.preventDefault();
            activate(enabledSegments[0]);
            break;
          case 'End':
            e.preventDefault();
            activate(enabledSegments[enabledSegments.length - 1]);
            break;
        }
      },
      [setValue],
    );

    return (
      <div
        ref={(node) => {
          // Merge forwarded ref + internal ref
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }
        }}
        role="radiogroup"
        aria-disabled={disabled || undefined}
        className={[
          'relative inline-flex items-center',
          'bg-surface-lighter ring-1 ring-surface-border/50',
          sizeContainerStyles[size],
          fullWidth ? 'w-full' : '',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {/* Sliding indicator */}
        <div
          ref={indicatorRef}
          aria-hidden="true"
          data-testid="segmented-control-indicator"
          className={[
            'absolute pointer-events-none',
            'transition-[left,width] duration-200',
            'motion-reduce:transition-none',
            colorIndicatorStyles[color],
            sizeIndicatorRadius[size],
            'shadow-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
          ].join(' ')}
          style={{
            willChange: 'left, width',
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />

        {/* Segments */}
        {items.map((item) => {
          const isActive = activeValue === item.value;
          const isItemDisabled = disabled || item.disabled;

          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-disabled={isItemDisabled || undefined}
              data-segment-value={item.value}
              id={`${baseId}-segment-${item.value}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => {
                if (!isItemDisabled) {
                  setValue(item.value);
                }
              }}
              onKeyDown={handleKeyDown}
              className={[
                'relative z-10 flex items-center justify-center shrink-0 whitespace-nowrap',
                'transition-colors duration-150 motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                sizeSegmentStyles[size],
                fullWidth ? 'flex-1' : '',
                isActive
                  ? 'text-white font-semibold'
                  : 'text-text-secondary font-medium',
                !isActive && !isItemDisabled ? 'hover:text-text-strong' : '',
                isItemDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  },
);

SegmentedControl.displayName = 'SegmentedControl';
