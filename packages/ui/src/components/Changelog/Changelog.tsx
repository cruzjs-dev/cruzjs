import React, { forwardRef } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ChangeCategory = 'added' | 'changed' | 'fixed' | 'removed' | 'deprecated' | 'security';

export type ChangeItem = {
  description: React.ReactNode;
  category: ChangeCategory;
};

export type ChangelogVersion = {
  version: string;
  date: string;
  changes: ChangeItem[];
  href?: string;
};

export type ChangelogProps = React.HTMLAttributes<HTMLDivElement> & {
  versions: ChangelogVersion[];
  renderLink?: (props: { href: string; children: React.ReactNode; className?: string }) => React.ReactNode;
};

/* ------------------------------------------------------------------ */
/*  Category badge styles                                             */
/* ------------------------------------------------------------------ */

const categoryStyles: Record<ChangeCategory, string> = {
  added: 'bg-success-subtle text-success-text',
  changed: 'bg-info-subtle text-info',
  fixed: 'bg-warning-subtle text-warning-text',
  removed: 'bg-danger-subtle text-danger-text',
  deprecated: 'bg-surface-lighter text-text-muted',
  security: 'bg-danger-subtle text-danger',
};

const categoryLabels: Record<ChangeCategory, string> = {
  added: 'Added',
  changed: 'Changed',
  fixed: 'Fixed',
  removed: 'Removed',
  deprecated: 'Deprecated',
  security: 'Security',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function groupByCategory(changes: ChangeItem[]): Map<ChangeCategory, ChangeItem[]> {
  const order: ChangeCategory[] = ['added', 'changed', 'fixed', 'removed', 'deprecated', 'security'];
  const groups = new Map<ChangeCategory, ChangeItem[]>();

  for (const category of order) {
    const items = changes.filter((c) => c.category === category);
    if (items.length > 0) {
      groups.set(category, items);
    }
  }

  return groups;
}

/* ------------------------------------------------------------------ */
/*  CategoryBadge                                                     */
/* ------------------------------------------------------------------ */

function CategoryBadge({ category }: { category: ChangeCategory }) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        categoryStyles[category],
      ].join(' ')}
      data-testid="changelog-category-badge"
    >
      {categoryLabels[category]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  VersionEntry                                                      */
/* ------------------------------------------------------------------ */

function VersionEntry({
  entry,
  isLast,
  renderLink,
}: {
  entry: ChangelogVersion;
  isLast: boolean;
  renderLink?: ChangelogProps['renderLink'];
}) {
  const grouped = groupByCategory(entry.changes);

  const versionLabel = entry.href ? (
    renderLink ? (
      renderLink({
        href: entry.href,
        children: entry.version,
        className: 'text-2xl font-bold text-primary hover:underline',
      })
    ) : (
      <a
        href={entry.href}
        className="text-2xl font-bold text-primary hover:underline"
        data-testid="changelog-version-link"
      >
        {entry.version}
      </a>
    )
  ) : (
    <span className="text-2xl font-bold" data-testid="changelog-version-number">
      {entry.version}
    </span>
  );

  return (
    <div className="flex gap-4" data-testid="changelog-version-entry">
      {/* Timeline rail */}
      <div className="flex flex-col items-center">
        <div
          className="w-3 h-3 rounded-full bg-primary shrink-0 mt-2"
          data-testid="changelog-timeline-dot"
          aria-hidden="true"
        />
        {!isLast && (
          <div
            className="flex-1 w-0 border-l-2 border-surface-border min-h-4"
            data-testid="changelog-timeline-connector"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Content */}
      <div className={['flex-1 min-w-0', !isLast ? 'pb-8' : ''].filter(Boolean).join(' ')}>
        <div className="flex items-baseline gap-3 flex-wrap">
          {versionLabel}
          <span className="text-sm text-text-tertiary" data-testid="changelog-date">
            {entry.date}
          </span>
        </div>

        <div className="mt-4 space-y-4">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category}>
              <CategoryBadge category={category} />
              <ul className="mt-2 space-y-1 list-disc list-inside text-sm text-text">
                {items.map((item, i) => (
                  <li key={i} data-testid="changelog-change-item">
                    {item.description}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Changelog                                                         */
/* ------------------------------------------------------------------ */

export const Changelog = forwardRef<HTMLDivElement, ChangelogProps>(function Changelog(
  { versions, renderLink, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={['flex flex-col w-full', className].filter(Boolean).join(' ')}
      role="list"
      aria-label="Changelog"
      {...rest}
    >
      {versions.map((entry, i) => (
        <VersionEntry
          key={entry.version}
          entry={entry}
          isLast={i === versions.length - 1}
          renderLink={renderLink}
        />
      ))}
    </div>
  );
});

Changelog.displayName = 'Changelog';
