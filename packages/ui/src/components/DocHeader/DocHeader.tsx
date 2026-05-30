import React, { forwardRef } from 'react';

export type DocHeaderProps = React.HTMLAttributes<HTMLElement> & {
  title: string;
  description?: string;
  breadcrumbs?: React.ReactNode;
  editUrl?: string;
  editLabel?: string;
  lastUpdated?: string;
  readingTime?: string;
  renderLink?: (props: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => React.ReactNode;
};

export const DocHeader = forwardRef<HTMLElement, DocHeaderProps>(function DocHeader(
  {
    title,
    description,
    breadcrumbs,
    editUrl,
    editLabel = 'Edit this page',
    lastUpdated,
    readingTime,
    renderLink,
    className,
    ...rest
  },
  ref,
) {
  const editLinkClass = 'text-sm text-primary hover:underline';

  const editLinkContent = editUrl ? (
    renderLink ? (
      renderLink({ href: editUrl, children: editLabel, className: editLinkClass })
    ) : (
      <a href={editUrl} className={editLinkClass}>
        {editLabel}
      </a>
    )
  ) : null;

  return (
    <header
      ref={ref}
      className={['border-b border-surface-border pb-6 mb-8', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {(breadcrumbs || editLinkContent) && (
        <div className="flex items-center justify-between mb-3">
          <div>{breadcrumbs}</div>
          {editLinkContent && <div className="ml-auto">{editLinkContent}</div>}
        </div>
      )}

      <h1 className="text-3xl font-bold text-text">{title}</h1>

      {description && (
        <p className="text-lg text-text-secondary mt-2">{description}</p>
      )}

      {(lastUpdated || readingTime) && (
        <div className="flex items-center gap-3 mt-3 text-sm text-text-tertiary">
          {lastUpdated && <span>Last updated: {lastUpdated}</span>}
          {lastUpdated && readingTime && (
            <span aria-hidden="true" className="text-text-tertiary">
              ·
            </span>
          )}
          {readingTime && <span>{readingTime}</span>}
        </div>
      )}
    </header>
  );
});

DocHeader.displayName = 'DocHeader';
