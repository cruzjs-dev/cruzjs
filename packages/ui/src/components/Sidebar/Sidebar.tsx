import React, { forwardRef, useCallback, useState } from 'react';

export type SidebarItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  children?: SidebarItem[];
  disabled?: boolean;
};

export type SidebarGroup = {
  label?: string;
  items: SidebarItem[];
};

export type SidebarProps = React.HTMLAttributes<HTMLElement> & {
  groups: SidebarGroup[];
  activeId?: string;
  collapsed?: boolean;
  onNavigate?: (id: string) => void;
  renderLink?: (props: {
    href: string;
    children: React.ReactNode;
    className: string;
    onClick: () => void;
  }) => React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
};

const chevronSvg = (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-3.5 h-3.5 shrink-0 transition-transform duration-150"
  >
    <path d="M6 4l4 4-4 4" />
  </svg>
);

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  {
    groups,
    activeId,
    collapsed = false,
    onNavigate,
    renderLink,
    header,
    footer,
    className,
    ...rest
  },
  ref,
) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleItemClick = useCallback(
    (item: SidebarItem) => {
      if (item.disabled) {
        return;
      }
      if (item.children && item.children.length > 0) {
        toggleExpanded(item.id);
        return;
      }
      item.onClick?.();
      onNavigate?.(item.id);
    },
    [onNavigate, toggleExpanded],
  );

  const isActive = useCallback(
    (item: SidebarItem): boolean => {
      if (item.id === activeId) {
        return true;
      }
      if (item.children) {
        return item.children.some((child) => child.id === activeId);
      }
      return false;
    },
    [activeId],
  );

  const renderItemContent = (item: SidebarItem, isNested = false) => {
    const active = item.id === activeId;
    const hasChildren = item.children && item.children.length > 0;
    const expanded = expandedIds.has(item.id);

    const baseClasses = [
      'flex items-center gap-2.5 rounded-lg text-sm transition-all duration-150 mx-2 w-[calc(100%-16px)]',
      collapsed && !isNested
        ? 'justify-center p-2'
        : 'px-3 py-2',
    ];

    if (item.disabled) {
      baseClasses.push('opacity-50 cursor-not-allowed pointer-events-none');
    } else if (active) {
      baseClasses.push('bg-primary-subtle text-primary font-medium ring-1 ring-primary/20');
    } else {
      baseClasses.push('text-text-secondary hover:text-text hover:bg-surface-lighter cursor-pointer');
    }

    const itemClassName = baseClasses.join(' ');

    const content = (
      <>
        {item.icon && (
          <span className="w-5 h-5 shrink-0">{item.icon}</span>
        )}
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge !== undefined && (
              <span className="ml-auto text-[11px] font-medium bg-surface-lighter text-text-muted rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {item.badge}
              </span>
            )}
            {hasChildren && (
              <span
                className={[
                  'ml-auto transition-transform duration-150',
                  expanded ? 'rotate-90' : '',
                ].join(' ')}
              >
                {chevronSvg}
              </span>
            )}
          </>
        )}
      </>
    );

    // If it has an href and a renderLink, use the custom link renderer
    if (item.href && renderLink && !hasChildren) {
      return renderLink({
        href: item.href,
        children: content,
        className: itemClassName,
        onClick: () => handleItemClick(item),
      });
    }

    // If it has an href and no custom renderLink, render an anchor
    if (item.href && !hasChildren) {
      return (
        <a
          href={item.href}
          className={itemClassName}
          onClick={(e) => {
            if (item.disabled) {
              e.preventDefault();
              return;
            }
            onNavigate?.(item.id);
            item.onClick?.();
          }}
          title={collapsed && !isNested ? item.label : undefined}
          aria-disabled={item.disabled || undefined}
          aria-current={active ? 'page' : undefined}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        type="button"
        className={itemClassName}
        onClick={() => handleItemClick(item)}
        title={collapsed && !isNested ? item.label : undefined}
        disabled={item.disabled}
        aria-expanded={hasChildren ? expanded : undefined}
        aria-current={active ? 'page' : undefined}
      >
        {content}
      </button>
    );
  };

  const renderNavItem = (item: SidebarItem, isNested = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const expanded = expandedIds.has(item.id);

    return (
      <div key={item.id} data-sidebar-item={item.id}>
        {renderItemContent(item, isNested)}
        {hasChildren && expanded && !collapsed && (
          <div className="ml-8 border-l border-surface-border pl-2">
            {item.children!.map((child) => renderNavItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav
      ref={ref}
      className={[
        'h-full flex flex-col bg-surface transition-all duration-200 ease-[var(--ease-smooth)]',
        collapsed ? 'w-[64px]' : 'w-full',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {header && (
        <div className="shrink-0">{header}</div>
      )}

      <div className="flex-1 overflow-y-auto py-2">
        {groups.map((group, groupIdx) => (
          <div key={group.label ?? `group-${groupIdx}`}>
            {groupIdx > 0 && (
              <div className="border-t border-surface-border/50 mx-3 my-2" role="separator" />
            )}
            {group.label && !collapsed && (
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider px-3 pt-4 pb-1.5">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => renderNavItem(item))}
            </div>
          </div>
        ))}
      </div>

      {footer && (
        <div className="shrink-0">{footer}</div>
      )}
    </nav>
  );
});

Sidebar.displayName = 'Sidebar';
