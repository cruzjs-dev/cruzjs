import React, { forwardRef, useCallback } from 'react';

export type PaginationSize = 'sm' | 'md' | 'lg';

export type PaginationProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  /** Current page (1-indexed) */
  page: number;
  /** Total number of pages */
  total: number;
  /** Callback when page changes */
  onChange: (page: number) => void;
  /** Number of pages shown on each side of the current page */
  siblings?: number;
  /** Number of pages shown at the start and end */
  boundaries?: number;
  /** Button size variant */
  size?: PaginationSize;
  /** Show first/last page buttons */
  showEdges?: boolean;
};

const ELLIPSIS = 'ellipsis' as const;
type PageItem = number | typeof ELLIPSIS;

/**
 * Computes the visible page numbers with ellipsis markers.
 *
 * For a range like [1, ..., 4, 5, 6, ..., 20] the result would be:
 * [1, 'ellipsis', 4, 5, 6, 'ellipsis', 20]
 */
export function getPageRange(
  page: number,
  total: number,
  siblings: number,
  boundaries: number,
): PageItem[] {
  if (total <= 0) {
    return [];
  }

  const totalSlots = siblings * 2 + boundaries * 2 + 3; // boundaries + siblings + current + ellipses
  if (totalSlots >= total) {
    return range(1, total);
  }

  const leftSiblingIndex = Math.max(page - siblings, boundaries + 1);
  const rightSiblingIndex = Math.min(page + siblings, total - boundaries);

  const showLeftEllipsis = leftSiblingIndex > boundaries + 2;
  const showRightEllipsis = rightSiblingIndex < total - boundaries - 1;

  const items: PageItem[] = [];

  // Left boundary pages
  for (let i = 1; i <= boundaries; i++) {
    items.push(i);
  }

  if (showLeftEllipsis) {
    items.push(ELLIPSIS);
  } else {
    // Fill in pages between boundary and sibling range
    for (let i = boundaries + 1; i < leftSiblingIndex; i++) {
      items.push(i);
    }
  }

  // Sibling pages and current page
  for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
    items.push(i);
  }

  if (showRightEllipsis) {
    items.push(ELLIPSIS);
  } else {
    // Fill in pages between sibling range and right boundary
    for (let i = rightSiblingIndex + 1; i <= total - boundaries; i++) {
      items.push(i);
    }
  }

  // Right boundary pages
  for (let i = total - boundaries + 1; i <= total; i++) {
    items.push(i);
  }

  return items;
}

function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i++) {
    result.push(i);
  }
  return result;
}

const sizeStyles: Record<PaginationSize, string> = {
  sm: 'h-8 min-w-8 text-xs',
  md: 'h-9 min-w-9 text-sm',
  lg: 'h-10 min-w-10 text-sm',
};

const iconSizes: Record<PaginationSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

const ChevronLeftIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ChevronRightIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const ChevronsLeftIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M11 17l-5-5 5-5" />
    <path d="M18 17l-5-5 5-5" />
  </svg>
);

const ChevronsRightIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M13 17l5-5-5-5" />
    <path d="M6 17l5-5-5-5" />
  </svg>
);

export const Pagination = forwardRef<HTMLDivElement, PaginationProps>(function Pagination(
  {
    page,
    total,
    onChange,
    siblings = 1,
    boundaries = 1,
    size = 'md',
    showEdges = true,
    className,
    ...rest
  },
  ref,
) {
  const pages = getPageRange(page, total, siblings, boundaries);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= total && newPage !== page) {
        onChange(newPage);
      }
    },
    [onChange, page, total],
  );

  const isFirstPage = page <= 1;
  const isLastPage = page >= total;
  const iconSize = iconSizes[size];

  const baseButtonClass = [
    'inline-flex items-center justify-center rounded-xl font-medium transition-colors duration-150',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    sizeStyles[size],
  ].join(' ');

  const inactiveClass = 'hover:bg-surface-lighter text-text-secondary';
  const activeClass = 'bg-primary text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]';
  const disabledClass = 'text-text-muted cursor-not-allowed opacity-50';

  return (
    <nav
      ref={ref}
      aria-label="Pagination"
      className={['flex items-center gap-1', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {/* First page button */}
      {showEdges && (
        <button
          type="button"
          className={[baseButtonClass, isFirstPage ? disabledClass : inactiveClass].join(' ')}
          disabled={isFirstPage}
          onClick={() => handlePageChange(1)}
          aria-label="Go to first page"
        >
          <ChevronsLeftIcon size={iconSize} />
        </button>
      )}

      {/* Previous button */}
      <button
        type="button"
        className={[baseButtonClass, isFirstPage ? disabledClass : inactiveClass].join(' ')}
        disabled={isFirstPage}
        onClick={() => handlePageChange(page - 1)}
        aria-label="Go to previous page"
      >
        <ChevronLeftIcon size={iconSize} />
      </button>

      {/* Page buttons */}
      {pages.map((item, index) => {
        if (item === ELLIPSIS) {
          return (
            <span
              key={`ellipsis-${index}`}
              className={[
                'inline-flex items-center justify-center text-text-muted select-none',
                sizeStyles[size],
              ].join(' ')}
              aria-hidden="true"
            >
              ...
            </span>
          );
        }

        const isActive = item === page;
        return (
          <button
            key={item}
            type="button"
            className={[baseButtonClass, isActive ? activeClass : inactiveClass].join(' ')}
            onClick={() => handlePageChange(item)}
            aria-label={`Go to page ${item}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {item}
          </button>
        );
      })}

      {/* Next button */}
      <button
        type="button"
        className={[baseButtonClass, isLastPage ? disabledClass : inactiveClass].join(' ')}
        disabled={isLastPage}
        onClick={() => handlePageChange(page + 1)}
        aria-label="Go to next page"
      >
        <ChevronRightIcon size={iconSize} />
      </button>

      {/* Last page button */}
      {showEdges && (
        <button
          type="button"
          className={[baseButtonClass, isLastPage ? disabledClass : inactiveClass].join(' ')}
          disabled={isLastPage}
          onClick={() => handlePageChange(total)}
          aria-label="Go to last page"
        >
          <ChevronsRightIcon size={iconSize} />
        </button>
      )}
    </nav>
  );
});

Pagination.displayName = 'Pagination';
