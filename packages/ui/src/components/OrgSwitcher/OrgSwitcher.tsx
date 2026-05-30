import React, { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Avatar } from '../Avatar';
import { useIsMobile } from '../../hooks/useIsMobile';

export type OrgSwitcherItem = {
  id: string;
  name: string;
  avatarSrc?: string;
  description?: string;
};

export type OrgSwitcherProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  items: OrgSwitcherItem[];
  activeId: string;
  onChange: (id: string) => void;
  onCreateNew?: () => void;
  createLabel?: string;
  searchable?: boolean;
  renderLink?: (props: { id: string; children: React.ReactNode; className: string }) => React.ReactNode;
  size?: 'sm' | 'md';
  align?: 'start' | 'end';
};

const ChevronIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 6l4 4 4-4" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
  </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5L14 14" />
  </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 3v10M3 8h10" />
  </svg>
);

const avatarSizeMap: Record<'sm' | 'md', 'xs' | 'sm'> = {
  sm: 'xs',
  md: 'sm',
};

export const OrgSwitcher = forwardRef<HTMLDivElement, OrgSwitcherProps>(function OrgSwitcher(
  {
    items,
    activeId,
    onChange,
    onCreateNew,
    createLabel = 'Create new',
    searchable = false,
    renderLink,
    size = 'md',
    align = 'start',
    className,
    ...rest
  },
  ref,
) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const menuId = useId();

  const activeItem = items.find((item) => item.id === activeId);

  const filteredItems = search
    ? items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  const close = useCallback(() => {
    setOpen(false);
    setSearch('');
    setFocusedIndex(-1);
  }, []);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setFocusedIndex(-1);
  }, []);

  const handleToggle = () => {
    if (open) {
      close();
    } else {
      handleOpen();
    }
  };

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchable) {
      // Use requestAnimationFrame to wait for the panel to render
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [open, searchable]);

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

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return;

      const totalItems = filteredItems.length + (onCreateNew ? 1 : 0);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev < totalItems - 1 ? prev + 1 : 0;
          itemRefs.current[next]?.focus();
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : totalItems - 1;
          itemRefs.current[next]?.focus();
          return next;
        });
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault();
        if (focusedIndex < filteredItems.length) {
          const item = filteredItems[focusedIndex];
          onChange(item.id);
          close();
          triggerRef.current?.focus();
        } else if (onCreateNew) {
          onCreateNew();
          close();
          triggerRef.current?.focus();
        }
      }
    },
    [open, filteredItems, focusedIndex, onChange, onCreateNew, close],
  );

  const handleItemClick = (id: string) => {
    onChange(id);
    close();
    triggerRef.current?.focus();
  };

  const handleCreateClick = () => {
    onCreateNew?.();
    close();
    triggerRef.current?.focus();
  };

  const transformOrigin = align === 'end' ? 'top right' : 'top left';

  const triggerSizeClasses = size === 'sm'
    ? 'px-2 py-1 text-sm gap-2'
    : 'px-2.5 py-1.5 text-sm gap-2.5';

  const renderItemContent = (item: OrgSwitcherItem, isActive: boolean) => (
    <>
      <Avatar
        src={item.avatarSrc}
        name={item.name}
        size="xs"
        square
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-text truncate">{item.name}</div>
        {item.description && (
          <div className="text-xs text-text-tertiary truncate">{item.description}</div>
        )}
      </div>
      {isActive && (
        <CheckIcon className="w-4 h-4 shrink-0 text-primary" />
      )}
    </>
  );

  const renderItems = () =>
    filteredItems.map((item, index) => {
      const isActive = item.id === activeId;
      const isFocused = focusedIndex === index;
      const itemClass = [
        'flex items-center gap-2.5 px-3 py-2 rounded-lg mx-1 cursor-pointer transition-colors duration-150 select-none outline-none',
        isActive
          ? 'bg-primary-subtle ring-1 ring-primary/20'
          : isFocused
            ? 'bg-surface-lighter'
            : 'hover:bg-surface-lighter',
      ].join(' ');

      if (renderLink) {
        return (
          <React.Fragment key={item.id}>
            {renderLink({
              id: item.id,
              className: itemClass,
              children: renderItemContent(item, isActive),
            })}
          </React.Fragment>
        );
      }

      return (
        <div
          key={item.id}
          ref={(el) => { itemRefs.current[index] = el; }}
          role="option"
          aria-selected={isActive}
          tabIndex={-1}
          className={itemClass}
          onClick={() => handleItemClick(item.id)}
          onMouseEnter={() => setFocusedIndex(index)}
        >
          {renderItemContent(item, isActive)}
        </div>
      );
    });

  const renderContent = () => (
    <>
      {/* Search */}
      {searchable && (
        <div className="px-2 pt-2 pb-1">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setFocusedIndex(-1);
              }}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-surface-lighter rounded-lg border-none outline-none text-text placeholder:text-text-muted focus:ring-1 focus:ring-primary/30"
              aria-label="Search organizations"
            />
          </div>
        </div>
      )}

      {/* Items */}
      <div
        role="listbox"
        aria-label="Organizations"
        className="py-1 overflow-y-auto"
        style={{ maxHeight: searchable ? 'calc(var(--max-h, 20rem) - 4rem)' : undefined }}
      >
        {renderItems()}
        {filteredItems.length === 0 && (
          <div className="px-3 py-4 text-sm text-text-muted text-center select-none">
            No results found
          </div>
        )}
      </div>

      {/* Create CTA */}
      {onCreateNew && (
        <>
          <div className="border-t border-surface-border" role="separator" />
          <div className="py-1">
            <div
              ref={(el) => { itemRefs.current[filteredItems.length] = el; }}
              role="button"
              tabIndex={-1}
              className={[
                'flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors duration-150 select-none outline-none',
                'text-primary font-medium text-sm hover:bg-surface-lighter',
                focusedIndex === filteredItems.length ? 'bg-surface-lighter' : '',
              ].join(' ')}
              onClick={handleCreateClick}
              onMouseEnter={() => setFocusedIndex(filteredItems.length)}
            >
              <PlusIcon className="w-4 h-4 shrink-0" />
              <span>{createLabel}</span>
            </div>
          </div>
        </>
      )}
    </>
  );

  const triggerContent = (
    <>
      <Avatar
        src={activeItem?.avatarSrc}
        name={activeItem?.name ?? ''}
        size={avatarSizeMap[size]}
        square
      />
      <span className="truncate font-medium text-text">{activeItem?.name ?? ''}</span>
      <ChevronIcon className={[
        'w-4 h-4 shrink-0 text-text-muted transition-transform duration-150',
        open ? 'rotate-180' : '',
      ].join(' ')} />
    </>
  );

  // Mobile: Bottom sheet
  if (isMobile) {
    return (
      <div ref={ref} className={['inline-block', className].filter(Boolean).join(' ')} {...rest}>
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          className={[
            'inline-flex items-center bg-surface hover:bg-surface-lighter rounded-lg ring-1 ring-surface-border/50 transition-colors duration-150 outline-none focus-visible:ring-primary/30',
            triggerSizeClasses,
          ].join(' ')}
        >
          {triggerContent}
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={close}
              aria-hidden="true"
              style={{ animation: 'orgswitcher-backdrop-in 150ms ease-out both' }}
            />
            <div
              ref={panelRef}
              id={menuId}
              aria-label="Switch organization"
              onKeyDown={handleKeyDown}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-surface shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.2)] max-h-[80vh] overflow-y-auto"
              style={{
                animation: 'orgswitcher-sheet-in 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
                paddingBottom: 'env(safe-area-inset-bottom, 20px)',
              }}
            >
              <div className="mx-auto mt-3 mb-2 h-1 w-10 rounded-full bg-surface-border" aria-hidden="true" />
              {renderContent()}
            </div>
          </>
        )}
        <style>{orgSwitcherKeyframes}</style>
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
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={[
          'inline-flex items-center bg-surface hover:bg-surface-lighter rounded-lg ring-1 ring-surface-border/50 transition-colors duration-150 outline-none focus-visible:ring-primary/30',
          triggerSizeClasses,
        ].join(' ')}
      >
        {triggerContent}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={menuId}
          aria-label="Switch organization"
          onKeyDown={handleKeyDown}
          className="fixed z-50 w-72 bg-surface rounded-xl ring-1 ring-surface-border/50 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08),0_8px_24px_-4px_rgba(0,0,0,0.06)] max-h-80 overflow-hidden"
          style={{
            top: position.top,
            left: position.left,
            transformOrigin,
            animation: 'orgswitcher-panel-in 150ms ease-[var(--ease-spring,cubic-bezier(0.34,1.56,0.64,1))] both',
            '--max-h': '20rem',
          } as React.CSSProperties}
        >
          {renderContent()}
        </div>
      )}
      <style>{orgSwitcherKeyframes}</style>
    </div>
  );
});

OrgSwitcher.displayName = 'OrgSwitcher';

const orgSwitcherKeyframes = `
  @keyframes orgswitcher-panel-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes orgswitcher-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes orgswitcher-sheet-in {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;
