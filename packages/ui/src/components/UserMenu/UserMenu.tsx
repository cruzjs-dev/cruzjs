import React, { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Avatar } from '../Avatar';
import { useIsMobile } from '../../hooks/useIsMobile';

export type UserMenuItem = {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
};

export type UserMenuGroup = {
  label?: string;
  items: UserMenuItem[];
};

export type UserMenuProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> & {
  name: string;
  email?: string;
  avatarSrc?: string;
  avatarFallback?: string;
  groups: UserMenuGroup[];
  footer?: React.ReactNode;
  renderLink?: (props: {
    href: string;
    children: React.ReactNode;
    className: string;
    onClick: () => void;
  }) => React.ReactNode;
  align?: 'start' | 'end';
  size?: 'sm' | 'md';
};

const triggerSizeMap: Record<'sm' | 'md', 'sm' | 'md'> = {
  sm: 'sm',
  md: 'md',
};

export const UserMenu = forwardRef<HTMLDivElement, UserMenuProps>(function UserMenu(
  {
    name,
    email,
    avatarSrc,
    avatarFallback,
    groups,
    footer,
    renderLink,
    align = 'end',
    size = 'md',
    className,
    ...rest
  },
  ref,
) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const menuId = useId();

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  // Position calculation for desktop
  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const panelEl = panelRef.current;
    if (!triggerEl || !panelEl) {
      return;
    }

    const triggerRect = triggerEl.getBoundingClientRect();
    const panelRect = panelEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const top = Math.max(8, Math.min(triggerRect.bottom + 4, vh - panelRect.height - 8));
    let left: number;
    if (align === 'end') {
      left = triggerRect.right - panelRect.width;
    } else {
      left = triggerRect.left;
    }
    left = Math.max(8, Math.min(left, vw - panelRect.width - 8));

    setPosition({ top, left });
  }, [align]);

  // Reposition on scroll/resize when open
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

  // Click outside & Escape handlers
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
      close();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, close]);

  const handleToggle = () => setOpen((prev) => !prev);

  const handleItemClick = (item: UserMenuItem) => {
    item.onClick?.();
    close();
    triggerRef.current?.focus();
  };

  const transformOrigin = align === 'end' ? 'top right' : 'top left';

  const itemBaseClass =
    'flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg mx-1 cursor-pointer transition-colors duration-150 select-none';
  const itemNormalClass = 'text-text-secondary hover:bg-surface-lighter hover:text-text';
  const itemDestructiveClass = 'text-danger hover:bg-danger-subtle hover:text-danger-text';

  const renderMenuItem = (item: UserMenuItem, index: number) => {
    const isDestructive = item.destructive === true;
    const itemClass = [
      itemBaseClass,
      isDestructive ? itemDestructiveClass : itemNormalClass,
    ].join(' ');

    const content = (
      <>
        {item.icon && (
          <span className="shrink-0 w-4 h-4">{item.icon}</span>
        )}
        <span className="truncate">{item.label}</span>
      </>
    );

    if (item.href && renderLink) {
      return (
        <React.Fragment key={`${item.label}-${index}`}>
          {renderLink({
            href: item.href,
            className: itemClass,
            onClick: () => {
              close();
              triggerRef.current?.focus();
            },
            children: content,
          })}
        </React.Fragment>
      );
    }

    if (item.href) {
      return (
        <a
          key={`${item.label}-${index}`}
          href={item.href}
          role="menuitem"
          className={itemClass}
          onClick={() => {
            close();
            triggerRef.current?.focus();
          }}
        >
          {content}
        </a>
      );
    }

    return (
      <div
        key={`${item.label}-${index}`}
        role="menuitem"
        tabIndex={-1}
        className={itemClass}
        onClick={() => handleItemClick(item)}
      >
        {content}
      </div>
    );
  };

  const renderContent = () => {
    return (
      <>
        {/* User info section */}
        <div className="px-3 py-3 flex items-center gap-3">
          <Avatar
            src={avatarSrc}
            name={avatarFallback ? undefined : name}
            size="md"
            {...(avatarFallback ? { name: avatarFallback } : {})}
          />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm text-text truncate">{name}</div>
            {email && (
              <div className="text-xs text-text-tertiary truncate">{email}</div>
            )}
          </div>
        </div>

        {/* Divider after user info */}
        <div className="border-t border-surface-border" role="separator" />

        {/* Groups */}
        {groups.map((group, groupIdx) => (
          <div key={group.label ?? groupIdx}>
            {groupIdx > 0 && (
              <div className="border-t border-surface-border" role="separator" />
            )}
            {group.label && (
              <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-text-muted uppercase tracking-wider select-none">
                {group.label}
              </div>
            )}
            <div className="py-1">
              {group.items.map((item, itemIdx) => renderMenuItem(item, itemIdx))}
            </div>
          </div>
        ))}

        {/* Footer */}
        {footer && (
          <>
            <div className="border-t border-surface-border" role="separator" />
            <div className="px-3 py-2">{footer}</div>
          </>
        )}
      </>
    );
  };

  // Mobile: Bottom sheet
  if (isMobile) {
    return (
      <div ref={ref} className={['inline-block', className].filter(Boolean).join(' ')} {...rest}>
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          className="rounded-full ring-2 ring-transparent hover:ring-primary/30 focus-visible:ring-primary/30 transition-all duration-150 outline-none"
        >
          <Avatar
            src={avatarSrc}
            name={avatarFallback ?? name}
            size={triggerSizeMap[size]}
          />
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={close}
              aria-hidden="true"
              style={{ animation: 'usermenu-backdrop-in 150ms ease-out both' }}
            />
            <div
              ref={panelRef}
              role="menu"
              id={menuId}
              aria-label="User menu"
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-surface shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.2)] max-h-[80vh] overflow-y-auto"
              style={{
                animation: 'usermenu-sheet-in 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
                paddingBottom: 'env(safe-area-inset-bottom, 20px)',
              }}
            >
              <div className="mx-auto mt-3 mb-2 h-1 w-10 rounded-full bg-surface-border" aria-hidden="true" />
              {renderContent()}
            </div>
          </>
        )}
        <style>{userMenuKeyframes}</style>
      </div>
    );
  }

  // Desktop: Floating dropdown
  return (
    <div ref={ref} className={['inline-block', className].filter(Boolean).join(' ')} {...rest}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="rounded-full ring-2 ring-transparent hover:ring-primary/30 focus-visible:ring-primary/30 transition-all duration-150 outline-none"
      >
        <Avatar
          src={avatarSrc}
          name={avatarFallback ?? name}
          size={triggerSizeMap[size]}
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          id={menuId}
          aria-label="User menu"
          className="fixed z-50 w-64 rounded-xl bg-surface ring-1 ring-surface-border/50 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08),0_8px_24px_-4px_rgba(0,0,0,0.06)] overflow-hidden"
          style={{
            top: position.top,
            left: position.left,
            transformOrigin,
            animation: 'usermenu-panel-in 150ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
        >
          {renderContent()}
        </div>
      )}
      <style>{userMenuKeyframes}</style>
    </div>
  );
});

UserMenu.displayName = 'UserMenu';

const userMenuKeyframes = `
  @keyframes usermenu-panel-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes usermenu-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes usermenu-sheet-in {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;
