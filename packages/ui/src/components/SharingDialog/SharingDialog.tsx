import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { Avatar } from '../Avatar';
import { useIsMobile } from '../../hooks/useIsMobile';

export type PermissionLevel = {
  value: string;
  label: string;
};

export type SharedUser = {
  id: string;
  name: string;
  email: string;
  avatarSrc?: string;
  permission: string;
};

export type SharingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  shareLink?: string;
  onCopyLink?: () => void;
  permissions: PermissionLevel[];
  defaultPermission?: string;
  sharedWith?: SharedUser[];
  onInvite?: (email: string, permission: string) => void;
  onPermissionChange?: (userId: string, permission: string) => void;
  onRemove?: (userId: string) => void;
  children?: React.ReactNode;
};

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const RemoveIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const LinkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101"
    />
  </svg>
);

export const SharingDialog = forwardRef<HTMLDialogElement, SharingDialogProps>(
  function SharingDialog(
    {
      open,
      onOpenChange,
      title = 'Share',
      shareLink,
      onCopyLink,
      permissions,
      defaultPermission,
      sharedWith = [],
      onInvite,
      onPermissionChange,
      onRemove,
      children,
    },
    ref,
  ) {
    const isMobile = useIsMobile();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [email, setEmail] = useState('');
    const [selectedPermission, setSelectedPermission] = useState(
      defaultPermission ?? permissions[0]?.value ?? '',
    );
    const [copied, setCopied] = useState(false);
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync the forwarded ref
    const setRefs = useCallback(
      (node: HTMLDialogElement | null) => {
        (dialogRef as React.MutableRefObject<HTMLDialogElement | null>).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDialogElement | null>).current = node;
      },
      [ref],
    );

    // Open/close the native dialog
    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      if (open && !dialog.open) {
        dialog.showModal();
      } else if (!open && dialog.open) {
        dialog.close();
      }
    }, [open]);

    // Handle native close event (Escape key, backdrop click)
    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      const handleClose = () => {
        onOpenChange(false);
      };

      dialog.addEventListener('close', handleClose);
      return () => dialog.removeEventListener('close', handleClose);
    }, [onOpenChange]);

    // Handle backdrop click
    const handleBackdropClick = useCallback(
      (e: React.MouseEvent<HTMLDialogElement>) => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const rect = dialog.getBoundingClientRect();
        const clickedOutside =
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom;
        if (clickedOutside) {
          onOpenChange(false);
        }
      },
      [onOpenChange],
    );

    // Cleanup copy timer
    useEffect(() => {
      return () => {
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      };
    }, []);

    const handleCopyLink = useCallback(async () => {
      if (!shareLink) return;
      try {
        await navigator.clipboard.writeText(shareLink);
        setCopied(true);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => {
          setCopied(false);
          copyTimerRef.current = null;
        }, 2000);
      } catch {
        // Clipboard API not available
      }
      onCopyLink?.();
    }, [shareLink, onCopyLink]);

    const handleInvite = useCallback(() => {
      const trimmed = email.trim();
      if (!trimmed) return;
      onInvite?.(trimmed, selectedPermission);
      setEmail('');
    }, [email, selectedPermission, onInvite]);

    const handleInviteKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleInvite();
        }
      },
      [handleInvite],
    );

    const dialogClass = isMobile
      ? [
          'fixed inset-0 m-0 w-full h-full max-w-full max-h-full',
          'bg-surface p-0 border-none',
          'backdrop:bg-black/50 backdrop:backdrop-blur-sm',
        ].join(' ')
      : [
          'max-w-md w-full rounded-2xl bg-surface p-0 border-none',
          'shadow-[0_12px_32px_-4px_rgba(0,0,0,0.12),0_24px_48px_-12px_rgba(0,0,0,0.08)]',
          'backdrop:bg-black/50 backdrop:backdrop-blur-sm',
        ].join(' ');

    return (
      <dialog ref={setRefs} className={dialogClass} onClick={handleBackdropClick}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-text-strong">{title}</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className={[
              'shrink-0 rounded-xl p-1.5',
              'text-text-tertiary hover:text-text-secondary',
              'hover:bg-surface-lighter active:bg-surface-border',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
            ].join(' ')}
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Invite section */}
          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleInviteKeyDown}
              className="flex-1 bg-surface-lighter rounded-lg px-3 py-2 text-sm text-text outline-none ring-1 ring-surface-border/50 focus:ring-primary/50 transition-shadow"
            />
            <select
              value={selectedPermission}
              onChange={(e) => setSelectedPermission(e.target.value)}
              className="bg-surface-lighter rounded-md px-2 py-1 text-xs text-text-secondary ring-1 ring-surface-border/50 outline-none cursor-pointer"
              aria-label="Permission level"
            >
              {permissions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleInvite}
              className="bg-primary text-surface rounded-lg px-4 py-2 text-sm font-medium hover:brightness-110 transition-all cursor-pointer shrink-0"
            >
              Invite
            </button>
          </div>

          {/* Share link section */}
          {shareLink && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0 bg-surface-lighter rounded-lg px-3 py-2 ring-1 ring-surface-border/50">
                <LinkIcon className="w-4 h-4 text-text-tertiary shrink-0" />
                <span className="text-sm text-text-secondary truncate">{shareLink}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className={[
                  'shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer',
                  copied
                    ? 'bg-success/10 text-success ring-1 ring-success/30'
                    : 'bg-surface-lighter text-text-secondary ring-1 ring-surface-border/50 hover:bg-surface-border',
                ].join(' ')}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}

          {/* Shared users list */}
          {sharedWith.length > 0 && (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider px-3 py-1">
                Shared with
              </p>
              {sharedWith.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 hover:bg-surface-lighter rounded-lg px-3 py-2 transition-colors group"
                >
                  <Avatar src={user.avatarSrc} name={user.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-strong truncate">{user.name}</p>
                    <p className="text-xs text-text-tertiary truncate">{user.email}</p>
                  </div>
                  <select
                    value={user.permission}
                    onChange={(e) => onPermissionChange?.(user.id, e.target.value)}
                    className="bg-surface-lighter rounded-md px-2 py-1 text-xs text-text-secondary ring-1 ring-surface-border/50 outline-none cursor-pointer"
                    aria-label={`Permission for ${user.name}`}
                  >
                    {permissions.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onRemove?.(user.id)}
                    aria-label={`Remove ${user.name}`}
                    className={[
                      'shrink-0 rounded-lg p-1',
                      'text-text-tertiary hover:text-danger',
                      'hover:bg-danger/10',
                      'opacity-0 group-hover:opacity-100 focus:opacity-100',
                      'transition-all duration-150',
                    ].join(' ')}
                  >
                    <RemoveIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Extra content slot */}
          {children}
        </div>
      </dialog>
    );
  },
);

SharingDialog.displayName = 'SharingDialog';
