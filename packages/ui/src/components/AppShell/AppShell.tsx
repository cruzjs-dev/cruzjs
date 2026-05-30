import React, { forwardRef } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

export type AppShellPadding = 'none' | 'sm' | 'md' | 'lg';
export type SidebarPosition = 'left' | 'right';

export type AppShellProps = React.HTMLAttributes<HTMLDivElement> & {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  sidebarWidth?: number | string;
  sidebarCollapsed?: boolean;
  collapsedWidth?: number;
  headerHeight?: number | string;
  footerHeight?: number | string;
  sidebarPosition?: SidebarPosition;
  padding?: AppShellPadding;
  fixed?: boolean;
};

const paddingClasses: Record<AppShellPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

function toCssValue(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value;
}

export const AppShell = forwardRef<HTMLDivElement, AppShellProps>(
  function AppShell(
    {
      header,
      sidebar,
      footer,
      children,
      sidebarWidth = 260,
      sidebarCollapsed = false,
      collapsedWidth = 64,
      headerHeight = 56,
      footerHeight,
      sidebarPosition = 'left',
      padding = 'md',
      fixed = false,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const isMobile = useIsMobile();

    const headerHeightCss = toCssValue(headerHeight);
    const resolvedSidebarWidth = sidebarCollapsed
      ? toCssValue(collapsedWidth)
      : toCssValue(sidebarWidth);

    const hasSidebar = sidebar != null && !isMobile;

    const sidebarColumn = hasSidebar ? resolvedSidebarWidth : '0px';
    const gridTemplateColumns =
      hasSidebar && sidebarPosition === 'right'
        ? `1fr ${sidebarColumn}`
        : `${sidebarColumn} 1fr`;

    const headerRow = header ? headerHeightCss : '0px';
    const footerRow = footer
      ? footerHeight
        ? toCssValue(footerHeight)
        : 'auto'
      : '0px';
    const gridTemplateRows = `${headerRow} 1fr ${footerRow}`;

    const gridStyle: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns,
      gridTemplateRows,
      minHeight: '100vh',
      ...style,
    };

    const sidebarOrder = hasSidebar && sidebarPosition === 'right' ? 2 : 1;
    const mainOrder = hasSidebar && sidebarPosition === 'right' ? 1 : 2;

    return (
      <div
        ref={ref}
        className={['min-h-screen', className].filter(Boolean).join(' ')}
        style={gridStyle}
        data-testid="app-shell"
        {...rest}
      >
        {/* Header */}
        {header && (
          <div
            className={[
              'bg-surface border-b border-surface-border z-20',
              fixed ? 'sticky top-0' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              gridColumn: '1 / -1',
              gridRow: '1',
              height: headerHeightCss,
            }}
            data-testid="app-shell-header"
          >
            {header}
          </div>
        )}

        {/* Sidebar */}
        {hasSidebar && (
          <div
            className={[
              'bg-surface overflow-y-auto overflow-x-hidden',
              'transition-[width] duration-200 ease-[var(--ease-smooth,ease)]',
              sidebarPosition === 'right'
                ? 'border-l border-surface-border'
                : 'border-r border-surface-border',
              fixed ? 'sticky overflow-y-auto' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              width: resolvedSidebarWidth,
              gridColumn: sidebarPosition === 'right' ? '2' : '1',
              gridRow: '2',
              order: sidebarOrder,
              ...(fixed
                ? {
                    top: header ? headerHeightCss : '0px',
                    height: header
                      ? `calc(100vh - ${headerHeightCss})`
                      : '100vh',
                  }
                : {
                    minHeight: header
                      ? `calc(100vh - ${headerHeightCss})`
                      : '100vh',
                  }),
            }}
            data-testid="app-shell-sidebar"
          >
            {sidebar}
          </div>
        )}

        {/* Main content */}
        <main
          className={[
            'bg-surface-light',
            paddingClasses[padding],
            header ? `min-h-[calc(100vh-${headerHeightCss})]` : 'min-h-screen',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            gridColumn: hasSidebar
              ? sidebarPosition === 'right'
                ? '1'
                : '2'
              : '1 / -1',
            gridRow: '2',
            order: mainOrder,
            minHeight: header
              ? `calc(100vh - ${headerHeightCss})`
              : '100vh',
          }}
          data-testid="app-shell-main"
        >
          {children}
        </main>

        {/* Footer */}
        {footer && (
          <div
            className="bg-surface border-t border-surface-border"
            style={{
              gridColumn: '1 / -1',
              gridRow: '3',
              ...(footerHeight ? { height: toCssValue(footerHeight) } : {}),
            }}
            data-testid="app-shell-footer"
          >
            {footer}
          </div>
        )}
      </div>
    );
  },
);

AppShell.displayName = 'AppShell';
