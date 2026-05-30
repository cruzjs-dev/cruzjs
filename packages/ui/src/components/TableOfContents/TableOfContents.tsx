import React, { forwardRef, useCallback } from 'react';

export type TocItem = {
  id: string;
  label: string;
  level: number;
  children?: TocItem[];
};

export type TableOfContentsSize = 'sm' | 'md' | 'lg';

export type TableOfContentsProps = {
  items: TocItem[];
  activeId?: string;
  onItemClick?: (id: string) => void;
  size?: TableOfContentsSize;
  className?: string;
};

const sizeClasses: Record<TableOfContentsSize, { text: string; padding: string; gap: string }> = {
  sm: { text: 'text-xs', padding: 'py-0.5 px-2', gap: 'space-y-0' },
  md: { text: 'text-sm', padding: 'py-1 px-3', gap: 'space-y-0.5' },
  lg: { text: 'text-base', padding: 'py-1.5 px-4', gap: 'space-y-1' },
};

type TocEntryProps = {
  item: TocItem;
  activeId?: string;
  onItemClick?: (id: string) => void;
  size: TableOfContentsSize;
};

const TocEntry: React.FC<TocEntryProps> = ({ item, activeId, onItemClick, size }) => {
  const styles = sizeClasses[size];
  const isActive = activeId === item.id;
  const indent = (item.level - 1) * (size === 'sm' ? 12 : size === 'md' ? 16 : 20);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onItemClick?.(item.id);

      const target = document.getElementById(item.id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    },
    [item.id, onItemClick],
  );

  return (
    <>
      <li>
        <a
          href={`#${item.id}`}
          onClick={handleClick}
          data-testid={`toc-item-${item.id}`}
          className={[
            'block border-l-2 transition-colors duration-150',
            styles.text,
            styles.padding,
            isActive
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-text-secondary hover:text-text-strong hover:border-surface-border',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded',
          ].join(' ')}
          style={{ paddingLeft: `${indent + (size === 'sm' ? 8 : size === 'md' ? 12 : 16)}px` }}
          aria-current={isActive ? 'location' : undefined}
        >
          {item.label}
        </a>
      </li>
      {item.children?.map((child) => (
        <TocEntry key={child.id} item={child} activeId={activeId} onItemClick={onItemClick} size={size} />
      ))}
    </>
  );
};

export const TableOfContents = forwardRef<HTMLElement, TableOfContentsProps>(
  function TableOfContents({ items, activeId, onItemClick, size = 'md', className }, ref) {
    const styles = sizeClasses[size];

    return (
      <nav ref={ref} aria-label="Table of contents" className={className}>
        <ul className={styles.gap}>
          {items.map((item) => (
            <TocEntry key={item.id} item={item} activeId={activeId} onItemClick={onItemClick} size={size} />
          ))}
        </ul>
      </nav>
    );
  },
);

TableOfContents.displayName = 'TableOfContents';
