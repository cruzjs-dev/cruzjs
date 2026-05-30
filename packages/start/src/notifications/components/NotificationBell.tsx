import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { getTRPC } from '@cruzjs/core/trpc/client';

/**
 * NotificationBell
 *
 * Displays a bell icon with an unread notification count badge.
 * On click, shows a dropdown with recent notifications.
 * Polls for unread count every 30 seconds.
 *
 * Designed for placement in the Navbar next to the OrgSwitcher.
 */
export const NotificationBell: React.FC = () => {
  const trpc = getTRPC();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Poll unread count every 30s
  const { data: unreadCount = 0 } = trpc.notification.getUnreadCount.useQuery(
    undefined,
    { refetchInterval: 30_000 }
  );

  // Fetch notifications when popover opens
  const { data: notificationsData, refetch } = trpc.notification.getNotifications.useQuery(
    { limit: 10, unreadOnly: false },
    { enabled: isOpen }
  );

  const markReadMutation = trpc.notification.markRead.useMutation({
    onSuccess: () => refetch(),
  });

  const markAllReadMutation = trpc.notification.markAllRead.useMutation({
    onSuccess: () => refetch(),
  });

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = useCallback(
    (notificationId: string, linkUrl: string | null, isRead: boolean | null) => {
      if (!isRead) {
        markReadMutation.mutate({ notificationIds: [notificationId] });
      }
      if (linkUrl) {
        setIsOpen(false);
        navigate(linkUrl);
      }
    },
    [markReadMutation, navigate]
  );

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const items = notificationsData?.items ?? [];

  // Notification type icon mapping (inline SVGs matching Navbar style)
  const getTypeIcon = (type: string) => {
    const iconClass: Record<string, string> = {
      GATE_REVIEW_REQUESTED: 'text-amber-500',
      GATE_ACTION_TAKEN: 'text-emerald-500',
      PR_STATUS_CHANGED: 'text-primary',
      CI_STATUS_CHANGED: 'text-primary',
      EXECUTION_COMPLETED: 'text-primary',
    };
    const cls = iconClass[type] ?? 'text-text-muted';
    const paths: Record<string, string> = {
      GATE_REVIEW_REQUESTED: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
      GATE_ACTION_TAKEN: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      PR_STATUS_CHANGED: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
      EXECUTION_COMPLETED: 'M13 10V3L4 14h7v7l9-11h-7z',
    };
    const d = paths[type] ?? 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9';
    return (
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" className={cls}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
      </svg>
    );
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Bell trigger button */}
      <button
        type="button"
        className="relative p-1.5 text-text-muted hover:text-text-strong transition-colors rounded-md hover:bg-surface-light"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[360px] bg-surface border border-surface-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
            <span className="text-sm font-semibold text-text-strong">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs text-primary hover:text-primary-dark font-medium transition-colors disabled:opacity-50"
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[400px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-text-muted">No notifications yet</span>
              </div>
            ) : (
              <div className="flex flex-col">
                {items.map((notification: any) => (
                  <div
                    key={notification.id}
                    className="px-4 py-3 cursor-pointer hover:bg-surface-light border-b border-surface-border transition-colors"
                    onClick={() =>
                      handleNotificationClick(
                        notification.id,
                        notification.linkUrl,
                        notification.isRead
                      )
                    }
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm truncate ${
                              notification.isRead
                                ? 'text-text-muted font-normal'
                                : 'text-text-strong font-semibold'
                            }`}
                          >
                            {notification.title}
                          </span>
                          {!notification.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        {notification.body && (
                          <p className="text-xs text-text-muted truncate mt-0.5">
                            {notification.body}
                          </p>
                        )}
                        <p className="text-xs text-text-muted mt-0.5">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
