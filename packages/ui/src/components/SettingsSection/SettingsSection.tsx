import React, { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';

export type SettingsSectionProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  danger?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
};

export const SettingsSection = forwardRef<HTMLDivElement, SettingsSectionProps>(
  function SettingsSection(
    {
      title,
      description,
      children,
      actions,
      danger = false,
      collapsible = false,
      defaultExpanded = true,
      badge,
      icon,
      className,
      ...rest
    },
    ref,
  ) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const contentRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | undefined>(undefined);

    const uniqueId = useId();
    const headerId = `settings-section-header-${uniqueId}`;
    const contentId = `settings-section-content-${uniqueId}`;

    useEffect(() => {
      if (contentRef.current) {
        setHeight(contentRef.current.scrollHeight);
      }
    }, [children, actions, expanded]);

    const toggle = useCallback(() => {
      if (!collapsible) {
        return;
      }
      setExpanded((prev) => !prev);
    }, [collapsible]);

    const containerClasses = [
      'bg-surface rounded-xl shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)]',
      danger ? 'ring-1 ring-danger/20' : 'ring-1 ring-surface-border/50',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const iconContainerClasses = [
      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
      danger ? 'bg-danger/8' : 'bg-primary/8',
    ].join(' ');

    const iconColorClasses = danger ? 'text-danger' : 'text-primary';

    const headerContent = (
      <>
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <div className={iconContainerClasses}>
              <span className={iconColorClasses}>{icon}</span>
            </div>
          )}
          {danger && !icon && (
            <div className="border-l-2 border-danger h-5 shrink-0" />
          )}
          <h3 className="font-semibold text-text">{title}</h3>
          {badge && <span className="shrink-0">{badge}</span>}
        </div>
        {collapsible && (
          <svg
            className="w-4 h-4 shrink-0 text-text-secondary transition-transform duration-300"
            style={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </>
    );

    return (
      <div ref={ref} className={containerClasses} {...rest}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-border/50">
          {collapsible ? (
            <button
              type="button"
              id={headerId}
              aria-expanded={expanded}
              aria-controls={contentId}
              onClick={toggle}
              className="flex w-full items-center justify-between gap-2 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm"
            >
              {headerContent}
            </button>
          ) : (
            <div className="flex items-center justify-between gap-2">
              {headerContent}
            </div>
          )}
          {description && (
            <p className="text-sm text-text-secondary mt-1 max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {/* Content + Actions */}
        {collapsible ? (
          <div
            id={contentId}
            role="region"
            aria-labelledby={headerId}
            style={{
              height: expanded ? height : 0,
              opacity: expanded ? 1 : 0,
              transition:
                'height 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease',
              overflow: 'hidden',
            }}
          >
            <div ref={contentRef}>
              <div className="px-6 py-5">{children}</div>
              {actions && (
                <div className="px-6 py-4 border-t border-surface-border/50 bg-surface-light/50 rounded-b-xl flex justify-end gap-3">
                  {actions}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 py-5">{children}</div>
            {actions && (
              <div className="px-6 py-4 border-t border-surface-border/50 bg-surface-light/50 rounded-b-xl flex justify-end gap-3">
                {actions}
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);

SettingsSection.displayName = 'SettingsSection';
