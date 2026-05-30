import React, { forwardRef } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

export type SettingsNavItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  href?: string;
  disabled?: boolean;
};

export type SettingsNavGroup = {
  label?: string;
  items: SettingsNavItem[];
};

export type SettingsLayoutProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  groups: SettingsNavGroup[];
  activeId: string;
  onNavigate?: (id: string) => void;
  renderLink?: (props: {
    href: string;
    children: React.ReactNode;
    className: string;
    onClick: () => void;
  }) => React.ReactNode;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

const BackArrow: React.FC = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
);

export const SettingsLayout = forwardRef<HTMLDivElement, SettingsLayoutProps>(
  function SettingsLayout(
    {
      title = 'Settings',
      groups,
      activeId,
      onNavigate,
      renderLink,
      children,
      backHref,
      backLabel = 'Back',
      className,
      ...rest
    },
    ref,
  ) {
    const isMobile = useIsMobile();

    const handleItemClick = (item: SettingsNavItem) => {
      if (item.disabled) {
        return;
      }
      onNavigate?.(item.id);
    };

    const renderNavItem = (item: SettingsNavItem) => {
      const isActive = item.id === activeId;

      const itemClassName = [
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150',
        isActive
          ? 'bg-primary-subtle text-primary font-medium ring-1 ring-primary/20'
          : 'text-text-secondary hover:text-text hover:bg-surface-lighter',
        item.disabled ? 'opacity-50 cursor-not-allowed' : '',
      ]
        .filter(Boolean)
        .join(' ');

      const content = (
        <>
          {item.icon && <span className="shrink-0">{item.icon}</span>}
          <span>{item.label}</span>
          {item.badge !== undefined && (
            <span className="ml-auto text-[11px] font-medium bg-surface-lighter text-text-muted rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {item.badge}
            </span>
          )}
        </>
      );

      if (item.href && renderLink && !item.disabled) {
        return (
          <React.Fragment key={item.id}>
            {renderLink({
              href: item.href,
              children: content,
              className: itemClassName,
              onClick: () => handleItemClick(item),
            })}
          </React.Fragment>
        );
      }

      return (
        <button
          key={item.id}
          type="button"
          className={itemClassName}
          onClick={() => handleItemClick(item)}
          disabled={item.disabled}
          aria-current={isActive ? 'page' : undefined}
        >
          {content}
        </button>
      );
    };

    const renderMobilePill = (item: SettingsNavItem) => {
      const isActive = item.id === activeId;

      const pillClassName = isActive
        ? 'bg-primary text-surface rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap'
        : 'text-text-secondary bg-surface-lighter rounded-full px-3 py-1.5 text-xs whitespace-nowrap';

      return (
        <button
          key={item.id}
          type="button"
          className={pillClassName}
          onClick={() => handleItemClick(item)}
          disabled={item.disabled}
          aria-current={isActive ? 'page' : undefined}
        >
          {item.label}
        </button>
      );
    };

    if (isMobile) {
      const allItems = groups.flatMap((g) => g.items);

      return (
        <div
          ref={ref}
          className={['flex flex-col', className].filter(Boolean).join(' ')}
          {...rest}
        >
          {title && (
            <h1 className="text-lg font-semibold text-text mb-4">{title}</h1>
          )}

          <nav
            className="flex gap-1 overflow-x-auto pb-3 border-b border-surface-border mb-4"
            aria-label="Settings navigation"
          >
            {allItems.map(renderMobilePill)}
          </nav>

          <div>{children}</div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={['flex', className].filter(Boolean).join(' ')}
        {...rest}
      >
        <aside className="w-56 shrink-0 pr-6 border-r border-surface-border">
          {backHref && (
            <a
              href={backHref}
              className="flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-secondary mb-4"
            >
              <BackArrow />
              <span>{backLabel}</span>
            </a>
          )}

          {title && (
            <h1 className="text-lg font-semibold text-text mb-6">{title}</h1>
          )}

          <nav aria-label="Settings navigation">
            {groups.map((group, groupIndex) => (
              <div key={group.label ?? `group-${groupIndex}`}>
                {group.label && (
                  <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider px-3 pt-4 pb-1.5">
                    {group.label}
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  {group.items.map(renderNavItem)}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="pl-8 flex-1 min-w-0">{children}</div>
      </div>
    );
  },
);

SettingsLayout.displayName = 'SettingsLayout';
