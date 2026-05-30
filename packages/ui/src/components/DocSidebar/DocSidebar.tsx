import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type DocSidebarItem = {
  id: string;
  label: string;
  href?: string;
  children?: DocSidebarItem[];
  badge?: React.ReactNode;
};

export type DocSidebarSection = {
  title?: string;
  items: DocSidebarItem[];
};

export type DocSidebarProps = React.HTMLAttributes<HTMLElement> & {
  sections: DocSidebarSection[];
  activeId?: string;
  onNavigate?: (id: string) => void;
  showSearch?: boolean;
  searchPlaceholder?: string;
  renderLink?: (props: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => React.ReactNode;
};

const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-3.5 h-3.5 shrink-0 transition-transform duration-200"
    style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
    aria-hidden="true"
  >
    <path d="M6 4l4 4-4 4" />
  </svg>
);

const SearchIcon: React.FC = () => (
  <svg
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-4 h-4 text-text-tertiary"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
      clipRule="evenodd"
    />
  </svg>
);

function collectAllIds(items: DocSidebarItem[]): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    ids.add(item.id);
    if (item.children) {
      for (const childId of collectAllIds(item.children)) {
        ids.add(childId);
      }
    }
  }
  return ids;
}

function findAncestorIds(
  items: DocSidebarItem[],
  targetId: string,
  path: string[] = [],
): string[] | null {
  for (const item of items) {
    if (item.id === targetId) {
      return path;
    }
    if (item.children) {
      const result = findAncestorIds(item.children, targetId, [...path, item.id]);
      if (result) {
        return result;
      }
    }
  }
  return null;
}

function filterItems(items: DocSidebarItem[], query: string): DocSidebarItem[] {
  const lowerQuery = query.toLowerCase();
  const result: DocSidebarItem[] = [];

  for (const item of items) {
    const labelMatches = item.label.toLowerCase().includes(lowerQuery);
    const filteredChildren = item.children ? filterItems(item.children, query) : [];

    if (labelMatches || filteredChildren.length > 0) {
      result.push({
        ...item,
        children: filteredChildren.length > 0 ? filteredChildren : item.children && labelMatches ? item.children : undefined,
      });
    }
  }

  return result;
}

type CollapsibleSectionProps = {
  item: DocSidebarItem;
  depth: number;
  activeId?: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onNavigate?: (id: string) => void;
  renderLink?: DocSidebarProps['renderLink'];
};

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  item,
  depth,
  activeId,
  expandedIds,
  onToggle,
  onNavigate,
  renderLink,
}) => {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedIds.has(item.id);
  const isActive = activeId === item.id;
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [isExpanded, item.children]);

  const paddingLeft = depth * 16;

  const handleClick = useCallback(() => {
    if (hasChildren) {
      onToggle(item.id);
    }
    onNavigate?.(item.id);
  }, [hasChildren, item.id, onToggle, onNavigate]);

  const itemClasses = [
    'flex items-center gap-2 w-full text-left text-sm py-1.5 pr-2 transition-colors duration-150 rounded-md',
    isActive
      ? 'border-l-2 border-primary text-primary bg-primary-subtle font-medium'
      : 'border-l-2 border-transparent text-text-secondary hover:text-text hover:bg-surface-lighter',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded',
  ].join(' ');

  const style = { paddingLeft: `${paddingLeft + 12}px` };

  const content = (
    <>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && (
        <span className="shrink-0">{item.badge}</span>
      )}
      {hasChildren && <ChevronIcon expanded={isExpanded} />}
    </>
  );

  const renderItem = () => {
    if (item.href && renderLink && !hasChildren) {
      return renderLink({
        href: item.href,
        children: content,
        className: itemClasses,
      });
    }

    if (item.href && !hasChildren) {
      return (
        <a
          href={item.href}
          className={itemClasses}
          style={style}
          onClick={(e) => {
            e.preventDefault();
            onNavigate?.(item.id);
          }}
          aria-current={isActive ? 'page' : undefined}
          data-testid={`doc-sidebar-item-${item.id}`}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        type="button"
        className={itemClasses}
        style={style}
        onClick={handleClick}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-current={isActive ? 'page' : undefined}
        data-testid={`doc-sidebar-item-${item.id}`}
      >
        {content}
      </button>
    );
  };

  return (
    <div data-doc-sidebar-item={item.id}>
      {renderItem()}
      {hasChildren && (
        <div
          style={{
            height: isExpanded ? height : 0,
            opacity: isExpanded ? 1 : 0,
            transition: 'height 200ms ease, opacity 150ms ease',
            overflow: 'hidden',
          }}
        >
          <div ref={contentRef}>
            {item.children!.map((child) => (
              <CollapsibleSection
                key={child.id}
                item={child}
                depth={depth + 1}
                activeId={activeId}
                expandedIds={expandedIds}
                onToggle={onToggle}
                onNavigate={onNavigate}
                renderLink={renderLink}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const DocSidebar = forwardRef<HTMLElement, DocSidebarProps>(function DocSidebar(
  {
    sections,
    activeId,
    onNavigate,
    showSearch = false,
    searchPlaceholder = 'Search...',
    renderLink,
    className,
    ...rest
  },
  ref,
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Auto-expand ancestors of the active item
    if (!activeId) return new Set<string>();
    const ids = new Set<string>();
    for (const section of sections) {
      const ancestors = findAncestorIds(section.items, activeId);
      if (ancestors) {
        for (const id of ancestors) {
          ids.add(id);
        }
      }
    }
    return ids;
  });

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

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;

    return sections
      .map((section) => ({
        ...section,
        items: filterItems(section.items, searchQuery),
      }))
      .filter((section) => section.items.length > 0);
  }, [sections, searchQuery]);

  // When searching, expand all items that match
  const effectiveExpandedIds = useMemo(() => {
    if (!searchQuery.trim()) return expandedIds;
    const allIds = new Set<string>();
    for (const section of filteredSections) {
      for (const id of collectAllIds(section.items)) {
        allIds.add(id);
      }
    }
    return allIds;
  }, [searchQuery, expandedIds, filteredSections]);

  return (
    <nav
      ref={ref}
      aria-label="Documentation sidebar"
      className={[
        'sticky top-0 flex flex-col bg-surface overflow-y-auto',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {showSearch && (
        <div className="p-3 border-b border-surface-border">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className={[
                'w-full pl-9 pr-3 py-1.5 text-sm rounded-lg',
                'bg-surface-lighter text-text placeholder:text-text-tertiary',
                'border border-surface-border',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                'transition-colors duration-150',
              ].join(' ')}
              aria-label={searchPlaceholder}
            />
          </div>
        </div>
      )}

      <div className="flex-1 py-2">
        {filteredSections.map((section, sectionIdx) => (
          <div key={section.title ?? `section-${sectionIdx}`}>
            {sectionIdx > 0 && (
              <div className="border-t border-surface-border/50 mx-3 my-2" role="separator" />
            )}
            {section.title && (
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider px-3 pt-4 pb-1.5">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <CollapsibleSection
                  key={item.id}
                  item={item}
                  depth={0}
                  activeId={activeId}
                  expandedIds={effectiveExpandedIds}
                  onToggle={toggleExpanded}
                  onNavigate={onNavigate}
                  renderLink={renderLink}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
});

DocSidebar.displayName = 'DocSidebar';
