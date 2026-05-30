import React, { forwardRef } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ActivityFeedColor = 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type ActivityFeedSize = 'sm' | 'md' | 'lg';

export type ActivityFeedItem = {
  id: string;
  avatar?: React.ReactNode;
  actor: string;
  action: string;
  target?: string;
  timestamp: string;
  icon?: React.ReactNode;
  color?: ActivityFeedColor;
  content?: React.ReactNode;
};

export type ActivityFeedProps = React.HTMLAttributes<HTMLDivElement> & {
  items: ActivityFeedItem[];
  size?: ActivityFeedSize;
  showConnector?: boolean;
};

/* ------------------------------------------------------------------ */
/*  Size tokens                                                       */
/* ------------------------------------------------------------------ */

const iconDotSize: Record<ActivityFeedSize, string> = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

const iconInnerSize: Record<ActivityFeedSize, string> = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const fallbackDotSize: Record<ActivityFeedSize, string> = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

const actorSize: Record<ActivityFeedSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

const actionSize: Record<ActivityFeedSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

const timestampSize: Record<ActivityFeedSize, string> = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
};

const contentSize: Record<ActivityFeedSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-sm',
};

const itemSpacing: Record<ActivityFeedSize, string> = {
  sm: 'pb-4',
  md: 'pb-6',
  lg: 'pb-8',
};

const contentGap: Record<ActivityFeedSize, string> = {
  sm: 'ml-3',
  md: 'ml-4',
  lg: 'ml-5',
};

/* ------------------------------------------------------------------ */
/*  Color tokens                                                      */
/* ------------------------------------------------------------------ */

const ringColorClasses: Record<ActivityFeedColor, string> = {
  primary: 'ring-primary/25',
  success: 'ring-success/25',
  warning: 'ring-warning/25',
  danger: 'ring-danger/25',
  info: 'ring-info/25',
};

const iconDotColorClasses: Record<ActivityFeedColor, string> = {
  primary: 'bg-primary text-white',
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  danger: 'bg-danger text-white',
  info: 'bg-info text-white',
};

const fallbackDotBg: Record<ActivityFeedColor, React.CSSProperties> = {
  primary: { backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, var(--color-surface))' },
  success: { backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, var(--color-surface))' },
  warning: { backgroundColor: 'color-mix(in srgb, var(--color-warning) 15%, var(--color-surface))' },
  danger: { backgroundColor: 'color-mix(in srgb, var(--color-danger) 15%, var(--color-surface))' },
  info: { backgroundColor: 'color-mix(in srgb, var(--color-info) 15%, var(--color-surface))' },
};

const fallbackDotTextColor: Record<ActivityFeedColor, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
};

/* ------------------------------------------------------------------ */
/*  Internal: single feed item                                        */
/* ------------------------------------------------------------------ */

type ActivityFeedItemInternalProps = {
  item: ActivityFeedItem;
  isLast: boolean;
  size: ActivityFeedSize;
  showConnector: boolean;
};

const ActivityFeedItemRow: React.FC<ActivityFeedItemInternalProps> = ({
  item,
  isLast,
  size,
  showConnector,
}) => {
  const color = item.color ?? 'primary';

  /* Avatar / icon / fallback dot */
  const dotElement = item.avatar ? (
    <div
      className={[
        'flex items-center justify-center rounded-full shrink-0 ring-2',
        iconDotSize[size],
        ringColorClasses[color],
      ].join(' ')}
      data-testid="activity-feed-dot"
    >
      {item.avatar}
    </div>
  ) : item.icon ? (
    <div
      className={[
        'flex items-center justify-center rounded-full shrink-0 ring-2',
        iconDotSize[size],
        iconDotColorClasses[color],
        ringColorClasses[color],
      ].join(' ')}
      data-testid="activity-feed-dot"
    >
      <span className={['flex items-center justify-center', iconInnerSize[size]].join(' ')}>
        {item.icon}
      </span>
    </div>
  ) : (
    <div
      className={[
        'flex items-center justify-center rounded-full shrink-0 font-medium',
        fallbackDotSize[size],
        fallbackDotTextColor[color],
      ].join(' ')}
      style={fallbackDotBg[color]}
      data-testid="activity-feed-dot"
    >
      {item.actor.charAt(0).toUpperCase()}
    </div>
  );

  /* Connector line */
  const connectorLine =
    showConnector && !isLast ? (
      <div
        className="flex-1 w-0.5 min-h-4 bg-surface-border"
        data-testid="activity-feed-connector"
        aria-hidden="true"
      />
    ) : null;

  return (
    <div
      className={[
        'flex gap-0',
        !isLast && itemSpacing[size],
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid="activity-feed-item"
    >
      {/* Dot + connector rail */}
      <div className="flex flex-col items-center">
        {dotElement}
        {connectorLine}
      </div>

      {/* Content */}
      <div className={['flex flex-col min-w-0 flex-1 pt-px', contentGap[size]].join(' ')}>
        {/* Action line */}
        <div className="flex items-baseline gap-1 flex-wrap">
          <span
            className={[
              'font-semibold text-text-strong leading-tight',
              actorSize[size],
            ].join(' ')}
            data-testid="activity-feed-actor"
          >
            {item.actor}
          </span>
          <span
            className={[
              'text-text-secondary leading-tight',
              actionSize[size],
            ].join(' ')}
            data-testid="activity-feed-action"
          >
            {item.action}
          </span>
          {item.target && (
            <span
              className={[
                'font-medium text-primary leading-tight',
                actionSize[size],
              ].join(' ')}
              data-testid="activity-feed-target"
            >
              {item.target}
            </span>
          )}
        </div>

        {/* Timestamp */}
        <span
          className={[
            'text-text-tertiary leading-tight mt-0.5',
            timestampSize[size],
          ].join(' ')}
          data-testid="activity-feed-timestamp"
        >
          {item.timestamp}
        </span>

        {/* Optional content slot */}
        {item.content && (
          <div
            className={[
              'mt-2 text-text-secondary leading-relaxed',
              contentSize[size],
            ].join(' ')}
            data-testid="activity-feed-content"
          >
            {item.content}
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  ActivityFeed                                                      */
/* ------------------------------------------------------------------ */

export const ActivityFeed = forwardRef<HTMLDivElement, ActivityFeedProps>(
  function ActivityFeed(
    {
      items,
      size = 'md',
      showConnector = true,
      className,
      ...rest
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={['flex flex-col w-full', className].filter(Boolean).join(' ')}
        role="feed"
        aria-label="Activity feed"
        {...rest}
      >
        {items.map((item, i) => (
          <ActivityFeedItemRow
            key={item.id}
            item={item}
            isLast={i === items.length - 1}
            size={size}
            showConnector={showConnector}
          />
        ))}
      </div>
    );
  },
);

ActivityFeed.displayName = 'ActivityFeed';
