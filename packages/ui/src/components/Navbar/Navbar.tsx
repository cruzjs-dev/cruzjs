import React, { forwardRef, useCallback, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Burger } from '../Burger';

export type NavbarItem = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
};

export type NavbarProps = React.HTMLAttributes<HTMLElement> & {
  /** Logo or brand area rendered at the left edge. */
  brand?: React.ReactNode;
  /** Navigation links rendered in the center/left area. */
  items?: NavbarItem[];
  /** Action buttons/icons rendered at the right edge. */
  actions?: React.ReactNode;
  /** Search input slot rendered between items and actions. */
  search?: React.ReactNode;
  /** ID of the currently active nav item (overrides per-item `active`). */
  activeId?: string;
  /** Called when a nav item is clicked. */
  onNavigate?: (id: string) => void;
  /** Custom link renderer for framework integration (e.g. React Router). */
  renderLink?: (props: {
    href: string;
    children: React.ReactNode;
    className: string;
    onClick: () => void;
  }) => React.ReactNode;
  /** Pin the navbar to the top of the viewport. @default true */
  sticky?: boolean;
  /** Show a bottom border. @default true */
  bordered?: boolean;
  /** Height of the navbar. @default 56 */
  height?: number | string;
};

export const Navbar = forwardRef<HTMLElement, NavbarProps>(function Navbar(
  {
    brand,
    items,
    actions,
    search,
    activeId,
    onNavigate,
    renderLink,
    sticky = true,
    bordered = true,
    height = 56,
    className,
    style,
    ...rest
  },
  ref,
) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  const resolvedHeight = typeof height === 'number' ? `${height}px` : height;

  const handleItemClick = useCallback(
    (item: NavbarItem) => {
      item.onClick?.();
      onNavigate?.(item.id);
      setMenuOpen(false);
    },
    [onNavigate],
  );

  const isActive = (item: NavbarItem): boolean => {
    if (activeId != null) return item.id === activeId;
    return item.active === true;
  };

  const itemClassName = (item: NavbarItem): string =>
    [
      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150',
      isActive(item)
        ? 'text-primary bg-primary-subtle'
        : 'text-text-secondary hover:text-text hover:bg-surface-lighter',
    ].join(' ');

  const mobileItemClassName = (item: NavbarItem): string =>
    [
      'block w-full text-left py-2.5 text-sm rounded-lg px-3 transition-colors duration-150',
      isActive(item)
        ? 'text-primary bg-primary-subtle'
        : 'text-text-secondary hover:text-text hover:bg-surface-lighter',
    ].join(' ');

  const renderNavItem = (item: NavbarItem, mobile: boolean) => {
    const cls = mobile ? mobileItemClassName(item) : itemClassName(item);
    const onClick = () => handleItemClick(item);

    if (item.href && renderLink) {
      return (
        <React.Fragment key={item.id}>
          {renderLink({ href: item.href, children: item.label, className: cls, onClick })}
        </React.Fragment>
      );
    }

    if (item.href) {
      return (
        <a key={item.id} href={item.href} className={cls} onClick={onClick}>
          {item.label}
        </a>
      );
    }

    return (
      <button key={item.id} type="button" className={cls} onClick={onClick}>
        {item.label}
      </button>
    );
  };

  const navClasses = [
    'flex items-center px-4 gap-4 bg-surface',
    sticky && 'sticky top-0 z-30',
    bordered && 'border-b border-surface-border',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <nav
      ref={ref}
      className={navClasses}
      style={{ height: resolvedHeight, ...style }}
      {...rest}
    >
      {/* Brand */}
      {brand && <div className="shrink-0 mr-4">{brand}</div>}

      {/* Desktop nav items */}
      {!isMobile && items && items.length > 0 && (
        <div className="flex items-center gap-1">
          {items.map((item) => renderNavItem(item, false))}
        </div>
      )}

      {/* Desktop search */}
      {!isMobile && search && (
        <div className="flex-1 max-w-md mx-4">{search}</div>
      )}

      {/* Spacer to push actions right when no search */}
      {!isMobile && !search && <div className="flex-1" />}

      {/* Actions */}
      {actions && (
        <div className="shrink-0 flex items-center gap-2 ml-auto">{actions}</div>
      )}

      {/* Mobile burger */}
      {isMobile && (
        <Burger
          opened={menuOpen}
          onToggle={setMenuOpen}
          size="sm"
          className="ml-auto"
        />
      )}

      {/* Mobile menu */}
      {isMobile && menuOpen && (
        <div
          className="absolute left-0 bg-surface border-b border-surface-border px-4 py-3 w-full"
          style={{ top: resolvedHeight }}
        >
          {search && <div className="mb-3">{search}</div>}
          {items && items.length > 0 && (
            <div className="flex flex-col">
              {items.map((item) => renderNavItem(item, true))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
});

Navbar.displayName = 'Navbar';
