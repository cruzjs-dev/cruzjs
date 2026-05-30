import React, { forwardRef } from 'react';

export type ScrollAreaOrientation = 'vertical' | 'horizontal' | 'both';

export type ScrollAreaProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  maxHeight?: string | number;
  orientation?: ScrollAreaOrientation;
  className?: string;
  style?: React.CSSProperties;
};

const orientationStyles: Record<ScrollAreaOrientation, string> = {
  vertical: 'scroll-area-vertical',
  horizontal: 'scroll-area-horizontal',
  both: 'scroll-area-both',
};

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  {
    children,
    maxHeight,
    orientation = 'vertical',
    className,
    style,
    ...rest
  },
  ref,
) {
  const resolvedMaxHeight = typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;

  const mergedStyle: React.CSSProperties = {
    ...style,
    ...(resolvedMaxHeight ? { maxHeight: resolvedMaxHeight } : {}),
  };

  return (
    <div
      ref={ref}
      className={[
        'scroll-area',
        orientationStyles[orientation],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={mergedStyle}
      tabIndex={0}
      role="region"
      aria-label="Scrollable content"
      {...rest}
    >
      {children}
      <style>{`
        .scroll-area {
          position: relative;
          scrollbar-width: thin;
          scrollbar-color: var(--color-surface-border, #d1d5db) transparent;
        }

        .scroll-area-vertical {
          overflow-x: hidden;
          overflow-y: auto;
        }

        .scroll-area-horizontal {
          overflow-x: auto;
          overflow-y: hidden;
        }

        .scroll-area-both {
          overflow: auto;
        }

        /* Webkit scrollbar styling */
        .scroll-area::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .scroll-area::-webkit-scrollbar-track {
          background: transparent;
        }

        .scroll-area::-webkit-scrollbar-thumb {
          background-color: var(--color-surface-border, #d1d5db);
          border-radius: 9999px;
          opacity: 0;
          transition: opacity 200ms ease;
        }

        .scroll-area::-webkit-scrollbar-thumb:hover {
          background-color: var(--color-text-muted, #9ca3af);
        }

        /* Show scrollbar on hover and during scroll */
        .scroll-area:hover::-webkit-scrollbar-thumb,
        .scroll-area:focus::-webkit-scrollbar-thumb {
          opacity: 1;
          background-color: var(--color-surface-border, #d1d5db);
        }

        .scroll-area::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>
    </div>
  );
});

ScrollArea.displayName = 'ScrollArea';
