import React, { forwardRef, useCallback, useRef, useState } from 'react';

export type SplitterOrientation = 'horizontal' | 'vertical';

export type SplitterProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: [React.ReactNode, React.ReactNode];
  orientation?: SplitterOrientation;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  onResize?: (size: number) => void;
  collapsible?: boolean;
  disabled?: boolean;
};

function clampSize(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const Splitter = forwardRef<HTMLDivElement, SplitterProps>(function Splitter(
  {
    children,
    orientation = 'horizontal',
    defaultSize = 50,
    minSize = 10,
    maxSize = 90,
    onResize,
    collapsible = false,
    disabled = false,
    className,
    ...rest
  },
  ref,
) {
  const [size, setSize] = useState(() => clampSize(defaultSize, minSize, maxSize));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isHorizontal = orientation === 'horizontal';

  const displaySize = isCollapsed ? 0 : size;

  const updateSize = useCallback(
    (next: number) => {
      const clamped = clampSize(next, minSize, maxSize);
      setSize(clamped);
      setIsCollapsed(false);
      onResize?.(clamped);
    },
    [minSize, maxSize, onResize],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
    },
    [disabled],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || disabled) {
        return;
      }
      const container = containerRef.current;
      if (!container) {
        return;
      }
      const rect = container.getBoundingClientRect();
      let ratio: number;
      if (isHorizontal) {
        ratio = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        ratio = ((e.clientY - rect.top) / rect.height) * 100;
      }
      updateSize(ratio);
    },
    [isDragging, disabled, isHorizontal, updateSize],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (disabled || !collapsible) {
      return;
    }
    if (isCollapsed) {
      setIsCollapsed(false);
      onResize?.(size);
    } else {
      setIsCollapsed(true);
      onResize?.(0);
    }
  }, [disabled, collapsible, isCollapsed, size, onResize]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) {
        return;
      }

      const step = 1;
      let next: number | undefined;

      if (isHorizontal) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            next = (isCollapsed ? 0 : size) - step;
            break;
          case 'ArrowRight':
            e.preventDefault();
            next = (isCollapsed ? 0 : size) + step;
            break;
        }
      } else {
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            next = (isCollapsed ? 0 : size) - step;
            break;
          case 'ArrowDown':
            e.preventDefault();
            next = (isCollapsed ? 0 : size) + step;
            break;
        }
      }

      if (next !== undefined) {
        updateSize(next);
      }
    },
    [disabled, isHorizontal, isCollapsed, size, updateSize],
  );

  const dividerStyle: React.CSSProperties = isHorizontal
    ? {
        width: '4px',
        cursor: disabled ? 'default' : isDragging ? 'grabbing' : 'col-resize',
        transition: isDragging ? 'none' : 'width 150ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }
    : {
        height: '4px',
        cursor: disabled ? 'default' : isDragging ? 'grabbing' : 'row-resize',
        transition: isDragging ? 'none' : 'height 150ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      };

  return (
    <div
      ref={(node) => {
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      }}
      className={[
        'flex overflow-hidden',
        isHorizontal ? 'flex-row' : 'flex-col',
        disabled ? 'opacity-50' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ height: '100%', ...rest.style }}
      {...rest}
    >
      {/* First pane */}
      <div
        data-testid="splitter-pane-0"
        className="overflow-auto"
        style={{
          flexBasis: `${displaySize}%`,
          flexShrink: 0,
          flexGrow: 0,
          transition: isDragging ? 'none' : 'flex-basis 150ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {children[0]}
      </div>

      {/* Divider */}
      <div
        role="separator"
        tabIndex={disabled ? -1 : 0}
        aria-valuenow={Math.round(displaySize)}
        aria-valuemin={minSize}
        aria-valuemax={maxSize}
        aria-orientation={orientation}
        aria-label="Resize panels"
        data-testid="splitter-divider"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={[
          'flex-shrink-0 relative z-10',
          'focus-visible:outline-none',
        ].join(' ')}
        style={{
          ...dividerStyle,
          backgroundColor: isDragging
            ? 'var(--color-primary)'
            : 'var(--color-surface-border)',
        }}
      >
        {/* Hover / focus hit zone expansion */}
        <div
          className="absolute"
          style={
            isHorizontal
              ? {
                  top: 0,
                  bottom: 0,
                  left: '-2px',
                  right: '-2px',
                }
              : {
                  left: 0,
                  right: 0,
                  top: '-2px',
                  bottom: '-2px',
                }
          }
        />
        {/* Focus ring */}
        {isFocused && (
          <div
            className="absolute inset-0"
            style={{
              boxShadow: '0 0 0 2px color-mix(in srgb, var(--color-primary) 50%, transparent)',
            }}
          />
        )}
      </div>

      {/* Second pane */}
      <div
        data-testid="splitter-pane-1"
        className="overflow-auto"
        style={{
          flexBasis: `${100 - displaySize}%`,
          flexShrink: 0,
          flexGrow: 0,
          transition: isDragging ? 'none' : 'flex-basis 150ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {children[1]}
      </div>
    </div>
  );
});

Splitter.displayName = 'Splitter';
