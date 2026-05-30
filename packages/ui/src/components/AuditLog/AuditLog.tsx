import React, { forwardRef, useState } from 'react';
import { Avatar } from '../Avatar';
import { Spinner } from '../Spinner';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type AuditLogEntry = {
  id: string;
  user: {
    name: string;
    email?: string;
    avatarSrc?: string;
  };
  action: string;
  resource: string;
  resourceId?: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, string>;
  severity?: 'info' | 'warning' | 'danger';
};

export type AuditLogFilter = {
  actions?: string[];
  users?: string[];
  resources?: string[];
  dateRange?: { from?: string; to?: string };
};

export type AuditLogProps = React.HTMLAttributes<HTMLDivElement> & {
  entries: AuditLogEntry[];
  filters?: AuditLogFilter;
  onFilterChange?: (filters: AuditLogFilter) => void;
  showFilters?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  onEntryClick?: (entry: AuditLogEntry) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
};

/* ------------------------------------------------------------------ */
/*  Action badge color mapping                                        */
/* ------------------------------------------------------------------ */

const actionBadgeClasses: Record<string, string> = {
  created: 'bg-success-subtle text-success-text',
  updated: 'bg-info-subtle text-info',
  deleted: 'bg-danger-subtle text-danger-text',
};

const defaultBadgeClass = 'bg-surface-lighter text-text-secondary';

function getActionBadgeClass(action: string): string {
  return actionBadgeClasses[action.toLowerCase()] ?? defaultBadgeClass;
}

/* ------------------------------------------------------------------ */
/*  Severity border mapping                                           */
/* ------------------------------------------------------------------ */

const severityBorderClasses: Record<string, string> = {
  info: 'border-l-2 border-l-info',
  warning: 'border-l-2 border-l-warning',
  danger: 'border-l-2 border-l-danger',
};

/* ------------------------------------------------------------------ */
/*  Internal: Filter bar                                              */
/* ------------------------------------------------------------------ */

type FilterBarProps = {
  filters: AuditLogFilter;
  entries: AuditLogEntry[];
  onFilterChange: (filters: AuditLogFilter) => void;
};

const FilterBar: React.FC<FilterBarProps> = ({ filters, entries, onFilterChange }) => {
  const uniqueActions = [...new Set(entries.map((e) => e.action))];
  const uniqueUsers = [...new Set(entries.map((e) => e.user.name))];
  const uniqueResources = [...new Set(entries.map((e) => e.resource))];

  const hasActiveFilters =
    (filters.actions && filters.actions.length > 0) ||
    (filters.users && filters.users.length > 0) ||
    (filters.resources && filters.resources.length > 0) ||
    filters.dateRange?.from ||
    filters.dateRange?.to;

  const handleClear = () => {
    onFilterChange({});
  };

  return (
    <div
      className="px-4 py-3 border-b border-surface-border bg-surface-lighter flex gap-2 flex-wrap items-center"
      data-testid="audit-log-filter-bar"
    >
      {/* Action filter */}
      <select
        className="bg-surface rounded-lg px-2.5 py-1.5 text-xs ring-1 ring-surface-border/50"
        data-testid="audit-log-filter-action"
        value={filters.actions?.[0] ?? ''}
        onChange={(e) => {
          const value = e.target.value;
          onFilterChange({
            ...filters,
            actions: value ? [value] : undefined,
          });
        }}
      >
        <option value="">All Actions</option>
        {uniqueActions.map((action) => (
          <option key={action} value={action}>
            {action}
          </option>
        ))}
      </select>

      {/* User filter */}
      <select
        className="bg-surface rounded-lg px-2.5 py-1.5 text-xs ring-1 ring-surface-border/50"
        data-testid="audit-log-filter-user"
        value={filters.users?.[0] ?? ''}
        onChange={(e) => {
          const value = e.target.value;
          onFilterChange({
            ...filters,
            users: value ? [value] : undefined,
          });
        }}
      >
        <option value="">All Users</option>
        {uniqueUsers.map((user) => (
          <option key={user} value={user}>
            {user}
          </option>
        ))}
      </select>

      {/* Resource filter */}
      <select
        className="bg-surface rounded-lg px-2.5 py-1.5 text-xs ring-1 ring-surface-border/50"
        data-testid="audit-log-filter-resource"
        value={filters.resources?.[0] ?? ''}
        onChange={(e) => {
          const value = e.target.value;
          onFilterChange({
            ...filters,
            resources: value ? [value] : undefined,
          });
        }}
      >
        <option value="">All Resources</option>
        {uniqueResources.map((resource) => (
          <option key={resource} value={resource}>
            {resource}
          </option>
        ))}
      </select>

      {/* Clear button */}
      {hasActiveFilters && (
        <button
          className="text-xs text-primary hover:text-primary-dark font-medium px-2 py-1.5"
          data-testid="audit-log-filter-clear"
          onClick={handleClear}
          type="button"
        >
          Clear
        </button>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Internal: Entry row                                               */
/* ------------------------------------------------------------------ */

type EntryRowProps = {
  entry: AuditLogEntry;
  onClick?: (entry: AuditLogEntry) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
};

const EntryRow: React.FC<EntryRowProps> = ({ entry, onClick, isExpanded, onToggleExpand }) => {
  const severityClass = entry.severity ? severityBorderClasses[entry.severity] : '';

  const handleClick = () => {
    if (onClick) {
      onClick(entry);
      onToggleExpand();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <>
      <div
        className={[
          'px-4 py-3 border-b border-surface-border/50 hover:bg-surface-lighter/50 transition-colors',
          'flex items-center gap-3',
          severityClass,
          onClick ? 'cursor-pointer' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-testid="audit-log-entry"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {/* Left: Avatar + name */}
        <div className="flex items-center gap-2 shrink-0" data-testid="audit-log-entry-user">
          <Avatar
            src={entry.user.avatarSrc}
            name={entry.user.name}
            size="xs"
          />
          <span className="text-sm font-medium text-text-strong whitespace-nowrap">
            {entry.user.name}
          </span>
        </div>

        {/* Middle: action badge + resource + description */}
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <span
            className={[
              'text-[11px] font-medium rounded-full px-2 py-0.5',
              getActionBadgeClass(entry.action),
            ].join(' ')}
            data-testid="audit-log-action-badge"
          >
            {entry.action}
          </span>
          <span className="text-sm text-text" data-testid="audit-log-resource">
            {entry.resource}
            {entry.resourceId && (
              <span className="text-text-muted ml-1">#{entry.resourceId}</span>
            )}
          </span>
          {entry.description && (
            <span className="text-xs text-text-secondary truncate" data-testid="audit-log-description">
              {entry.description}
            </span>
          )}
        </div>

        {/* Right: timestamp */}
        <span
          className="text-xs text-text-muted whitespace-nowrap"
          data-testid="audit-log-timestamp"
        >
          {entry.timestamp}
        </span>
      </div>

      {/* Expanded metadata row */}
      {isExpanded && entry.metadata && Object.keys(entry.metadata).length > 0 && (
        <div
          className="px-4 py-2 bg-surface-lighter/30 border-b border-surface-border/50"
          data-testid="audit-log-metadata"
        >
          <div className="flex flex-wrap gap-x-4 gap-y-1 pl-8">
            {Object.entries(entry.metadata).map(([key, value]) => (
              <span key={key} className="text-xs text-text-secondary">
                <span className="font-medium text-text-muted">{key}:</span>{' '}
                {value}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Internal: Pagination                                              */
/* ------------------------------------------------------------------ */

type PaginationBarProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

const PaginationBar: React.FC<PaginationBarProps> = ({ page, pageSize, total, onPageChange }) => {
  const totalPages = Math.ceil(total / pageSize);
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <div
      className="px-4 py-3 flex items-center justify-between border-t border-surface-border bg-surface-lighter/50"
      data-testid="audit-log-pagination"
    >
      <span className="text-xs text-text-muted">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          className="text-xs font-medium px-3 py-1.5 rounded-lg ring-1 ring-surface-border/50 bg-surface hover:bg-surface-lighter disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          data-testid="audit-log-pagination-prev"
          disabled={isFirstPage}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          Previous
        </button>
        <button
          className="text-xs font-medium px-3 py-1.5 rounded-lg ring-1 ring-surface-border/50 bg-surface hover:bg-surface-lighter disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          data-testid="audit-log-pagination-next"
          disabled={isLastPage}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  AuditLog                                                          */
/* ------------------------------------------------------------------ */

export const AuditLog = forwardRef<HTMLDivElement, AuditLogProps>(
  function AuditLog(
    {
      entries,
      filters,
      onFilterChange,
      showFilters = true,
      loading = false,
      emptyMessage = 'No audit log entries',
      onEntryClick,
      pagination,
      className,
      ...rest
    },
    ref,
  ) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleToggleExpand = (id: string) => {
      setExpandedId((prev) => (prev === id ? null : id));
    };

    return (
      <div
        ref={ref}
        className={[
          'bg-surface rounded-xl ring-1 ring-surface-border/50 overflow-hidden',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        data-testid="audit-log"
        {...rest}
      >
        {/* Filter bar */}
        {showFilters && onFilterChange && (
          <FilterBar
            filters={filters ?? {}}
            entries={entries}
            onFilterChange={onFilterChange}
          />
        )}

        {/* Loading state */}
        {loading && (
          <div
            className="flex items-center justify-center py-12"
            data-testid="audit-log-loading"
          >
            <Spinner size="lg" />
          </div>
        )}

        {/* Empty state */}
        {!loading && entries.length === 0 && (
          <div
            className="flex items-center justify-center py-12 text-sm text-text-muted"
            data-testid="audit-log-empty"
          >
            {emptyMessage}
          </div>
        )}

        {/* Entry rows */}
        {!loading && entries.length > 0 && (
          <div data-testid="audit-log-entries">
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onClick={onEntryClick}
                isExpanded={expandedId === entry.id}
                onToggleExpand={() => handleToggleExpand(entry.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination && (
          <PaginationBar
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={pagination.onPageChange}
          />
        )}
      </div>
    );
  },
);

AuditLog.displayName = 'AuditLog';
