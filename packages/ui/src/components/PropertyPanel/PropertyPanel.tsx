import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

export type PropertyPanelSection = {
  title: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  children: React.ReactNode;
};

export type PropertyPanelProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  sections?: PropertyPanelSection[];
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: number | string;
  position?: 'left' | 'right';
};

type SectionItemProps = {
  section: PropertyPanelSection;
};

const SectionItem: React.FC<SectionItemProps> = ({ section }) => {
  const { title, collapsible = true, defaultExpanded = true, children } = section;
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children, expanded]);

  const toggle = useCallback(() => {
    if (collapsible) {
      setExpanded((prev) => !prev);
    }
  }, [collapsible]);

  return (
    <div className="border-t border-surface-border">
      <button
        type="button"
        onClick={toggle}
        className={[
          'flex w-full items-center justify-between',
          'px-4 py-2.5',
          'text-xs font-semibold text-text-muted uppercase tracking-wider',
          collapsible ? 'cursor-pointer hover:bg-surface-lighter/50' : 'cursor-default',
          'transition-colors duration-150',
        ].join(' ')}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        {collapsible && (
          <svg
            className="w-3.5 h-3.5 shrink-0 text-text-tertiary transition-transform duration-200"
            style={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transitionTimingFunction: 'var(--ease-smooth, cubic-bezier(0.4, 0, 0.2, 1))',
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
      </button>
      <div
        style={{
          maxHeight: expanded ? contentHeight : 0,
          opacity: expanded ? 1 : 0,
          transition: 'max-height 200ms var(--ease-smooth, cubic-bezier(0.4, 0, 0.2, 1)), opacity 150ms ease',
          overflow: 'hidden',
        }}
      >
        <div ref={contentRef} className="px-4 py-2">
          {children}
        </div>
      </div>
    </div>
  );
};

export const PropertyPanel = forwardRef<HTMLDivElement, PropertyPanelProps>(function PropertyPanel(
  {
    title,
    subtitle,
    icon,
    onClose,
    sections,
    children,
    footer,
    width = 320,
    position = 'right',
    className,
    style,
    ...rest
  },
  ref,
) {
  const borderClass = position === 'right' ? 'border-l' : 'border-r';

  return (
    <div
      ref={ref}
      className={[
        'bg-surface h-full flex flex-col',
        borderClass,
        'border-surface-border',
        className,
      ].filter(Boolean).join(' ')}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        ...style,
      }}
      {...rest}
    >
      {/* Header */}
      {(title || subtitle || icon || onClose) && (
        <div className="px-4 py-3 border-b border-surface-border flex items-center gap-3 shrink-0">
          {icon && (
            <div className="shrink-0 text-text-muted">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {title && (
              <h2 className="font-semibold text-sm text-text truncate">{title}</h2>
            )}
            {subtitle && (
              <p className="text-xs text-text-tertiary truncate">{subtitle}</p>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-text-muted hover:text-text-secondary transition-colors duration-150 p-1 rounded-md hover:bg-surface-lighter"
              aria-label="Close panel"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {sections
          ? sections.map((section, idx) => (
              <SectionItem key={`${section.title}-${idx}`} section={section} />
            ))
          : children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-4 py-3 border-t border-surface-border bg-surface sticky bottom-0 shrink-0">
          {footer}
        </div>
      )}
    </div>
  );
});

PropertyPanel.displayName = 'PropertyPanel';
