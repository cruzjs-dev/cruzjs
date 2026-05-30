import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Burger } from '../Burger';

export type MarketingNavbarItem = {
  id: string;
  label: string;
  href: string;
};

export type MarketingNavbarProps = React.HTMLAttributes<HTMLElement> & {
  /** Logo or brand area rendered at the left edge. */
  brand?: React.ReactNode;
  /** Navigation links rendered in the center area. */
  items?: MarketingNavbarItem[];
  /** CTA button slot rendered at the right edge. */
  cta?: React.ReactNode;
  /** ID of the currently active nav item. */
  activeId?: string;
  /** Scroll distance in pixels before the navbar transitions to solid. @default 50 */
  scrollThreshold?: number;
  /** When true, the navbar uses a transparent background (before scroll). @default false */
  transparent?: boolean;
  /** Announcement bar content rendered above the navbar. */
  announcement?: React.ReactNode;
  /** Called when a nav item is clicked. */
  onNavigate?: (id: string) => void;
  /** Custom link renderer for framework integration (e.g. React Router). */
  renderLink?: (props: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => React.ReactNode;
};

export const MarketingNavbar = forwardRef<HTMLElement, MarketingNavbarProps>(
  function MarketingNavbar(
    {
      brand,
      items,
      cta,
      activeId,
      scrollThreshold = 50,
      transparent = false,
      announcement,
      onNavigate,
      renderLink,
      className,
      ...rest
    },
    ref,
  ) {
    const isMobile = useIsMobile();
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
      if (!transparent) {
        return;
      }

      const handleScroll = () => {
        setScrolled(window.scrollY > scrollThreshold);
      };

      handleScroll();
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }, [transparent, scrollThreshold]);

    const handleItemClick = useCallback(
      (id: string) => {
        onNavigate?.(id);
        setMenuOpen(false);
      },
      [onNavigate],
    );

    const isActive = (item: MarketingNavbarItem): boolean => {
      return activeId != null && item.id === activeId;
    };

    const showSolid = !transparent || scrolled;

    const itemClassName = (item: MarketingNavbarItem): string =>
      [
        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150',
        isActive(item)
          ? 'text-primary'
          : showSolid
            ? 'text-text-secondary hover:text-text'
            : 'text-text-secondary hover:text-text',
      ].join(' ');

    const mobileItemClassName = (item: MarketingNavbarItem): string =>
      [
        'block w-full text-left py-2.5 text-sm rounded-lg px-3 transition-colors duration-150',
        isActive(item)
          ? 'text-primary bg-primary-subtle'
          : 'text-text-secondary hover:text-text hover:bg-surface-lighter',
      ].join(' ');

    const renderNavItem = (item: MarketingNavbarItem, mobile: boolean) => {
      const cls = mobile ? mobileItemClassName(item) : itemClassName(item);

      if (renderLink) {
        return (
          <React.Fragment key={item.id}>
            {renderLink({ href: item.href, children: item.label, className: cls })}
          </React.Fragment>
        );
      }

      return (
        <a
          key={item.id}
          href={item.href}
          className={cls}
          onClick={(e) => {
            e.preventDefault();
            handleItemClick(item.id);
          }}
        >
          {item.label}
        </a>
      );
    };

    const navClasses = [
      'sticky top-0 z-40 w-full transition-all duration-300',
      showSolid
        ? 'bg-surface/95 backdrop-blur-md shadow-sm border-b border-surface-border'
        : 'bg-transparent',
      showSolid ? 'marketing-navbar-scrolled' : 'marketing-navbar-transparent',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <>
        {/* Announcement bar */}
        {announcement && (
          <div className="bg-primary text-white text-center text-sm py-2 px-4">
            {announcement}
          </div>
        )}

        <nav ref={ref} className={navClasses} {...rest}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Brand */}
              {brand && <div className="shrink-0">{brand}</div>}

              {/* Desktop nav items */}
              {!isMobile && items && items.length > 0 && (
                <div className="flex items-center gap-1 ml-8">
                  {items.map((item) => renderNavItem(item, false))}
                </div>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* CTA */}
              {!isMobile && cta && (
                <div className="shrink-0">{cta}</div>
              )}

              {/* Mobile burger */}
              {isMobile && (
                <Burger
                  opened={menuOpen}
                  onToggle={setMenuOpen}
                  size="sm"
                />
              )}
            </div>
          </div>

          {/* Mobile menu */}
          {isMobile && menuOpen && (
            <div className="bg-surface border-b border-surface-border px-4 py-3">
              {items && items.length > 0 && (
                <div className="flex flex-col">
                  {items.map((item) => renderNavItem(item, true))}
                </div>
              )}
              {cta && <div className="mt-3 pt-3 border-t border-surface-border">{cta}</div>}
            </div>
          )}
        </nav>
      </>
    );
  },
);

MarketingNavbar.displayName = 'MarketingNavbar';
