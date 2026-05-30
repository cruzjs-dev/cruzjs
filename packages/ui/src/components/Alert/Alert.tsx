import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';
export type AlertSize = 'sm' | 'md' | 'lg';

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
  size?: AlertSize;
  title?: string;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
};

const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
      clipRule="evenodd"
    />
  </svg>
);

const SuccessIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
      clipRule="evenodd"
    />
  </svg>
);

const WarningIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
      clipRule="evenodd"
    />
  </svg>
);

const ErrorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
      clipRule="evenodd"
    />
  </svg>
);

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
  </svg>
);

const defaultIcons: Record<AlertVariant, React.FC<{ className?: string }>> = {
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
};

const variantStyles: Record<AlertVariant, { container: string; iconWrap: string; icon: string; title: string; body: string; close: string }> = {
  info: {
    container: 'border border-info/20',
    iconWrap: 'bg-info/10 ring-1 ring-info/20',
    icon: 'text-info',
    title: 'text-text-strong',
    body: 'text-text-secondary',
    close: 'text-text-tertiary hover:text-text hover:bg-surface-lighter',
  },
  success: {
    container: 'border border-success/20',
    iconWrap: 'bg-success/10 ring-1 ring-success/20',
    icon: 'text-success',
    title: 'text-text-strong',
    body: 'text-text-secondary',
    close: 'text-text-tertiary hover:text-text hover:bg-surface-lighter',
  },
  warning: {
    container: 'border border-warning/20',
    iconWrap: 'ring-1 ring-warning/20',
    icon: 'text-warning-text',
    title: 'text-text-strong',
    body: 'text-text-secondary',
    close: 'text-text-tertiary hover:text-text hover:bg-surface-lighter',
  },
  error: {
    container: 'border border-danger/20',
    iconWrap: 'ring-1 ring-danger/20',
    icon: 'text-danger',
    title: 'text-text-strong',
    body: 'text-text-secondary',
    close: 'text-text-tertiary hover:text-text hover:bg-surface-lighter',
  },
};

const variantBg: Record<AlertVariant, React.CSSProperties> = {
  info: { backgroundColor: 'color-mix(in srgb, var(--color-info) 4%, var(--color-surface))' },
  success: { backgroundColor: 'color-mix(in srgb, var(--color-success) 4%, var(--color-surface))' },
  warning: { backgroundColor: 'color-mix(in srgb, var(--color-warning) 4%, var(--color-surface))' },
  error: { backgroundColor: 'color-mix(in srgb, var(--color-danger) 4%, var(--color-surface))' },
};

const iconWrapBg: Record<AlertVariant, React.CSSProperties> = {
  info: {},
  success: {},
  warning: { backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, transparent)' },
  error: { backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)' },
};

const sizeStyles: Record<AlertSize, { container: string; icon: string; iconWrap: string; closeBtn: string; closeIcon: string }> = {
  sm: { container: 'px-3 py-2.5 text-xs gap-2.5', icon: 'w-3.5 h-3.5', iconWrap: 'p-1 rounded-md', closeBtn: 'p-0.5 rounded-md', closeIcon: 'w-3.5 h-3.5' },
  md: { container: 'px-4 py-3.5 text-sm gap-3', icon: 'w-4 h-4', iconWrap: 'p-1.5 rounded-lg', closeBtn: 'p-1 rounded-lg', closeIcon: 'w-4 h-4' },
  lg: { container: 'px-5 py-4 text-base gap-3.5', icon: 'w-5 h-5', iconWrap: 'p-2 rounded-lg', closeBtn: 'p-1 rounded-lg', closeIcon: 'w-5 h-5' },
};

const roleByVariant: Record<AlertVariant, 'alert' | 'status'> = {
  info: 'status',
  success: 'status',
  warning: 'alert',
  error: 'alert',
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    variant = 'info',
    size = 'md',
    title,
    icon,
    dismissible = false,
    onDismiss,
    children,
    className,
    style,
    ...rest
  },
  ref,
) {
  const [dismissed, setDismissed] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (dismissible && e.key === 'Escape') {
        e.stopPropagation();
        handleDismiss();
      }
    },
    [dismissible, handleDismiss],
  );

  const [removed, setRemoved] = useState(false);
  useEffect(() => {
    if (dismissed) {
      const timer = setTimeout(() => setRemoved(true), 200);
      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  if (removed) return null;

  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const DefaultIcon = defaultIcons[variant];
  const hasCustomIcon = icon !== undefined;
  const renderIcon = hasCustomIcon ? icon : <DefaultIcon className={[s.icon, v.icon].join(' ')} />;

  return (
    <div
      ref={ref}
      role={roleByVariant[variant]}
      onKeyDown={handleKeyDown}
      className={[
        'relative flex items-start rounded-2xl',
        'shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)]',
        'transition-all duration-200',
        dismissed && 'opacity-0 scale-[0.97] translate-y-1',
        v.container,
        s.container,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        ...variantBg[variant],
        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        ...style,
      }}
      {...rest}
    >
      {renderIcon && (
        <span
          className={['shrink-0 inline-flex items-center justify-center', s.iconWrap, v.iconWrap].join(' ')}
          style={iconWrapBg[variant]}
        >
          {renderIcon}
        </span>
      )}

      <div className="flex-1 min-w-0 pt-px">
        {title && (
          <p className={[
            'font-semibold tracking-tight leading-snug',
            v.title,
            size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm',
          ].join(' ')}>
            {title}
          </p>
        )}
        {children && (
          <div className={[
            'leading-relaxed',
            v.body,
            title ? 'mt-0.5' : '',
          ].filter(Boolean).join(' ')}>
            {children}
          </div>
        )}
      </div>

      {dismissible && (
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Dismiss alert"
          onClick={handleDismiss}
          className={[
            'shrink-0',
            'transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
            v.close,
            s.closeBtn,
          ].join(' ')}
        >
          <CloseIcon className={s.closeIcon} />
        </button>
      )}
    </div>
  );
});

Alert.displayName = 'Alert';
