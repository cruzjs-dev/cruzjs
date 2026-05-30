import React, { forwardRef } from 'react';

export type StatusDotStatus = 'online' | 'offline' | 'busy' | 'away' | 'none';
export type StatusDotSize = 'sm' | 'md' | 'lg';

export type StatusDotProps = React.HTMLAttributes<HTMLSpanElement> & {
  status: StatusDotStatus;
  size?: StatusDotSize;
  pulse?: boolean;
  label?: string;
  className?: string;
};

const statusColorStyles: Record<StatusDotStatus, string> = {
  online: 'bg-success',
  offline: 'bg-text-muted',
  busy: 'bg-danger',
  away: 'bg-warning',
  none: 'bg-surface-border',
};

const statusLabels: Record<StatusDotStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  busy: 'Busy',
  away: 'Away',
  none: 'No status',
};

const dotSizeStyles: Record<StatusDotSize, string> = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

const labelSizeStyles: Record<StatusDotSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export const StatusDot = forwardRef<HTMLSpanElement, StatusDotProps>(function StatusDot(
  {
    status,
    size = 'md',
    pulse = false,
    label,
    className,
    ...rest
  },
  ref,
) {
  const shouldPulse = pulse && status === 'online';

  return (
    <span
      ref={ref}
      className={[
        'inline-flex items-center gap-1.5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={label ?? statusLabels[status]}
      role="status"
      {...rest}
    >
      <span
        className={[
          'inline-block rounded-full shrink-0',
          dotSizeStyles[size],
          statusColorStyles[status],
          shouldPulse && 'status-dot-pulse',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
      />
      {label && (
        <span className={['text-text-secondary', labelSizeStyles[size]].join(' ')}>
          {label}
        </span>
      )}
      <style>{`
        @keyframes status-dot-pulse-keyframes {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
        .status-dot-pulse {
          animation: status-dot-pulse-keyframes 2s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
        }
      `}</style>
    </span>
  );
});

StatusDot.displayName = 'StatusDot';
