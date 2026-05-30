import React, { forwardRef, useState, useCallback } from 'react';

export type BreadcrumbItem = {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
};

export type BreadcrumbsSize = 'sm' | 'md' | 'lg';

export type BreadcrumbsProps = Omit<React.HTMLAttributes<HTMLElement>, 'children'> & {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
  size?: BreadcrumbsSize;
};

const sizeStyles: Record<BreadcrumbsSize, { text: string; gap: string; iconSize: string }> = {
  sm: { text: 'text-xs', gap: 'gap-1', iconSize: 'w-3.5 h-3.5' },
  md: { text: 'text-sm', gap: 'gap-1.5', iconSize: 'w-4 h-4' },
  lg: { text: 'text-base', gap: 'gap-2', iconSize: 'w-5 h-5' },
};

const separatorSizeStyles: Record<BreadcrumbsSize, string> = {
  sm: 'text-[10px] mx-1',
  md: 'text-xs mx-1.5',
  lg: 'text-sm mx-2',
};

export const Breadcrumbs = forwardRef<HTMLElement, BreadcrumbsProps>(function Breadcrumbs(
  {
    items,
    separator,
    maxItems,
    size = 'md',
    className,
    ...rest
  },
  ref,
) {
  const [expanded, setExpanded] = useState(false);

  const handleExpand = useCallback(() => {
    setExpanded(true);
  }, []);

  const sizeConfig = sizeStyles[size];
  const sepSize = separatorSizeStyles[size];

  const shouldCollapse = maxItems !== undefined && maxItems >= 2 && items.length > maxItems && !expanded;

  const visibleItems: BreadcrumbItem[] = (() => {
    if (!shouldCollapse) {
      return items;
    }
    // Show first item, ellipsis placeholder, and last (maxItems - 1) items
    // e.g., maxItems=3 with 6 items: [first, ..., fifth, sixth]
    const tailCount = maxItems - 1;
    return [items[0], ...items.slice(items.length - tailCount)];
  })();

  const renderSeparator = (key: string) => (
    <li key={key} role="presentation" aria-hidden="true" className={['text-text-muted select-none shrink-0', sepSize].join(' ')}>
      {separator ?? '/'}
    </li>
  );

  const renderItem = (item: BreadcrumbItem, index: number, isLast: boolean) => {
    const content = (
      <>
        {item.icon && (
          <span className={['shrink-0 flex items-center', sizeConfig.iconSize].join(' ')} aria-hidden="true">
            {item.icon}
          </span>
        )}
        <span>{item.label}</span>
      </>
    );

    if (isLast) {
      return (
        <li key={`item-${index}`}>
          <span
            aria-current="page"
            className={[
              'inline-flex items-center font-medium text-text',
              sizeConfig.text,
              sizeConfig.gap,
            ].join(' ')}
          >
            {content}
          </span>
        </li>
      );
    }

    if (item.href) {
      return (
        <li key={`item-${index}`}>
          <a
            href={item.href}
            onClick={item.onClick}
            className={[
              'inline-flex items-center text-text-secondary transition-colors duration-150',
              'hover:text-primary hover:underline underline-offset-2',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:rounded-sm',
              sizeConfig.text,
              sizeConfig.gap,
            ].join(' ')}
          >
            {content}
          </a>
        </li>
      );
    }

    if (item.onClick) {
      return (
        <li key={`item-${index}`}>
          <button
            type="button"
            onClick={item.onClick}
            className={[
              'inline-flex items-center text-text-secondary transition-colors duration-150 bg-transparent border-0 p-0 cursor-pointer',
              'hover:text-primary hover:underline underline-offset-2',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:rounded-sm',
              sizeConfig.text,
              sizeConfig.gap,
            ].join(' ')}
          >
            {content}
          </button>
        </li>
      );
    }

    return (
      <li key={`item-${index}`}>
        <span
          className={[
            'inline-flex items-center text-text-secondary',
            sizeConfig.text,
            sizeConfig.gap,
          ].join(' ')}
        >
          {content}
        </span>
      </li>
    );
  };

  const renderEllipsis = () => (
    <li key="ellipsis">
      <button
        type="button"
        onClick={handleExpand}
        aria-label="Show all breadcrumb items"
        className={[
          'inline-flex items-center justify-center text-text-secondary transition-colors duration-150 bg-transparent border-0 cursor-pointer',
          'hover:text-primary',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:rounded-sm',
          'rounded px-1',
          sizeConfig.text,
        ].join(' ')}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-text-muted) 8%, var(--color-surface))',
        }}
      >
        &hellip;
      </button>
    </li>
  );

  const elements: React.ReactNode[] = [];

  if (shouldCollapse) {
    // First item
    elements.push(renderItem(visibleItems[0], 0, false));
    elements.push(renderSeparator('sep-0'));
    // Ellipsis
    elements.push(renderEllipsis());
    // Remaining items (tail)
    for (let i = 1; i < visibleItems.length; i++) {
      elements.push(renderSeparator(`sep-${i}`));
      const isLast = i === visibleItems.length - 1;
      // Map back to original index for stable keys
      const originalIndex = items.length - (visibleItems.length - 1) + (i - 1);
      elements.push(renderItem(visibleItems[i], originalIndex, isLast));
    }
  } else {
    items.forEach((item, index) => {
      if (index > 0) {
        elements.push(renderSeparator(`sep-${index}`));
      }
      elements.push(renderItem(item, index, index === items.length - 1));
    });
  }

  return (
    <nav
      ref={ref}
      aria-label="Breadcrumb"
      className={className}
      {...rest}
    >
      <ol className={['flex items-center flex-wrap list-none m-0 p-0', sizeConfig.gap].join(' ')}>
        {elements}
      </ol>
    </nav>
  );
});

Breadcrumbs.displayName = 'Breadcrumbs';
