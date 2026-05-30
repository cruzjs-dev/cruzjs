import React, { forwardRef, useCallback, useMemo } from 'react';
import { Spinner } from '../Spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
};

export type DataTablePagination = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export type DataTableProps<T extends Record<string, unknown>> = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onChange'
> & {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: keyof T | ((row: T) => string);
  // Sorting
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  // Selection
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selectedRows: Set<string>) => void;
  // Pagination
  pagination?: DataTablePagination;
  // Other
  loading?: boolean;
  emptyMessage?: string;
  striped?: boolean;
  stickyHeader?: boolean;
  onRowClick?: (row: T) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRowKey<T extends Record<string, unknown>>(
  row: T,
  rowKey: keyof T | ((row: T) => string),
): string {
  if (typeof rowKey === 'function') {
    return rowKey(row);
  }
  return String(row[rowKey]);
}

const alignClasses: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

// ─── Sort Icon ────────────────────────────────────────────────────────────────

const SortIcon: React.FC<{ active: boolean; direction?: 'asc' | 'desc' }> = ({
  active,
  direction,
}) => (
  <svg
    className={[
      'w-3.5 h-3.5 transition-all duration-200 shrink-0',
      active
        ? 'text-text-secondary'
        : 'text-text-muted opacity-0 group-hover:opacity-100',
      active && direction === 'desc' ? 'rotate-180' : '',
    ].join(' ')}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
  </svg>
);

// ─── Chevron Icon (for pagination) ────────────────────────────────────────────

const ChevronIcon: React.FC<{ direction: 'left' | 'right'; className?: string }> = ({
  direction,
  className,
}) => (
  <svg
    className={['w-4 h-4', className].filter(Boolean).join(' ')}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d={direction === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
    />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

function DataTableInner<T extends Record<string, unknown>>(
  {
    columns,
    data,
    rowKey,
    sortColumn,
    sortDirection,
    onSort,
    selectable = false,
    selectedRows,
    onSelectionChange,
    pagination,
    loading = false,
    emptyMessage = 'No data to display',
    striped = false,
    stickyHeader = false,
    onRowClick,
    className,
    ...rest
  }: DataTableProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  // ── Row keys ────────────────────────────────────────────────────────────────

  const allRowKeys = useMemo(
    () => data.map((row) => getRowKey(row, rowKey)),
    [data, rowKey],
  );

  // ── Selection handlers ──────────────────────────────────────────────────────

  const allSelected = useMemo(
    () =>
      data.length > 0 &&
      selectedRows != null &&
      allRowKeys.every((k) => selectedRows.has(k)),
    [data.length, selectedRows, allRowKeys],
  );

  const someSelected = useMemo(
    () =>
      selectedRows != null &&
      allRowKeys.some((k) => selectedRows.has(k)) &&
      !allSelected,
    [selectedRows, allRowKeys, allSelected],
  );

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) {
      return;
    }
    if (allSelected) {
      onSelectionChange(new Set<string>());
    } else {
      onSelectionChange(new Set<string>(allRowKeys));
    }
  }, [allSelected, allRowKeys, onSelectionChange]);

  const handleSelectRow = useCallback(
    (key: string) => {
      if (!onSelectionChange || !selectedRows) {
        return;
      }
      const next = new Set(selectedRows);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      onSelectionChange(next);
    },
    [selectedRows, onSelectionChange],
  );

  // ── Sort handler ────────────────────────────────────────────────────────────

  const handleSort = useCallback(
    (colKey: string) => {
      if (!onSort) {
        return;
      }
      if (sortColumn === colKey) {
        onSort(colKey, sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        onSort(colKey, 'asc');
      }
    },
    [onSort, sortColumn, sortDirection],
  );

  // ── Pagination ──────────────────────────────────────────────────────────────

  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    : 1;

  const paginationStart = pagination
    ? (pagination.page - 1) * pagination.pageSize + 1
    : 1;
  const paginationEnd = pagination
    ? Math.min(pagination.page * pagination.pageSize, pagination.total)
    : data.length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      ref={ref}
      className={[
        'bg-surface rounded-xl ring-1 ring-surface-border/50 overflow-hidden relative',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {/* Loading overlay */}
      {loading && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-surface/60"
          data-testid="datatable-loading"
        >
          <Spinner size="lg" />
        </div>
      )}

      {/* Scrollable table area */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          {/* Header */}
          <thead
            className={[
              'bg-surface-lighter',
              stickyHeader ? 'sticky top-0 z-10' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <tr>
              {selectable && (
                <th className="px-4 py-2.5 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = someSelected;
                      }
                    }}
                    onChange={handleSelectAll}
                    className="rounded"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => {
                const isActive = sortColumn === col.key;
                const headerContent = col.sortable ? (
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-text-muted hover:text-text-secondary transition-colors group"
                  >
                    {col.header}
                    <SortIcon
                      active={isActive}
                      direction={isActive ? sortDirection : undefined}
                    />
                  </button>
                ) : (
                  <span className="font-semibold uppercase tracking-wider text-text-muted">
                    {col.header}
                  </span>
                );

                return (
                  <th
                    key={col.key}
                    className={[
                      'px-4 py-2.5 text-xs whitespace-nowrap',
                      col.align ? alignClasses[col.align] : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={col.width != null ? { width: col.width } : undefined}
                    aria-sort={
                      isActive
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    {headerContent}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {data.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="text-center text-text-tertiary text-sm py-12"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const key = getRowKey(row, rowKey);
                const isSelected = selectedRows?.has(key) ?? false;

                return (
                  <tr
                    key={key}
                    className={[
                      'border-t border-surface-border/50 transition-colors duration-100',
                      striped ? 'even:bg-surface-light' : '',
                      isSelected
                        ? 'bg-primary-subtle ring-1 ring-primary/10'
                        : 'hover:bg-surface-lighter/50',
                      onRowClick ? 'cursor-pointer' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    data-selected={isSelected || undefined}
                  >
                    {selectable && (
                      <td className="px-4 py-3 text-sm">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(key)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded"
                          aria-label={`Select row ${key}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={[
                          'px-4 py-3 text-sm text-text-secondary',
                          col.align ? alignClasses[col.align] : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {col.render
                          ? col.render(row, index)
                          : (String(row[col.key] ?? ''))}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination bar */}
      {pagination && (
        <div
          className="flex items-center justify-between border-t border-surface-border/50 px-4 py-3 text-sm text-text-muted"
          data-testid="datatable-pagination"
        >
          <span>
            {data.length > 0
              ? `Showing ${paginationStart}–${paginationEnd} of ${pagination.total}`
              : `0 results`}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              className="inline-flex items-center justify-center rounded-lg px-2 py-1.5 text-text-muted hover:text-text-secondary hover:bg-surface-lighter disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronIcon direction="left" />
            </button>
            <span className="px-2 tabular-nums text-text-secondary">
              {pagination.page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="inline-flex items-center justify-center rounded-lg px-2 py-1.5 text-text-muted hover:text-text-secondary hover:bg-surface-lighter disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronIcon direction="right" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const DataTable = forwardRef(DataTableInner) as <
  T extends Record<string, unknown>,
>(
  props: DataTableProps<T> & { ref?: React.Ref<HTMLDivElement> },
) => React.ReactElement;
