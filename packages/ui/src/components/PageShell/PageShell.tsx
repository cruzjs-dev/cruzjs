import React, { forwardRef, useCallback } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PageShellTab = {
  id: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
};

export type PageShellPadding = 'none' | 'sm' | 'md' | 'lg';

export type PageShellProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: PageShellTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  padding?: PageShellPadding;
  children: React.ReactNode;
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const paddingStyles: Record<PageShellPadding, string> = {
  none: '',
  sm: 'px-3 py-2 sm:px-4 sm:py-3',
  md: 'px-4 py-4 sm:px-6 sm:py-6',
  lg: 'px-6 py-6 sm:px-8 sm:py-8',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export const PageShell = forwardRef<HTMLDivElement, PageShellProps>(function PageShell(
  {
    title,
    description,
    breadcrumbs,
    actions,
    tabs,
    activeTab,
    onTabChange,
    padding = 'md',
    children,
    className,
    ...rest
  },
  ref,
) {
  const isMobile = useIsMobile();

  const handleTabClick = useCallback(
    (tabId: string, disabled?: boolean) => {
      if (disabled) {
        return;
      }
      onTabChange?.(tabId);
    },
    [onTabChange],
  );

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, tabs: PageShellTab[], currentIndex: number) => {
      const enabledTabs = tabs.filter((t) => !t.disabled);
      const currentEnabledIndex = enabledTabs.findIndex((t) => t.id === tabs[currentIndex].id);

      let nextTab: PageShellTab | undefined;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextTab = enabledTabs[(currentEnabledIndex + 1) % enabledTabs.length];
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nextTab = enabledTabs[(currentEnabledIndex - 1 + enabledTabs.length) % enabledTabs.length];
          break;
        case 'Home':
          e.preventDefault();
          nextTab = enabledTabs[0];
          break;
        case 'End':
          e.preventDefault();
          nextTab = enabledTabs[enabledTabs.length - 1];
          break;
      }

      if (nextTab) {
        onTabChange?.(nextTab.id);
        const nextButton = e.currentTarget
          .closest('[role="tablist"]')
          ?.querySelector<HTMLButtonElement>(`[data-tab-id="${CSS.escape(nextTab.id)}"]`);
        nextButton?.focus();
      }
    },
    [onTabChange],
  );

  return (
    <div
      ref={ref}
      className={['min-h-0 flex flex-col', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {/* Header area */}
      <div className="border-b border-surface-border bg-surface">
        <div className={paddingStyles[padding] || 'px-4 py-4 sm:px-6 sm:py-6'}>
          {/* Breadcrumbs */}
          {breadcrumbs && <div className="mb-2" data-testid="page-shell-breadcrumbs">{breadcrumbs}</div>}

          {/* Title row */}
          <div
            className={[
              'flex gap-4',
              isMobile ? 'flex-col' : 'flex-row items-center justify-between',
            ].join(' ')}
          >
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-text truncate">{title}</h1>
              {description && (
                <p className="mt-1 text-sm text-text-secondary">{description}</p>
              )}
            </div>

            {actions && (
              <div className="shrink-0 flex items-center gap-2" data-testid="page-shell-actions">
                {actions}
              </div>
            )}
          </div>
        </div>

        {/* Tab bar */}
        {tabs && tabs.length > 0 && (
          <div
            role="tablist"
            aria-label="Page sections"
            className={[
              'flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]',
              padding !== 'none' ? 'px-4 sm:px-6' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {tabs.map((tab, index) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  aria-disabled={tab.disabled || undefined}
                  disabled={tab.disabled}
                  data-tab-id={tab.id}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => handleTabClick(tab.id, tab.disabled)}
                  onKeyDown={(e) => handleTabKeyDown(e, tabs, index)}
                  className={[
                    'relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap shrink-0',
                    'transition-colors duration-150 motion-reduce:transition-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                    'border-b-2 -mb-px',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-secondary hover:text-text hover:border-surface-border',
                    tab.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {tab.icon && <span className="shrink-0 w-4 h-4 flex items-center justify-center">{tab.icon}</span>}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className={['flex-1 min-h-0', paddingStyles[padding]].filter(Boolean).join(' ')}>
        {children}
      </div>
    </div>
  );
});

PageShell.displayName = 'PageShell';
