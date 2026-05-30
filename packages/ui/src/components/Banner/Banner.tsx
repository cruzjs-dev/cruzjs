import React, { forwardRef, useCallback, useEffect, useState } from 'react';

export type BannerVariant = 'info' | 'success' | 'warning' | 'primary';
export type BannerPosition = 'top' | 'bottom';

export type BannerProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: React.ReactNode;
  variant?: BannerVariant;
  position?: BannerPosition;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  sticky?: boolean;
  compact?: boolean;
};

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
  </svg>
);

const variantStyles: Record<BannerVariant, { container: string; close: string }> = {
  info: {
    container: 'bg-info-subtle text-info',
    close: 'text-current opacity-70 hover:opacity-100',
  },
  success: {
    container: 'bg-success-subtle text-success-text',
    close: 'text-current opacity-70 hover:opacity-100',
  },
  warning: {
    container: 'bg-warning-subtle text-warning-text',
    close: 'text-current opacity-70 hover:opacity-100',
  },
  primary: {
    container: 'bg-primary text-surface',
    close: 'text-current opacity-70 hover:opacity-100',
  },
};

const positionStyles: Record<BannerPosition, string> = {
  top: 'top-0 left-0 right-0',
  bottom: 'bottom-0 left-0 right-0',
};

export const Banner = forwardRef<HTMLDivElement, BannerProps>(function Banner(
  {
    children,
    variant = 'info',
    position = 'top',
    icon,
    action,
    dismissible = false,
    onDismiss,
    sticky = false,
    compact = false,
    className,
    ...rest
  },
  ref,
) {
  const [dismissed, setDismissed] = useState(false);
  const [removed, setRemoved] = useState(false);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    if (dismissed) {
      const timer = setTimeout(() => setRemoved(true), 200);
      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  if (removed) return null;

  const v = variantStyles[variant];

  return (
    <div
      ref={ref}
      role="banner"
      data-variant={variant}
      data-position={position}
      className={[
        'flex items-center justify-center gap-3 w-full z-50',
        'transition-all duration-200',
        'motion-reduce:transition-none',
        compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
        v.container,
        sticky && 'sticky',
        sticky && positionStyles[position],
        dismissed && 'opacity-0 scale-y-0',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}

      <span className="flex-1 text-center min-w-0">{children}</span>

      {action && <span className="shrink-0 flex items-center">{action}</span>}

      {dismissible && (
        <button
          type="button"
          aria-label="Dismiss banner"
          onClick={handleDismiss}
          className={[
            'shrink-0 rounded p-0.5',
            'transition-opacity duration-150',
            'motion-reduce:transition-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-1',
            v.close,
          ].join(' ')}
        >
          <CloseIcon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </button>
      )}
    </div>
  );
});

Banner.displayName = 'Banner';
