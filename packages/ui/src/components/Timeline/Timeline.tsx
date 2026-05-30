import React, { createContext, forwardRef, useContext } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type TimelineColor = 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type TimelineSize = 'sm' | 'md' | 'lg';
export type TimelineLineStyle = 'solid' | 'dashed';
export type TimelineAlign = 'left' | 'alternate';

export type TimelineItemProps = {
  title: string;
  description?: React.ReactNode;
  timestamp?: string;
  icon?: React.ReactNode;
  color?: TimelineColor;
  active?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export type TimelineProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  size?: TimelineSize;
  lineStyle?: TimelineLineStyle;
  align?: TimelineAlign;
};

/* ------------------------------------------------------------------ */
/*  Internal context                                                  */
/* ------------------------------------------------------------------ */

type TimelineContext = {
  index: number;
  totalItems: number;
  size: TimelineSize;
  lineStyle: TimelineLineStyle;
  align: TimelineAlign;
};

const TimelineCtx = createContext<TimelineContext>({
  index: 0,
  totalItems: 0,
  size: 'md',
  lineStyle: 'solid',
  align: 'left',
});

/* ------------------------------------------------------------------ */
/*  Size tokens                                                       */
/* ------------------------------------------------------------------ */

const dotSize: Record<TimelineSize, string> = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const dotSizeActive: Record<TimelineSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const iconDotSize: Record<TimelineSize, string> = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

const iconInnerSize: Record<TimelineSize, string> = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const titleSize: Record<TimelineSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

const timestampSize: Record<TimelineSize, string> = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
};

const descriptionSize: Record<TimelineSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-sm',
};

const itemSpacing: Record<TimelineSize, string> = {
  sm: 'pb-4',
  md: 'pb-6',
  lg: 'pb-8',
};

const contentGap: Record<TimelineSize, string> = {
  sm: 'ml-3',
  md: 'ml-4',
  lg: 'ml-5',
};

/* ------------------------------------------------------------------ */
/*  Color tokens                                                      */
/* ------------------------------------------------------------------ */

const dotColorClasses: Record<TimelineColor, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

const dotColorBg: Record<TimelineColor, React.CSSProperties> = {
  primary: { backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, var(--color-surface))' },
  success: { backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, var(--color-surface))' },
  warning: { backgroundColor: 'color-mix(in srgb, var(--color-warning) 15%, var(--color-surface))' },
  danger: { backgroundColor: 'color-mix(in srgb, var(--color-danger) 15%, var(--color-surface))' },
  info: { backgroundColor: 'color-mix(in srgb, var(--color-info) 15%, var(--color-surface))' },
};

const activeRingColor: Record<TimelineColor, string> = {
  primary: 'ring-primary/25',
  success: 'ring-success/25',
  warning: 'ring-warning/25',
  danger: 'ring-danger/25',
  info: 'ring-info/25',
};

/* ------------------------------------------------------------------ */
/*  TimelineItem                                                      */
/* ------------------------------------------------------------------ */

export const TimelineItem = forwardRef<HTMLDivElement, TimelineItemProps>(
  function TimelineItem(
    {
      title,
      description,
      timestamp,
      icon,
      color = 'primary',
      active = false,
      className,
      children,
    },
    ref,
  ) {
    const { index, totalItems, size, lineStyle, align } = useContext(TimelineCtx);
    const isLast = index === totalItems - 1;
    const isAlternateRight = align === 'alternate' && index % 2 === 1;

    /* Dot element */
    const dotElement = icon ? (
      <div
        className={[
          'flex items-center justify-center rounded-full shrink-0 text-white',
          iconDotSize[size],
          dotColorClasses[color],
          active && ['ring-4', activeRingColor[color]].join(' '),
        ]
          .filter(Boolean)
          .join(' ')}
        data-testid="timeline-dot"
      >
        <span className={['flex items-center justify-center', iconInnerSize[size]].join(' ')}>
          {icon}
        </span>
      </div>
    ) : (
      <div
        className={[
          'rounded-full shrink-0',
          active ? dotSizeActive[size] : dotSize[size],
          dotColorClasses[color],
          active && ['ring-4', activeRingColor[color]].join(' '),
        ]
          .filter(Boolean)
          .join(' ')}
        style={!icon && !active ? dotColorBg[color] : undefined}
        data-testid="timeline-dot"
      />
    );

    /* Connector line */
    const connectorLine = !isLast ? (
      <div
        className={[
          'flex-1 w-0.5 min-h-4',
          lineStyle === 'dashed'
            ? 'border-l-2 border-dashed border-surface-border bg-transparent'
            : 'bg-surface-border',
        ].join(' ')}
        data-testid="timeline-connector"
        aria-hidden="true"
      />
    ) : null;

    /* Content block */
    const contentBlock = (
      <div className={['flex flex-col min-w-0 flex-1 pt-px', isAlternateRight ? 'items-end text-right' : ''].filter(Boolean).join(' ')}>
        <div className={['flex items-baseline gap-2 flex-wrap', isAlternateRight ? 'flex-row-reverse' : ''].filter(Boolean).join(' ')}>
          <span
            className={[
              'font-medium leading-tight',
              titleSize[size],
              active ? 'text-text-strong' : 'text-text',
            ].join(' ')}
            data-testid="timeline-title"
          >
            {title}
          </span>
          {timestamp && (
            <span
              className={[
                'text-text-tertiary leading-tight whitespace-nowrap',
                timestampSize[size],
              ].join(' ')}
              data-testid="timeline-timestamp"
            >
              {timestamp}
            </span>
          )}
        </div>
        {description && (
          <div
            className={[
              'mt-1 text-text-secondary leading-relaxed',
              descriptionSize[size],
            ].join(' ')}
            data-testid="timeline-description"
          >
            {description}
          </div>
        )}
        {children && (
          <div className="mt-2">
            {children}
          </div>
        )}
      </div>
    );

    /* Alternate alignment: right items have content on left, dot+line on right */
    if (isAlternateRight) {
      return (
        <div
          ref={ref}
          className={[
            'flex gap-0',
            !isLast && itemSpacing[size],
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          data-timeline-item={index}
          data-active={active || undefined}
        >
          {/* Content on the left */}
          <div className={['flex-1', contentGap[size].replace('ml-', 'mr-')].join(' ')}>
            {contentBlock}
          </div>
          {/* Dot + line on the right */}
          <div className="flex flex-col items-center">
            {dotElement}
            {connectorLine}
          </div>
          {/* Empty spacer for symmetry */}
          <div className={['flex-1', contentGap[size]].join(' ')} />
        </div>
      );
    }

    /* Default left alignment */
    return (
      <div
        ref={ref}
        className={[
          'flex gap-0',
          !isLast && itemSpacing[size],
          align === 'alternate' && 'justify-start',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        data-timeline-item={index}
        data-active={active || undefined}
      >
        {/* Empty spacer for alternate left items */}
        {align === 'alternate' && (
          <div className={['flex-1', contentGap[size].replace('ml-', 'mr-')].join(' ')} />
        )}
        {/* Dot + line rail */}
        <div className="flex flex-col items-center">
          {dotElement}
          {connectorLine}
        </div>
        {/* Content */}
        <div className={contentGap[size]}>
          {contentBlock}
        </div>
        {align === 'alternate' && <div className="flex-1" />}
      </div>
    );
  },
);

TimelineItem.displayName = 'TimelineItem';

/* ------------------------------------------------------------------ */
/*  Timeline                                                          */
/* ------------------------------------------------------------------ */

export const Timeline = forwardRef<HTMLDivElement, TimelineProps>(function Timeline(
  {
    children,
    size = 'md',
    lineStyle = 'solid',
    align = 'left',
    className,
    ...rest
  },
  ref,
) {
  const items = React.Children.toArray(children);
  const totalItems = items.length;

  return (
    <div
      ref={ref}
      className={['flex flex-col w-full', className].filter(Boolean).join(' ')}
      role="list"
      aria-label="Timeline"
      {...rest}
    >
      {items.map((child, i) => (
        <TimelineCtx.Provider
          key={i}
          value={{ index: i, totalItems, size, lineStyle, align }}
        >
          {child}
        </TimelineCtx.Provider>
      ))}
    </div>
  );
});

Timeline.displayName = 'Timeline';
