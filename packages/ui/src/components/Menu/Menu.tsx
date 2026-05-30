import React, { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

export type MenuItem = {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  shortcut?: string;
};

export type MenuGroup = {
  label?: string;
  items: MenuItem[];
};

export type MenuSize = 'sm' | 'md' | 'lg';
export type MenuAlign = 'start' | 'end';

export type MenuProps = {
  trigger: React.ReactElement;
  items?: MenuItem[];
  groups?: MenuGroup[];
  size?: MenuSize;
  align?: MenuAlign;
  className?: string;
};

const sizeStyles: Record<MenuSize, { item: string; icon: string; shortcut: string; groupLabel: string }> = {
  sm: {
    item: 'px-2.5 py-1.5 text-xs min-h-[32px]',
    icon: 'w-3.5 h-3.5',
    shortcut: 'text-[10px]',
    groupLabel: 'px-2.5 py-1.5 text-[10px]',
  },
  md: {
    item: 'px-3 py-2 text-sm min-h-[36px]',
    icon: 'w-4 h-4',
    shortcut: 'text-xs',
    groupLabel: 'px-3 py-1.5 text-[11px]',
  },
  lg: {
    item: 'px-3.5 py-2.5 text-base min-h-[44px]',
    icon: 'w-5 h-5',
    shortcut: 'text-sm',
    groupLabel: 'px-3.5 py-2 text-xs',
  },
};

const mobileSizeOverride: Record<MenuSize, string> = {
  sm: 'min-h-[44px] text-sm px-4 py-2.5',
  md: 'min-h-[44px] text-base px-4 py-3',
  lg: 'min-h-[44px] text-base px-4 py-3',
};

export const Menu = forwardRef<HTMLDivElement, MenuProps>(function Menu(
  {
    trigger,
    items,
    groups,
    size = 'md',
    align = 'start',
    className,
  },
  ref,
) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const menuId = useId();

  // Flatten all items for keyboard navigation
  const allItems = React.useMemo<MenuItem[]>(() => {
    if (items) return items;
    if (groups) return groups.flatMap((g) => g.items);
    return [];
  }, [items, groups]);

  // Find the next non-disabled index in the given direction
  const findNextIndex = useCallback(
    (current: number, direction: 1 | -1): number => {
      const len = allItems.length;
      if (len === 0) return -1;
      let next = current;
      for (let i = 0; i < len; i++) {
        next = (next + direction + len) % len;
        if (!allItems[next].disabled) return next;
      }
      return -1;
    },
    [allItems],
  );

  // Position calculation for desktop
  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const panelEl = panelRef.current;
    if (!triggerEl || !panelEl) return;

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
    if (!open || isMobile) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, isMobile, updatePosition]);

  // Reset highlighted index when menu opens/closes
  useEffect(() => {
    if (open) {
      setHighlightedIndex(-1);
    }
  }, [open]);

  // Click outside & Escape handlers
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) return;
      setOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleToggle = () => setOpen((prev) => !prev);

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled) return;
    item.onClick?.();
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
        // Highlight the first non-disabled item
        setHighlightedIndex(findNextIndex(-1, 1));
        return;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        setHighlightedIndex((prev) => findNextIndex(prev, 1));
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        setHighlightedIndex((prev) => findNextIndex(prev, -1));
        break;
      }
      case 'Home': {
        e.preventDefault();
        setHighlightedIndex(findNextIndex(-1, 1));
        break;
      }
      case 'End': {
        e.preventDefault();
        setHighlightedIndex(findNextIndex(allItems.length, -1));
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < allItems.length) {
          handleItemClick(allItems[highlightedIndex]);
        }
        break;
      }
      case 'Tab': {
        setOpen(false);
        break;
      }
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex < 0 || !panelRef.current) return;
    const itemEl = panelRef.current.querySelector(`[data-menu-index="${highlightedIndex}"]`);
    if (itemEl && typeof itemEl.scrollIntoView === 'function') {
      itemEl.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const s = sizeStyles[size];

  // Build the trigger element
  const triggerElement = React.cloneElement(trigger, {
    ref: triggerRef,
    onClick: (e: React.MouseEvent) => {
      handleToggle();
      trigger.props.onClick?.(e);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      handleKeyDown(e);
      trigger.props.onKeyDown?.(e);
    },
    'aria-expanded': open,
    'aria-haspopup': 'menu' as const,
    'aria-controls': open ? menuId : undefined,
  });

  // Render a single menu item
  const renderItem = (item: MenuItem, flatIndex: number) => {
    const isHighlighted = highlightedIndex === flatIndex;
    const isMobileMode = isMobile;

    const itemClasses = [
      'flex items-center gap-2 w-full rounded-lg cursor-default select-none transition-colors duration-100',
      isMobileMode ? mobileSizeOverride[size] : s.item,
      item.disabled
        ? 'opacity-40 cursor-not-allowed'
        : item.destructive
          ? isHighlighted
            ? 'bg-danger/10 text-danger'
            : 'text-danger hover:bg-danger/10'
          : isHighlighted
            ? 'bg-primary/10 text-text-strong shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
            : 'text-text hover:bg-surface-lighter',
    ].join(' ');

    return (
      <div
        key={`${item.label}-${flatIndex}`}
        role="menuitem"
        tabIndex={-1}
        aria-disabled={item.disabled || undefined}
        data-menu-index={flatIndex}
        className={itemClasses}
        onMouseEnter={() => {
          if (!item.disabled) setHighlightedIndex(flatIndex);
        }}
        onMouseLeave={() => setHighlightedIndex(-1)}
        onClick={() => handleItemClick(item)}
      >
        {item.icon && (
          <span className={['shrink-0', s.icon, item.destructive ? 'text-danger' : 'text-text-tertiary'].join(' ')}>
            {item.icon}
          </span>
        )}
        <span className="flex-1 truncate">{item.label}</span>
        {item.shortcut && (
          <span className={['ml-auto pl-4 text-text-muted shrink-0', s.shortcut].join(' ')}>
            {item.shortcut}
          </span>
        )}
      </div>
    );
  };

  // Render the menu content (items or groups)
  const renderContent = () => {
    let flatIndex = 0;

    if (items) {
      return items.map((item) => {
        const idx = flatIndex++;
        return renderItem(item, idx);
      });
    }

    if (groups) {
      return groups.map((group, groupIdx) => (
        <div key={group.label ?? groupIdx} role="group" aria-label={group.label}>
          {groupIdx > 0 && (
            <div className="my-1 border-t border-surface-border" role="separator" />
          )}
          {group.label && (
            <div className={['font-semibold uppercase tracking-wider text-text-tertiary select-none', s.groupLabel].join(' ')}>
              {group.label}
            </div>
          )}
          {group.items.map((item) => {
            const idx = flatIndex++;
            return renderItem(item, idx);
          })}
        </div>
      ));
    }

    return null;
  };

  // Mobile: Bottom sheet
  if (isMobile) {
    return (
      <div ref={ref} className="inline-block">
        {triggerElement}
        {open && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setOpen(false)}
              aria-hidden="true"
              style={{ animation: 'menu-backdrop-in 150ms ease-out both' }}
            />
            <div
              ref={panelRef}
              role="menu"
              id={menuId}
              aria-label="Menu"
              className={[
                'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-surface',
                'shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.2)]',
                'max-h-[80vh] overflow-y-auto',
                className,
              ].filter(Boolean).join(' ')}
              style={{
                animation: 'menu-sheet-in 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
                paddingBottom: 'env(safe-area-inset-bottom, 20px)',
              }}
              onKeyDown={handleKeyDown}
            >
              <div className="mx-auto mt-3 mb-2 h-1 w-10 rounded-full bg-surface-border" aria-hidden="true" />
              <div className="px-2 pb-2">
                {renderContent()}
              </div>
            </div>
          </>
        )}
        <style>{menuKeyframes}</style>
      </div>
    );
  }

  // Desktop: Floating panel
  return (
    <div ref={ref} className="inline-block">
      {triggerElement}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          id={menuId}
          aria-label="Menu"
          className={[
            'fixed z-50 rounded-xl bg-surface p-1 min-w-[160px]',
            'shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)]',
            'ring-1 ring-surface-border/50',
            'max-h-[60vh] overflow-y-auto',
            className,
          ].filter(Boolean).join(' ')}
          style={{
            top: position.top,
            left: position.left,
            animation: 'menu-panel-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
          onKeyDown={handleKeyDown}
        >
          {renderContent()}
        </div>
      )}
      <style>{menuKeyframes}</style>
    </div>
  );
});

Menu.displayName = 'Menu';

const menuKeyframes = `
  @keyframes menu-panel-in {
    from { opacity: 0; transform: scale(0.95) translateY(-4px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes menu-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes menu-sheet-in {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;
