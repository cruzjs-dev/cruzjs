import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

export type SpoilerProps = React.HTMLAttributes<HTMLDivElement> & {
  maxHeight: number;
  showLabel?: React.ReactNode;
  hideLabel?: React.ReactNode;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  transitionDuration?: number;
};

export const Spoiler = forwardRef<HTMLDivElement, SpoilerProps>(function Spoiler(
  {
    maxHeight,
    showLabel = 'Show more',
    hideLabel = 'Show less',
    expanded: controlledExpanded,
    defaultExpanded = false,
    onExpandedChange,
    transitionDuration = 200,
    children,
    className,
    style,
    ...rest
  },
  ref,
) {
  const isControlled = controlledExpanded !== undefined;
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;

  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [overflows, setOverflows] = useState(false);

  const measureContent = useCallback(() => {
    if (contentRef.current) {
      const scrollH = contentRef.current.scrollHeight;
      setContentHeight(scrollH);
      setOverflows(scrollH > maxHeight);
    }
  }, [maxHeight]);

  useEffect(() => {
    measureContent();
  }, [measureContent, children]);

  useEffect(() => {
    const node = contentRef.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver(() => {
      measureContent();
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [measureContent]);

  const toggle = useCallback(() => {
    const next = !isExpanded;
    if (!isControlled) {
      setInternalExpanded(next);
    }
    onExpandedChange?.(next);
  }, [isExpanded, isControlled, onExpandedChange]);

  const resolvedMaxHeight = isExpanded || !overflows ? contentHeight : maxHeight;

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: 'relative', ...style }}
      {...rest}
    >
      <div
        ref={contentRef}
        data-testid="spoiler-content"
        className="overflow-hidden"
        style={{
          maxHeight: resolvedMaxHeight,
          transitionProperty: 'max-height',
          transitionDuration: `${transitionDuration}ms`,
          transitionTimingFunction: 'var(--ease-smooth, cubic-bezier(0.4, 0, 0.2, 1))',
        }}
      >
        {children}
      </div>

      {overflows && !isExpanded && (
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface to-transparent"
          style={{ height: 32 }}
          aria-hidden="true"
        />
      )}

      {overflows && (
        <button
          type="button"
          onClick={toggle}
          className="text-primary text-sm font-medium hover:text-primary-dark transition-colors cursor-pointer mt-1 bg-transparent border-none p-0"
          style={{
            transitionDuration: `${transitionDuration}ms`,
          }}
        >
          {isExpanded ? hideLabel : showLabel}
        </button>
      )}
    </div>
  );
});

Spoiler.displayName = 'Spoiler';
