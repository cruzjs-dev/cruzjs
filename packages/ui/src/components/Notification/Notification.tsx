import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type NotificationVariant = 'info' | 'success' | 'warning' | 'error';

export type NotificationPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

export type NotificationAction = {
  label: string;
  onClick: () => void;
};

export type NotificationProps = {
  id?: string;
  title: string;
  message?: string;
  variant?: NotificationVariant;
  duration?: number;
  closable?: boolean;
  onClose?: () => void;
  icon?: React.ReactNode;
  action?: NotificationAction;
  className?: string;
};

type NotificationContextValue = {
  show: (props: NotificationProps) => string;
  close: (id: string) => void;
  closeAll: () => void;
};

type InternalNotification = NotificationProps & {
  id: string;
  createdAt: number;
};

// ─── Icons ──────────────────────────────────────────────────────────────────

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

const defaultIcons: Record<NotificationVariant, React.FC<{ className?: string }>> = {
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
};

// ─── Variant Styles ─────────────────────────────────────────────────────────

const variantStyles: Record<
  NotificationVariant,
  { container: string; iconWrap: string; icon: string; title: string; body: string; close: string; action: string; progress: string }
> = {
  info: {
    container: 'ring-1 ring-info/20',
    iconWrap: 'bg-info/10 ring-1 ring-info/20',
    icon: 'text-info',
    title: 'text-text-strong',
    body: 'text-text-secondary',
    close: 'text-text-tertiary hover:text-text hover:bg-surface-lighter',
    action: 'text-info hover:text-info/80',
    progress: 'bg-info',
  },
  success: {
    container: 'ring-1 ring-success/20',
    iconWrap: 'bg-success/10 ring-1 ring-success/20',
    icon: 'text-success',
    title: 'text-text-strong',
    body: 'text-text-secondary',
    close: 'text-text-tertiary hover:text-text hover:bg-surface-lighter',
    action: 'text-success hover:text-success/80',
    progress: 'bg-success',
  },
  warning: {
    container: 'ring-1 ring-warning/20',
    iconWrap: 'ring-1 ring-warning/20',
    icon: 'text-warning-text',
    title: 'text-text-strong',
    body: 'text-text-secondary',
    close: 'text-text-tertiary hover:text-text hover:bg-surface-lighter',
    action: 'text-warning-text hover:text-warning-text/80',
    progress: 'bg-warning',
  },
  error: {
    container: 'ring-1 ring-danger/20',
    iconWrap: 'ring-1 ring-danger/20',
    icon: 'text-danger',
    title: 'text-text-strong',
    body: 'text-text-secondary',
    close: 'text-text-tertiary hover:text-text hover:bg-surface-lighter',
    action: 'text-danger hover:text-danger/80',
    progress: 'bg-danger',
  },
};

const variantBg: Record<NotificationVariant, React.CSSProperties> = {
  info: { backgroundColor: 'color-mix(in srgb, var(--color-info) 6%, var(--color-surface))' },
  success: { backgroundColor: 'color-mix(in srgb, var(--color-success) 6%, var(--color-surface))' },
  warning: { backgroundColor: 'color-mix(in srgb, var(--color-warning) 6%, var(--color-surface))' },
  error: { backgroundColor: 'color-mix(in srgb, var(--color-danger) 6%, var(--color-surface))' },
};

const iconWrapBg: Record<NotificationVariant, React.CSSProperties> = {
  info: {},
  success: {},
  warning: { backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, transparent)' },
  error: { backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)' },
};

// ─── Position Styles ────────────────────────────────────────────────────────

const positionContainerStyles: Record<NotificationPosition, string> = {
  'top-right': 'top-0 right-0 items-end',
  'top-left': 'top-0 left-0 items-start',
  'top-center': 'top-0 left-1/2 -translate-x-1/2 items-center',
  'bottom-right': 'bottom-0 right-0 items-end',
  'bottom-left': 'bottom-0 left-0 items-start',
  'bottom-center': 'bottom-0 left-1/2 -translate-x-1/2 items-center',
};

const slideOrigin: Record<NotificationPosition, string> = {
  'top-right': 'translateX(100%)',
  'top-left': 'translateX(-100%)',
  'top-center': 'translateY(-100%)',
  'bottom-right': 'translateX(100%)',
  'bottom-left': 'translateX(-100%)',
  'bottom-center': 'translateY(100%)',
};

// ─── ID Generation ──────────────────────────────────────────────────────────

let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  return `notification-${idCounter}`;
}

/** Reset ID counter (for tests only). */
export function resetIdCounter(): void {
  idCounter = 0;
}

// ─── Context ────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ─── Individual Notification ────────────────────────────────────────────────

type NotificationItemProps = {
  notification: InternalNotification;
  position: NotificationPosition;
  onClose: (id: string) => void;
};

const SPRING_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

const NotificationItem = forwardRef<HTMLDivElement, NotificationItemProps>(
  function NotificationItem({ notification, position, onClose }, ref) {
    const {
      id,
      title,
      message,
      variant = 'info',
      duration = 5000,
      closable = true,
      icon,
      action,
      className,
      onClose: onCloseCallback,
    } = notification;

    const [state, setState] = useState<'entering' | 'visible' | 'exiting'>('entering');
    const [hovered, setHovered] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const remainingRef = useRef(duration);
    const startTimeRef = useRef(Date.now());
    const progressRef = useRef<HTMLDivElement>(null);

    // Enter animation
    useEffect(() => {
      const frame = requestAnimationFrame(() => {
        setState('visible');
      });
      return () => cancelAnimationFrame(frame);
    }, []);

    // Auto-dismiss timer
    useEffect(() => {
      if (duration <= 0 || state === 'exiting') {
        return;
      }

      if (hovered) {
        // Pause: capture remaining time
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        const elapsed = Date.now() - startTimeRef.current;
        remainingRef.current = Math.max(0, remainingRef.current - elapsed);
        return;
      }

      // Start or resume timer
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        setState('exiting');
      }, remainingRef.current);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [duration, hovered, state]);

    // Progress bar animation
    useEffect(() => {
      if (duration <= 0 || !progressRef.current) {
        return;
      }

      const el = progressRef.current;

      if (hovered) {
        // Pause: freeze the progress bar
        const computed = getComputedStyle(el);
        const currentWidth = computed.width;
        el.style.transition = 'none';
        el.style.width = currentWidth;
        return;
      }

      // Resume: animate from current width to 0
      const frame = requestAnimationFrame(() => {
        if (progressRef.current) {
          progressRef.current.style.transition = `width ${remainingRef.current}ms linear`;
          progressRef.current.style.width = '0%';
        }
      });

      return () => cancelAnimationFrame(frame);
    }, [duration, hovered]);

    // Set initial progress bar width
    useEffect(() => {
      if (duration <= 0 || !progressRef.current) {
        return;
      }
      // Start at 100% then animate to 0
      progressRef.current.style.width = '100%';
    }, [duration]);

    // Remove from DOM after exit animation
    useEffect(() => {
      if (state !== 'exiting') {
        return;
      }
      const timer = setTimeout(() => {
        onCloseCallback?.();
        onClose(id);
      }, 300);
      return () => clearTimeout(timer);
    }, [state, id, onClose, onCloseCallback]);

    const handleClose = useCallback(() => {
      setState('exiting');
    }, []);

    const handleMouseEnter = useCallback(() => {
      setHovered(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
      setHovered(false);
    }, []);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape' && closable) {
          e.stopPropagation();
          handleClose();
        }
      },
      [closable, handleClose],
    );

    const v = variantStyles[variant];
    const DefaultIcon = defaultIcons[variant];
    const hasCustomIcon = icon !== undefined;
    const renderIcon = hasCustomIcon ? icon : <DefaultIcon className={['w-4 h-4', v.icon].join(' ')} />;

    const transformOrigin = slideOrigin[position];
    const isEntering = state === 'entering';
    const isExiting = state === 'exiting';

    const itemStyle: React.CSSProperties = {
      ...variantBg[variant],
      transform: isEntering ? transformOrigin : isExiting ? undefined : 'translateX(0) translateY(0)',
      opacity: isExiting ? 0 : isEntering ? 0 : 1,
      transition: isExiting
        ? 'opacity 300ms ease-out, transform 300ms ease-out'
        : `opacity 400ms ${SPRING_EASING}, transform 400ms ${SPRING_EASING}`,
    };

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={[
          'relative flex items-start gap-3 rounded-2xl px-4 py-3.5 w-[22rem] max-w-full overflow-hidden',
          'shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08),0_2px_6px_-1px_rgba(0,0,0,0.06)]',
          v.container,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={itemStyle}
        tabIndex={-1}
      >
        {/* Icon */}
        {renderIcon && (
          <span
            className={['shrink-0 inline-flex items-center justify-center p-1.5 rounded-lg', v.iconWrap].join(' ')}
            style={iconWrapBg[variant]}
          >
            {renderIcon}
          </span>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 pt-px">
          <p
            className={[
              'text-sm font-semibold tracking-tight leading-snug',
              v.title,
            ].join(' ')}
          >
            {title}
          </p>
          {message && (
            <p
              className={[
                'text-sm leading-relaxed mt-0.5',
                v.body,
              ].join(' ')}
            >
              {message}
            </p>
          )}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={[
                'mt-2 text-sm font-medium transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded',
                v.action,
              ].join(' ')}
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Close button */}
        {closable && (
          <button
            type="button"
            aria-label="Close notification"
            onClick={handleClose}
            className={[
              'shrink-0 p-1 rounded-lg',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              v.close,
            ].join(' ')}
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}

        {/* Progress bar */}
        {duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/5 overflow-hidden rounded-b-2xl">
            <div
              ref={progressRef}
              className={['h-full opacity-40', v.progress].join(' ')}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>
    );
  },
);

NotificationItem.displayName = 'NotificationItem';

// ─── Provider ───────────────────────────────────────────────────────────────

export type NotificationProviderProps = {
  children: React.ReactNode;
  position?: NotificationPosition;
  maxVisible?: number;
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  position = 'top-right',
  maxVisible = 5,
}) => {
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);

  const show = useCallback(
    (props: NotificationProps): string => {
      const id = props.id ?? generateId();
      const notification: InternalNotification = {
        ...props,
        id,
        createdAt: Date.now(),
      };
      setNotifications((prev) => [...prev, notification]);
      return id;
    },
    [],
  );

  const close = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const closeAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const contextValue = useMemo(
    () => ({ show, close, closeAll }),
    [show, close, closeAll],
  );

  const visibleNotifications = notifications.slice(-maxVisible);
  const isBottom = position.startsWith('bottom');

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <div
        className={[
          'fixed z-50 flex flex-col gap-3 p-4 pointer-events-none',
          positionContainerStyles[position],
        ].join(' ')}
        aria-label="Notifications"
      >
        {(isBottom ? [...visibleNotifications].reverse() : visibleNotifications).map(
          (notification) => (
            <div key={notification.id} className="pointer-events-auto">
              <NotificationItem
                notification={notification}
                position={position}
                onClose={close}
              />
            </div>
          ),
        )}
      </div>
    </NotificationContext.Provider>
  );
};

NotificationProvider.displayName = 'NotificationProvider';

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// ─── Standalone Notification (for Storybook / direct use) ───────────────────

export const Notification = forwardRef<HTMLDivElement, NotificationProps>(
  function Notification(props, ref) {
    const {
      title,
      message,
      variant = 'info',
      closable = true,
      onClose,
      icon,
      action,
      className,
      ...rest
    } = props;

    const [dismissed, setDismissed] = useState(false);
    const [removed, setRemoved] = useState(false);

    const handleDismiss = useCallback(() => {
      setDismissed(true);
      onClose?.();
    }, [onClose]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (closable && e.key === 'Escape') {
          e.stopPropagation();
          handleDismiss();
        }
      },
      [closable, handleDismiss],
    );

    useEffect(() => {
      if (dismissed) {
        const timer = setTimeout(() => setRemoved(true), 300);
        return () => clearTimeout(timer);
      }
    }, [dismissed]);

    if (removed) {
      return null;
    }

    const v = variantStyles[variant];
    const DefaultIcon = defaultIcons[variant];
    const hasCustomIcon = icon !== undefined;
    const renderIcon = hasCustomIcon ? icon : <DefaultIcon className={['w-4 h-4', v.icon].join(' ')} />;

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        onKeyDown={handleKeyDown}
        className={[
          'relative flex items-start gap-3 rounded-2xl px-4 py-3.5 w-[22rem] max-w-full overflow-hidden',
          'shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08),0_2px_6px_-1px_rgba(0,0,0,0.06)]',
          'transition-all duration-300',
          dismissed && 'opacity-0 scale-[0.97]',
          v.container,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          ...variantBg[variant],
          transitionTimingFunction: SPRING_EASING,
        }}
        tabIndex={-1}
        {...rest}
      >
        {/* Icon */}
        {renderIcon && (
          <span
            className={['shrink-0 inline-flex items-center justify-center p-1.5 rounded-lg', v.iconWrap].join(' ')}
            style={iconWrapBg[variant]}
          >
            {renderIcon}
          </span>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 pt-px">
          <p
            className={[
              'text-sm font-semibold tracking-tight leading-snug',
              v.title,
            ].join(' ')}
          >
            {title}
          </p>
          {message && (
            <p
              className={[
                'text-sm leading-relaxed mt-0.5',
                v.body,
              ].join(' ')}
            >
              {message}
            </p>
          )}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={[
                'mt-2 text-sm font-medium transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded',
                v.action,
              ].join(' ')}
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Close button */}
        {closable && (
          <button
            type="button"
            aria-label="Close notification"
            onClick={handleDismiss}
            className={[
              'shrink-0 p-1 rounded-lg',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              v.close,
            ].join(' ')}
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  },
);

Notification.displayName = 'Notification';
