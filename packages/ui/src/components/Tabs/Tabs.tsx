import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TabsVariant = 'line' | 'solid' | 'soft';
export type TabsSize = 'sm' | 'md' | 'lg';
export type TabsOrientation = 'horizontal' | 'vertical';

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
  variant: TabsVariant;
  size: TabsSize;
  orientation: TabsOrientation;
  baseId: string;
  listRef: React.RefObject<HTMLDivElement | null>;
}

// ─── Internal Utilities ───────────────────────────────────────────────────────

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs sub-components must be used inside <Tabs>');
  return ctx;
}

function useControllable(
  controlled: string | undefined,
  defaultValue: string,
  onChange?: (v: string) => void,
): [string, (v: string) => void] {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : internal;
  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );
  return [value, setValue];
}

// SSR-safe: useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// ─── Root ────────────────────────────────────────────────────────────────────

export interface TabsProps {
  /** Controlled active tab value */
  value?: string;
  /** Uncontrolled default active tab value */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Visual style of the tab list */
  variant?: TabsVariant;
  size?: TabsSize;
  orientation?: TabsOrientation;
  children: React.ReactNode;
  className?: string;
}

function TabsRoot({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  variant = 'line',
  size = 'md',
  orientation = 'horizontal',
  children,
  className,
}: TabsProps) {
  const [value, setValue] = useControllable(controlledValue, defaultValue, onValueChange);
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <TabsContext.Provider value={{ value, setValue, variant, size, orientation, baseId, listRef }}>
      <div
        data-orientation={orientation}
        className={[
          'flex',
          orientation === 'horizontal' ? 'flex-col' : 'flex-row gap-4',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}
TabsRoot.displayName = 'Tabs';

// ─── List ────────────────────────────────────────────────────────────────────

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

function TabsList({ children, className }: TabsListProps) {
  const { variant, orientation, listRef, value } = useTabsContext();
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const isHorizontal = orientation === 'horizontal';

  const updateIndicator = useCallback(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator || variant === 'soft') return;

    const escapedValue = CSS.escape(value);
    const activeTab = list.querySelector<HTMLButtonElement>(`[data-tab-value="${escapedValue}"]`);
    if (!activeTab) return;

    if (variant === 'line') {
      if (isHorizontal) {
        indicator.style.width = `${activeTab.offsetWidth}px`;
        indicator.style.height = '2px';
        indicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
      } else {
        indicator.style.width = '2px';
        indicator.style.height = `${activeTab.offsetHeight}px`;
        indicator.style.transform = `translateY(${activeTab.offsetTop}px)`;
      }
    } else {
      // solid — pill behind active tab
      indicator.style.width = `${activeTab.offsetWidth}px`;
      indicator.style.height = `${activeTab.offsetHeight}px`;
      indicator.style.transform = `translate(${activeTab.offsetLeft}px, ${activeTab.offsetTop}px)`;
    }
  }, [listRef, value, variant, isHorizontal]);

  // Synchronous position update — runs before browser paints
  useIsomorphicLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  // Reposition when container resizes (e.g. window resize, sidebar collapse).
  // Guard: ResizeObserver not available in SSR or test environments.
  useEffect(() => {
    const list = listRef.current;
    if (!list || variant === 'soft' || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateIndicator);
    observer.observe(list);
    return () => observer.disconnect();
  }, [listRef, variant, updateIndicator]);

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-orientation={orientation}
      className={[
        'relative flex',
        isHorizontal
          ? // Scrollable on mobile — no truncation, native momentum scroll
            'flex-row overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]'
          : 'flex-col',
        variant === 'line' && isHorizontal && 'border-b border-surface-border',
        variant === 'line' && !isHorizontal && 'border-r border-surface-border pr-0',
        variant === 'solid' && 'bg-surface-lighter rounded-xl p-1',
        variant === 'soft' && (isHorizontal ? 'gap-1' : 'flex-col gap-0.5'),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Animated sliding indicator — only for line + solid variants */}
      {variant !== 'soft' && (
        <span
          ref={indicatorRef}
          aria-hidden
          className={[
            'absolute pointer-events-none',
            'transition-[transform,width,height] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
            'motion-reduce:transition-none',
            variant === 'line' && isHorizontal && 'bottom-0 left-0 bg-primary rounded-t-full',
            variant === 'line' && !isHorizontal && 'right-[-1px] top-0 bg-primary rounded-l-full',
            variant === 'solid' &&
              'top-0 left-0 bg-surface rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ willChange: 'transform, width, height' }}
        />
      )}
      {children}
    </div>
  );
}
TabsList.displayName = 'Tabs.List';

// ─── Tab ─────────────────────────────────────────────────────────────────────

export interface TabsTabProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const sizeTabStyles: Record<TabsSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 min-h-[32px]',
  md: 'px-4 py-2 text-sm gap-2 min-h-[38px]',
  lg: 'px-5 py-2.5 text-base gap-2.5 min-h-[44px]',
};

const variantTabActive: Record<TabsVariant, string> = {
  line: 'text-primary font-semibold',
  solid: 'text-text-strong font-semibold relative z-10',
  soft: 'bg-primary-subtle text-primary font-semibold',
};

const variantTabInactive: Record<TabsVariant, string> = {
  line: 'text-text-secondary hover:text-text',
  solid: 'text-text-secondary hover:text-text relative z-10',
  soft: 'text-text-secondary hover:bg-surface-lighter hover:text-text',
};

const TabsTab = React.memo(function TabsTab({
  value: tabValue,
  disabled,
  leftIcon,
  rightIcon,
  children,
  className,
  ...props
}: TabsTabProps) {
  const { value, setValue, variant, size, orientation, baseId, listRef } = useTabsContext();
  const isActive = value === tabValue;
  const tabRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    if (!disabled) setValue(tabValue);
  }, [disabled, setValue, tabValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const list = listRef.current;
      if (!list) return;

      // Only navigate enabled tabs
      const allTabs = Array.from(
        list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'),
      );
      const idx = allTabs.indexOf(e.currentTarget);
      const isHorizontal = orientation === 'horizontal';

      const activate = (tab: HTMLButtonElement | undefined) => {
        if (!tab) return;
        tab.focus();
        setValue(tab.dataset.tabValue!);
      };

      switch (e.key) {
        case isHorizontal ? 'ArrowRight' : 'ArrowDown':
          e.preventDefault();
          activate(allTabs[(idx + 1) % allTabs.length]);
          break;
        case isHorizontal ? 'ArrowLeft' : 'ArrowUp':
          e.preventDefault();
          activate(allTabs[(idx - 1 + allTabs.length) % allTabs.length]);
          break;
        case 'Home':
          e.preventDefault();
          activate(allTabs[0]);
          break;
        case 'End':
          e.preventDefault();
          activate(allTabs[allTabs.length - 1]);
          break;
      }
    },
    [listRef, orientation, setValue],
  );

  // Scroll active tab into view — critical on mobile where list overflows.
  // Guard: scrollIntoView may not exist in SSR or test environments.
  useIsomorphicLayoutEffect(() => {
    if (isActive && tabRef.current && typeof tabRef.current.scrollIntoView === 'function') {
      tabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [isActive]);

  return (
    <button
      ref={tabRef}
      role="tab"
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${tabValue}`}
      id={`${baseId}-tab-${tabValue}`}
      data-tab-value={tabValue}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={[
        'relative flex items-center justify-center shrink-0 rounded-lg whitespace-nowrap',
        'transition-colors duration-150 motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        'active:scale-[0.97]',
        sizeTabStyles[size],
        isActive ? variantTabActive[variant] : variantTabInactive[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
});
TabsTab.displayName = 'Tabs.Tab';

// ─── Panel ────────────────────────────────────────────────────────────────────

export interface TabsPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

function TabsPanel({ value: panelValue, children, className }: TabsPanelProps) {
  const { value, baseId } = useTabsContext();
  const isActive = value === panelValue;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${panelValue}`}
      aria-labelledby={`${baseId}-tab-${panelValue}`}
      hidden={!isActive}
      tabIndex={isActive ? 0 : -1}
      className={['focus-visible:outline-none', className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}
TabsPanel.displayName = 'Tabs.Panel';

// ─── Compound export ──────────────────────────────────────────────────────────

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Tab: TabsTab,
  Panel: TabsPanel,
});
