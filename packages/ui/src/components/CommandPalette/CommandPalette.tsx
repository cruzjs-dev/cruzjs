import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

export type CommandPaletteItem = {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string[];
  group?: string;
  onSelect: () => void;
  disabled?: boolean;
};

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandPaletteItem[];
  placeholder?: string;
  emptyMessage?: string;
  footer?: React.ReactNode;
};

type GroupedItems = {
  group: string | null;
  items: CommandPaletteItem[];
};

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) {
      qi++;
    }
  }
  return qi === q.length;
}

export const CommandPalette = forwardRef<HTMLDivElement, CommandPaletteProps>(
  function CommandPalette(
    {
      open,
      onOpenChange,
      items,
      placeholder = 'Type a command...',
      emptyMessage = 'No results found',
      footer,
    },
    ref,
  ) {
    const isMobile = useIsMobile();
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const optionRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const previousFocusRef = useRef<HTMLElement | null>(null);

    // Filter items with fuzzy matching
    const filteredItems = useMemo(() => {
      const q = query.trim();
      if (!q) return items;
      return items.filter(
        (item) => fuzzyMatch(item.label, q) || (item.description && fuzzyMatch(item.description, q)),
      );
    }, [items, query]);

    // Group filtered items
    const groupedItems = useMemo<GroupedItems[]>(() => {
      const groups: GroupedItems[] = [];
      const seen = new Set<string | null>();

      for (const item of filteredItems) {
        const g = item.group ?? null;
        if (!seen.has(g)) {
          seen.add(g);
          groups.push({ group: g, items: [] });
        }
        groups.find((gr) => gr.group === g)!.items.push(item);
      }
      return groups;
    }, [filteredItems]);

    // Build flat list for keyboard navigation
    const flatItems = useMemo(() => {
      return groupedItems.flatMap((g) => g.items);
    }, [groupedItems]);

    // Reset state when opening/closing
    useEffect(() => {
      if (open) {
        previousFocusRef.current = document.activeElement as HTMLElement;
        setQuery('');
        setActiveIndex(0);

        // Focus input on next frame
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });

        // Set siblings as inert for focus trap
        const root = panelRef.current?.closest('[data-command-palette-root]');
        const siblings = Array.from(document.body.children).filter((c) => c !== root);
        siblings.forEach((s) => s.setAttribute('inert', ''));

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        return () => {
          siblings.forEach((s) => s.removeAttribute('inert'));
          document.body.style.overflow = '';
          previousFocusRef.current?.focus();
        };
      }
    }, [open]);

    // Reset active index when filtered items change
    useEffect(() => {
      setActiveIndex(0);
    }, [query]);

    // Scroll active item into view
    useEffect(() => {
      if (activeIndex < 0) return;
      const el = optionRefs.current.get(activeIndex);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest' });
      }
    }, [activeIndex]);

    // Global keyboard shortcut to open
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          onOpenChange(!open);
        }
      };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }, [open, onOpenChange]);

    const handleClose = useCallback(() => {
      onOpenChange(false);
    }, [onOpenChange]);

    const handleSelect = useCallback(
      (item: CommandPaletteItem) => {
        if (item.disabled) return;
        handleClose();
        item.onSelect();
      },
      [handleClose],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        switch (e.key) {
          case 'ArrowDown': {
            e.preventDefault();
            setActiveIndex((prev) => {
              if (flatItems.length === 0) return 0;
              let next = (prev + 1) % flatItems.length;
              // Skip disabled items, with guard against infinite loop
              let attempts = 0;
              while (flatItems[next]?.disabled && attempts < flatItems.length) {
                next = (next + 1) % flatItems.length;
                attempts++;
              }
              return next;
            });
            break;
          }
          case 'ArrowUp': {
            e.preventDefault();
            setActiveIndex((prev) => {
              if (flatItems.length === 0) return 0;
              let next = (prev - 1 + flatItems.length) % flatItems.length;
              let attempts = 0;
              while (flatItems[next]?.disabled && attempts < flatItems.length) {
                next = (next - 1 + flatItems.length) % flatItems.length;
                attempts++;
              }
              return next;
            });
            break;
          }
          case 'Enter': {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < flatItems.length) {
              handleSelect(flatItems[activeIndex]);
            }
            break;
          }
          case 'Escape': {
            e.preventDefault();
            handleClose();
            break;
          }
        }
      },
      [flatItems, activeIndex, handleSelect, handleClose],
    );

    const handleBackdropClick = useCallback(
      (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      },
      [handleClose],
    );

    if (!open) return null;

    // Build the option list content
    const renderList = () => {
      let globalIndex = 0;

      if (flatItems.length === 0) {
        return (
          <div
            className="flex items-center justify-center px-4 py-8 text-sm text-text-tertiary"
            role="status"
          >
            {emptyMessage}
          </div>
        );
      }

      return (
        <div
          ref={listRef}
          role="listbox"
          aria-label="Commands"
          className={[
            'overflow-y-auto overscroll-contain',
            isMobile ? 'max-h-[60vh]' : 'max-h-[320px]',
          ].join(' ')}
        >
          {groupedItems.map(({ group, items: groupItems }) => (
            <div key={group ?? '__ungrouped__'} role="group" aria-label={group ?? undefined}>
              {group && (
                <div
                  className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted select-none"
                  role="presentation"
                >
                  {group}
                </div>
              )}
              {groupItems.map((item) => {
                const idx = globalIndex++;
                const isActive = idx === activeIndex;

                return (
                  <div
                    key={item.id}
                    ref={(node) => {
                      if (node) {
                        optionRefs.current.set(idx, node);
                      } else {
                        optionRefs.current.delete(idx);
                      }
                    }}
                    role="option"
                    aria-selected={isActive}
                    aria-disabled={item.disabled || undefined}
                    data-command-index={idx}
                    className={[
                      'flex items-center gap-3 px-4 cursor-default select-none transition-colors duration-100',
                      isMobile ? 'min-h-[44px] py-3' : 'py-2',
                      item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                      !item.disabled && !isActive ? 'hover:bg-surface-lighter' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={
                      isActive && !item.disabled
                        ? {
                            backgroundColor:
                              'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))',
                          }
                        : undefined
                    }
                    onMouseEnter={() => {
                      if (!item.disabled) setActiveIndex(idx);
                    }}
                    onClick={() => handleSelect(item)}
                  >
                    {item.icon && (
                      <span className="shrink-0 w-5 h-5 text-text-tertiary flex items-center justify-center">
                        {item.icon}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text truncate">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-text-tertiary truncate mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                    {item.shortcut && item.shortcut.length > 0 && (
                      <kbd className="shrink-0 inline-flex items-center gap-0.5 ml-auto">
                        {item.shortcut.map((key, ki) => (
                          <span
                            key={ki}
                            className="inline-flex items-center justify-center min-w-[20px] px-1 py-0.5 text-[10px] font-mono font-medium leading-none text-text-secondary bg-surface-lighter ring-1 ring-surface-border/50 shadow-[0_1px_0_1px_rgba(0,0,0,0.05)] rounded-md"
                          >
                            {key}
                          </span>
                        ))}
                      </kbd>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      );
    };

    if (isMobile) {
      return (
        <div
          data-command-palette-root=""
          className="fixed inset-0 z-50 flex flex-col"
          ref={(node) => {
            (panelRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          {/* Full-screen overlay background */}
          <div
            className="absolute inset-0 bg-surface"
            style={{ animation: 'cmdpal-backdrop-in 150ms ease-out both' }}
          />

          {/* Content */}
          <div
            className="relative flex flex-col h-full"
            style={{ animation: 'cmdpal-content-in 200ms ease-out both' }}
          >
            {/* Search header */}
            <div className="flex items-center gap-3 border-b border-surface-border px-4 py-3">
              <SearchIcon className="w-5 h-5 text-text-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-muted"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Search commands"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="shrink-0 rounded-lg p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-surface-lighter active:bg-surface-border transition-colors duration-150"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">{renderList()}</div>

            {/* Footer */}
            {footer && (
              <div className="border-t border-surface-border px-4 py-3">{footer}</div>
            )}
          </div>
          <style>{commandPaletteKeyframes}</style>
        </div>
      );
    }

    // Desktop: centered modal with backdrop
    return (
      <div
        data-command-palette-root=""
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
        onClick={handleBackdropClick}
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
          style={{ animation: 'cmdpal-backdrop-in 150ms ease-out both' }}
          aria-hidden="true"
        />

        {/* Panel */}
        <div
          ref={(node) => {
            (panelRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className={[
            'relative z-10 w-full max-w-lg rounded-2xl bg-surface',
            'shadow-[0_8px_40px_-8px_rgba(0,0,0,0.2),0_0_0_1px_rgba(0,0,0,0.05)]',
            'flex flex-col overflow-hidden',
          ].join(' ')}
          style={{
            animation: 'cmdpal-panel-in 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-surface-border px-4 py-3">
            <SearchIcon className="w-4 h-4 text-text-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Search commands"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          {/* Results */}
          {renderList()}

          {/* Footer */}
          {footer && (
            <div className="border-t border-surface-border px-4 py-2.5 text-xs text-text-muted">
              {footer}
            </div>
          )}
        </div>
        <style>{commandPaletteKeyframes}</style>
      </div>
    );
  },
);

CommandPalette.displayName = 'CommandPalette';

// ── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

// ── Keyframes ────────────────────────────────────────────────────────────────

const commandPaletteKeyframes = `
  @keyframes cmdpal-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes cmdpal-panel-in {
    from { opacity: 0; transform: scale(0.95) translateY(-8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes cmdpal-content-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    @keyframes cmdpal-backdrop-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes cmdpal-panel-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes cmdpal-content-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  }
`;
