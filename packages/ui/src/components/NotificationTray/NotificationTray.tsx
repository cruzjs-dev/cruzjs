import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

// ─── Types ──────────────────────────────────────────────────────────────────

export type NotificationTrayItem = {
  id: string;
  title: string;
  message?: string;
  timestamp: string;
  read?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
};

export type NotificationTraySize = 'sm' | 'md' | 'lg';

export type NotificationTrayProps = {
  items: NotificationTrayItem[];
  unreadCount?: number;
  onMarkAllRead?: () => void;
  onItemClick?: (id: string) => void;
  emptyMessage?: string;
  size?: NotificationTraySize;
  className?: string;
};

// ─── Icons ──────────────────────────────────────────────────────────────────

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
  </svg>
);

const DefaultItemIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
  </svg>
);

// ─── Size Config ────────────────────────────────────────────────────────────

const sizeConfig: Record<NotificationTraySize, { button: string; icon: string; panel: string; itemIcon: string }> = {
  sm: {
    button: 'w-8 h-8',
    icon: 'w-4 h-4',
    panel: 'w-80',
    itemIcon: 'w-4 h-4',
  },
  md: {
    button: 'w-10 h-10',
    icon: 'w-5 h-5',
    panel: 'w-96',
    itemIcon: 'w-5 h-5',
  },
  lg: {
    button: 'w-12 h-12',
    icon: 'w-6 h-6',
    panel: 'w-[26rem]',
    itemIcon: 'w-5 h-5',
  },
};

// ─── Constants ──────────────────────────────────────────────────────────────

const SPRING_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

const keyframes = `
  @keyframes notification-tray-panel-in {
    from { opacity: 0; transform: scale(0.95) translateY(-4px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes notification-tray-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes notification-tray-sheet-in {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;

// ─── Component ──────────────────────────────────────────────────────────────

export const NotificationTray = forwardRef<HTMLDivElement, NotificationTrayProps>(
  function NotificationTray(
    {
      items,
      unreadCount,
      onMarkAllRead,
      onItemClick,
      emptyMessage = 'No notifications',
      size = 'md',
      className,
    },
    ref,
  ) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelPosition, setPanelPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

    const resolvedUnreadCount = unreadCount ?? items.filter((item) => !item.read).length;
    const config = sizeConfig[size];

    // ─── Position calculation (desktop) ─────────────────────────────────

    const updatePosition = useCallback(() => {
      const triggerEl = triggerRef.current;
      if (!triggerEl) {
        return;
      }
      const rect = triggerEl.getBoundingClientRect();
      setPanelPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }, []);

    useEffect(() => {
      if (!open || isMobile) {
        return;
      }
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }, [open, isMobile, updatePosition]);

    // ─── Click outside ──────────────────────────────────────────────────

    useEffect(() => {
      if (!open) {
        return;
      }

      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (
          panelRef.current?.contains(target) ||
          triggerRef.current?.contains(target)
        ) {
          return;
        }
        setOpen(false);
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [open]);

    // ─── Escape key ─────────────────────────────────────────────────────

    useEffect(() => {
      if (!open) {
        return;
      }

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setOpen(false);
          triggerRef.current?.focus();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }, [open]);

    // ─── Handlers ───────────────────────────────────────────────────────

    const handleToggle = useCallback(() => {
      setOpen((prev) => !prev);
    }, []);

    const handleItemClick = useCallback(
      (item: NotificationTrayItem) => {
        item.onClick?.();
        onItemClick?.(item.id);
      },
      [onItemClick],
    );

    const handleMarkAllRead = useCallback(() => {
      onMarkAllRead?.();
    }, [onMarkAllRead]);

    // ─── Panel content ──────────────────────────────────────────────────

    const panelContent = (
      <>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-text-strong">Notifications</h2>
          {onMarkAllRead && resolvedUnreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className={[
                'inline-flex items-center gap-1 text-xs font-medium text-primary',
                'transition-colors duration-150 hover:text-primary/80',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded',
              ].join(' ')}
            >
              <CheckIcon className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-10 px-4">
            <p className="text-sm text-text-tertiary">{emptyMessage}</p>
          </div>
        ) : (
          <div
            className="overflow-y-auto"
            style={{ maxHeight: isMobile ? '60vh' : '400px' }}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                className={[
                  'w-full text-left flex items-start gap-3 px-4 py-3',
                  'transition-colors duration-150',
                  'hover:bg-surface-lighter/60',
                  'focus-visible:outline-none focus-visible:bg-surface-lighter/60',
                  'border-b border-surface-border/50 last:border-b-0',
                  !item.read && 'bg-primary/[0.04]',
                ].filter(Boolean).join(' ')}
                data-testid={`notification-item-${item.id}`}
                data-unread={!item.read ? 'true' : undefined}
              >
                {/* Icon */}
                <span className={[
                  'shrink-0 mt-0.5 inline-flex items-center justify-center rounded-lg p-1.5',
                  !item.read
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface-lighter text-text-tertiary',
                ].join(' ')}>
                  {item.icon ?? <DefaultItemIcon className={config.itemIcon} />}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={[
                    'text-sm leading-snug',
                    !item.read ? 'font-semibold text-text-strong' : 'font-medium text-text-secondary',
                  ].join(' ')}>
                    {item.title}
                  </p>
                  {item.message && (
                    <p className="text-xs text-text-tertiary leading-relaxed mt-0.5 line-clamp-2">
                      {item.message}
                    </p>
                  )}
                  <p className="text-xs text-text-tertiary mt-1">
                    {item.timestamp}
                  </p>
                </div>

                {/* Unread dot */}
                {!item.read && (
                  <span className="shrink-0 mt-2 w-2 h-2 rounded-full bg-primary" aria-label="Unread" />
                )}
              </button>
            ))}
          </div>
        )}
      </>
    );

    // ─── Render ─────────────────────────────────────────────────────────

    if (isMobile) {
      return (
        <div ref={ref} className={['relative inline-block', className].filter(Boolean).join(' ')}>
          {/* Trigger */}
          <button
            ref={triggerRef}
            type="button"
            onClick={handleToggle}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label="Notifications"
            className={[
              'relative inline-flex items-center justify-center rounded-xl',
              'text-text-secondary hover:text-text hover:bg-surface-lighter',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              config.button,
            ].join(' ')}
          >
            <BellIcon className={config.icon} />
            {resolvedUnreadCount > 0 && (
              <span
                className={[
                  'absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1',
                  'inline-flex items-center justify-center',
                  'text-[0.625rem] font-bold leading-none text-white bg-danger rounded-full',
                  'ring-2 ring-surface',
                ].join(' ')}
                data-testid="unread-badge"
              >
                {resolvedUnreadCount > 99 ? '99+' : resolvedUnreadCount}
              </span>
            )}
          </button>

          {/* Bottom sheet */}
          {open && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/30"
                onClick={() => setOpen(false)}
                aria-hidden="true"
                style={{ animation: 'notification-tray-backdrop-in 150ms ease-out both' }}
              />
              <div
                ref={panelRef}
                role="dialog"
                aria-label="Notifications panel"
                className={[
                  'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-surface',
                  'shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.2)]',
                ].join(' ')}
                style={{
                  animation: 'notification-tray-sheet-in 250ms cubic-bezier(0.16, 1, 0.3, 1) both',
                  paddingBottom: 'env(safe-area-inset-bottom, 20px)',
                }}
              >
                <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-surface-border" aria-hidden="true" />
                {panelContent}
              </div>
            </>
          )}

          <style>{keyframes}</style>
        </div>
      );
    }

    return (
      <div ref={ref} className={['relative inline-block', className].filter(Boolean).join(' ')}>
        {/* Trigger */}
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Notifications"
          className={[
            'relative inline-flex items-center justify-center rounded-xl',
            'text-text-secondary hover:text-text hover:bg-surface-lighter',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
            config.button,
          ].join(' ')}
        >
          <BellIcon className={config.icon} />
          {resolvedUnreadCount > 0 && (
            <span
              className={[
                'absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1',
                'inline-flex items-center justify-center',
                'text-[0.625rem] font-bold leading-none text-white bg-danger rounded-full',
                'ring-2 ring-surface',
              ].join(' ')}
              data-testid="unread-badge"
            >
              {resolvedUnreadCount > 99 ? '99+' : resolvedUnreadCount}
            </span>
          )}
        </button>

        {/* Floating dropdown */}
        {open && (
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notifications panel"
            className={[
              'fixed z-50 rounded-2xl bg-surface overflow-hidden',
              'shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)]',
              'ring-1 ring-surface-border/50',
              config.panel,
            ].join(' ')}
            style={{
              top: panelPosition.top,
              right: panelPosition.right,
              animation: `notification-tray-panel-in 200ms ${SPRING_EASING} both`,
            }}
          >
            {panelContent}
          </div>
        )}

        <style>{keyframes}</style>
      </div>
    );
  },
);

NotificationTray.displayName = 'NotificationTray';
